import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../services/teamnote_api.dart';

enum AuthGate { loading, login, join, ready, error }

class AuthProvider extends ChangeNotifier {
  AuthProvider({TeamNoteApi? api}) : _api = api ?? TeamNoteApi();

  final TeamNoteApi _api;
  AuthGate gate = AuthGate.loading;
  bool busy = false;
  String? error;
  User? user;
  MemberProfile? profile;
  bool demoSession = false;

  bool get isSignedIn => demoSession || user != null;
  bool get isMember => profile != null;

  Future<void> initialize() async {
    gate = AuthGate.loading;
    notifyListeners();

    // Real app only — never auto-enter as a fake "demo" user.
    if (!Environment.isConfigured) {
      demoSession = false;
      gate = AuthGate.error;
      error =
          '接続設定がありません。SUPABASE_URL / SUPABASE_ANON_KEY を入れてビルドし直してください。';
      notifyListeners();
      return;
    }

    final client = Supabase.instance.client;
    user = client.auth.currentUser;
    client.auth.onAuthStateChange.listen((data) async {
      user = data.session?.user;
      if (user == null) {
        profile = null;
        gate = AuthGate.login;
        notifyListeners();
        return;
      }
      await _loadMembership();
    });

    if (user == null) {
      gate = AuthGate.login;
    } else {
      await _loadMembership();
    }
    notifyListeners();
  }

  Future<void> _loadMembership() async {
    error = null;
    try {
      final board = await _api.getBoard();
      if (board == null) {
        gate = AuthGate.error;
        error = 'ボードを取得できません';
        return;
      }
      final uid = '${board['userId'] ?? user?.id}';
      final members = board['members'];
      MemberProfile? me;
      if (members is List) {
        for (final m in members) {
          if (m is Map && '${m['id']}' == uid) {
            me = MemberProfile.fromJson(Map<String, dynamic>.from(m));
            break;
          }
        }
      }
      profile = me;
      gate = me == null ? AuthGate.join : AuthGate.ready;
    } catch (e) {
      final msg = '$e';
      if (msg.contains('teamnote_access_denied') || msg.contains('42501')) {
        gate = AuthGate.join;
        profile = null;
      } else {
        gate = AuthGate.error;
        error = msg;
      }
    }
    notifyListeners();
  }

  Future<void> signInEmail(String email, String password) async {
    await _run(() async {
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      user = res.user;
      await _loadMembership();
    });
  }

  Future<void> signUpEmail(String email, String password) async {
    await _run(() async {
      final res = await Supabase.instance.client.auth.signUp(
        email: email.trim(),
        password: password,
      );
      // Masked user (no identities) means this email is already registered.
      if (res.user != null && res.user!.identities != null && res.user!.identities!.isEmpty) {
        error = 'このメールアドレスは既に登録されています。ログインするか、Googleで続けてください。';
        gate = AuthGate.login;
        return;
      }
      user = res.user;
      if (res.session == null) {
        error = '確認メールを開いた後、ログインしてください。同じメールならGoogleでも入れます。';
        gate = AuthGate.login;
      } else {
        await _loadMembership();
      }
    });
  }

  Future<void> signInWithGoogle() async {
    await _run(() async {
      if (!Environment.googleConfigured) {
        throw StateError(
          'Googleログインの設定がありません。GOOGLE_WEB_CLIENT_ID を入れてビルドし直してください。',
        );
      }
      final google = GoogleSignIn(
        clientId: Environment.googleIosClientId.isEmpty ? null : Environment.googleIosClientId,
        serverClientId: Environment.googleWebClientId,
      );
      final account = await google.signIn();
      if (account == null) return;
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) throw StateError('Google IDトークンなし');
      final res = await Supabase.instance.client.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: auth.accessToken,
      );
      user = res.user;
      await _loadMembership();
    });
  }

  Future<void> signInWithApple() async {
    await _run(() async {
      final rawNonce = _randomNonce();
      final hashed = sha256.convert(utf8.encode(rawNonce)).toString();
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashed,
      );
      final idToken = credential.identityToken;
      if (idToken == null) throw StateError('Apple IDトークンなし');
      final res = await Supabase.instance.client.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      user = res.user;
      await _loadMembership();
    });
  }

  Future<void> joinCommunity(String invite, MemberProfile draft) async {
    await _run(() async {
      if (invite.trim().isEmpty) {
        throw StateError('参加コードを入力してください。');
      }
      final emailHint = user?.email?.split('@').first;
      final normalized = draft.normalizedCopy(fallbackName: emailHint);
      final board = await _api.join(invite.trim(), normalized);
      await _applyBoard(board);
    });
  }

  Future<void> saveProfile(MemberProfile next, {String? localAvatarPath}) async {
    await _run(() async {
      final emailHint = user?.email?.split('@').first;
      var normalized = next.normalizedCopy(fallbackName: emailHint);
      if (localAvatarPath != null && user != null) {
        final url = await _api.uploadAvatar(localAvatarPath, user!.id);
        if (url != null) {
          normalized = MemberProfile(
            id: normalized.id,
            name: normalized.name,
            role: normalized.role,
            building: normalized.building,
            floor: normalized.floor,
            unit: normalized.unit,
            bio: normalized.bio,
            avatarUrl: url,
          );
        }
      }
      final board = await _api.updateProfile(normalized);
      await _applyBoard(board);
    });
  }

  Future<void> signOut() async {
    if (Environment.isConfigured) {
      await Supabase.instance.client.auth.signOut();
      try {
        await GoogleSignIn().signOut();
      } catch (_) {}
    }
    user = null;
    profile = null;
    demoSession = false;
    gate = AuthGate.login;
    notifyListeners();
  }

  Future<void> retry() => _loadMembership();

  Future<void> _applyBoard(Map<String, dynamic>? board) async {
    if (board == null) {
      await _loadMembership();
      return;
    }
    final uid = '${board['userId'] ?? user?.id}';
    final members = board['members'];
    if (members is List) {
      for (final m in members) {
        if (m is Map && '${m['id']}' == uid) {
          profile = MemberProfile.fromJson(Map<String, dynamic>.from(m));
          gate = AuthGate.ready;
          return;
        }
      }
    }
    gate = AuthGate.join;
  }

  Future<void> _run(Future<void> Function() body) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await body();
    } on AuthException catch (e) {
      error = _friendlyError(e.message);
    } catch (e) {
      error = _friendlyError('$e');
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  String _friendlyError(String raw) {
    final m = raw.toLowerCase();
    if (m.contains('invalid_profile') || m.contains('22023')) {
      return '名前・役職・棟・階・部屋番号を確認してください。';
    }
    if (m.contains('invalid_invite')) {
      return '参加コードを確認してください。';
    }
    if (m.contains('access_denied') || m.contains('42501')) {
      return 'この操作の権限がありません。';
    }
    // Multi-provider: same email already has another identity, or linking blocked.
    if (m.contains('identity is already linked') ||
        m.contains('already been registered') ||
        m.contains('user already registered') ||
        m.contains('email address is already')) {
      return 'このメールは既に登録されています。メールかGoogleのどちらかでログインしてください。';
    }
    if (m.contains('email not confirmed')) {
      return '確認メールを開いてから、同じメールでGoogleログインできます。';
    }
    if (raw.startsWith('Bad state: ')) return raw.substring(11);
    if (raw.startsWith('StateError: ')) return raw.substring(12);
    return raw;
  }

  String _randomNonce([int length = 32]) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
  }
}
