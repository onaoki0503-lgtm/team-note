import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../services/app_prefs.dart';
import '../services/secure_credentials_service.dart';
import '../services/teamnote_api.dart';

enum AuthGate { loading, login, locked, join, ready, error }

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    TeamNoteApi? api,
    SecureCredentialsService? credentials,
  })  : _api = api ?? TeamNoteApi(),
        _credentials = credentials ?? SecureCredentialsService();

  final TeamNoteApi _api;
  final SecureCredentialsService _credentials;
  StreamSubscription<AuthState>? _authSub;

  AuthGate gate = AuthGate.loading;
  bool busy = false;
  String? error;
  User? user;
  MemberProfile? profile;
  bool demoSession = false;

  /// When true, a valid Supabase session exists but Face ID must unlock the app.
  bool biometricLocked = false;

  SecureCredentialsService get credentials => _credentials;

  bool get isSignedIn => demoSession || user != null;
  bool get isMember => profile != null;

  bool get hasEmailPasswordIdentity {
    final identities = user?.identities;
    if (identities == null) return false;
    return identities.any((i) => i.provider == 'email');
  }

  Future<void> initialize() async {
    gate = AuthGate.loading;
    notifyListeners();

    if (!Environment.isConfigured) {
      demoSession = false;
      gate = AuthGate.error;
      error =
          '接続設定がありません。SUPABASE_URL / SUPABASE_ANON_KEY を入れてビルドし直してください。';
      notifyListeners();
      return;
    }

    await AppPrefs.clearLegacyFaceEnrollment();

    final client = Supabase.instance.client;
    user = client.auth.currentUser;
    await _authSub?.cancel();
    _authSub = client.auth.onAuthStateChange.listen((data) async {
      user = data.session?.user;
      if (user == null) {
        profile = null;
        biometricLocked = false;
        if (gate != AuthGate.loading) {
          gate = AuthGate.login;
          notifyListeners();
        }
        return;
      }
      // Soft-lock: session is alive but UI must wait for Face ID.
      if (biometricLocked || gate == AuthGate.locked) {
        notifyListeners();
        return;
      }
      await _loadMembership();
    });

    if (user == null) {
      gate = AuthGate.login;
    } else if (await _credentials.isEnabled()) {
      biometricLocked = true;
      gate = AuthGate.locked;
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
      biometricLocked = false;
      gate = me == null ? AuthGate.join : AuthGate.ready;
    } catch (e) {
      final msg = '$e';
      if (msg.contains('teamnote_access_denied') || msg.contains('42501')) {
        gate = AuthGate.join;
        profile = null;
        biometricLocked = false;
      } else {
        gate = AuthGate.error;
        error = msg;
      }
    }
    notifyListeners();
  }

  /// Face ID succeeded while a Supabase session is still on the device.
  Future<void> unlockWithBiometric() async {
    await _run(() async {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        throw StateError('セッションがありません。メールとパスワードでログインしてください。');
      }
      user = session.user;
      biometricLocked = false;
      final email = user?.email;
      if (email != null && email.isNotEmpty) {
        await _credentials.enable(email: email);
      }
      await _loadMembership();
    });
  }

  /// Face ID succeeded and we must recreate the session with a stored password.
  Future<void> signInWithStoredPassword() async {
    await _run(() async {
      final creds = await _credentials.getPasswordCredentials();
      if (creds == null) {
        throw StateError('保存されたパスワードがありません。手動でログインしてください。');
      }
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: creds['email']!,
        password: creds['password']!,
      );
      user = res.user;
      biometricLocked = false;
      await _credentials.enable(email: creds['email']!);
      await _loadMembership();
    });
  }

  Future<void> signInEmail(
    String email,
    String password, {
    bool enableBiometricAfter = false,
  }) async {
    await _run(() async {
      final trimmed = email.trim();
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: trimmed,
        password: password,
      );
      user = res.user;
      biometricLocked = false;
      if (enableBiometricAfter || await _credentials.isEnabled()) {
        await _credentials.savePasswordCredentials(trimmed, password);
      }
      await _loadMembership();
    });
  }

  Future<void> signUpEmail(String email, String password) async {
    await _run(() async {
      final res = await Supabase.instance.client.auth.signUp(
        email: email.trim(),
        password: password,
      );
      if (res.user != null && res.user!.identities != null && res.user!.identities!.isEmpty) {
        error = 'このメールアドレスは既に登録されています。ログインするか、Google・Appleで続けてください。';
        gate = AuthGate.login;
        return;
      }
      user = res.user;
      if (res.session == null) {
        error = '確認メールを開いた後、ログインしてください。同じメールならGoogleやAppleでも入れます。';
        gate = AuthGate.login;
      } else {
        biometricLocked = false;
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
      biometricLocked = false;
      final email = user?.email;
      if (email != null && email.isNotEmpty && await _credentials.isEnabled()) {
        await _credentials.enable(email: email);
      }
      await _loadMembership();
    });
  }

  /// Native Sign in with Apple → Supabase `signInWithIdToken`.
  ///
  /// Same nonce split as the working APS / TeamKaikei apps: Apple receives the
  /// SHA-256 hash; Supabase receives the raw nonce and re-hashes to compare.
  /// Do **not** pass Apple's authorization code as `accessToken` — it is not an
  /// OAuth access token and breaks verification. iOS token audience is the
  /// bundle ID `com.teamnote.teamNoteMobile` (must be listed in Supabase Apple
  /// Client IDs). Name is only returned on the first authorization.
  Future<void> signInWithApple() async {
    await _run(() async {
      if (defaultTargetPlatform != TargetPlatform.iOS) {
        throw StateError('Appleで続けるはiPhoneでのみ使えます。');
      }
      if (!await SignInWithApple.isAvailable()) {
        throw StateError('この端末ではAppleで続けるを使えません。');
      }

      final rawNonce = _randomNonce();
      final hashedNonce = sha256.convert(utf8.encode(rawNonce)).toString();

      final AuthorizationCredentialAppleID credential;
      try {
        credential = await SignInWithApple.getAppleIDCredential(
          scopes: [
            AppleIDAuthorizationScopes.email,
            AppleIDAuthorizationScopes.fullName,
          ],
          nonce: hashedNonce,
        );
      } on SignInWithAppleAuthorizationException catch (e) {
        if (e.code == AuthorizationErrorCode.canceled) {
          // User dismissed the sheet — not an error.
          return;
        }
        throw StateError('Appleログインに失敗しました（${e.code}）。');
      }

      final idToken = credential.identityToken;
      if (idToken == null || idToken.isEmpty) {
        throw StateError('Apple IDトークンなし。Apple Developerで Sign in with Apple を確認してください。');
      }

      final res = await Supabase.instance.client.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      if (res.user == null) {
        throw StateError('Appleログインに失敗しました。');
      }
      user = res.user;
      biometricLocked = false;

      // Apple only sends the name on the very first authorization.
      final givenName = credential.givenName;
      final familyName = credential.familyName;
      if (givenName != null || familyName != null) {
        final displayName = [givenName, familyName]
            .where((part) => part != null && part.isNotEmpty)
            .join(' ')
            .trim();
        if (displayName.isNotEmpty) {
          try {
            final updated = await Supabase.instance.client.auth.updateUser(
              UserAttributes(
                data: {
                  'full_name': displayName,
                  if (givenName != null && givenName.isNotEmpty) 'given_name': givenName,
                  if (familyName != null && familyName.isNotEmpty) 'family_name': familyName,
                },
              ),
            );
            if (updated.user != null) user = updated.user;
          } catch (_) {
            // Successful sign-in must not fail if metadata write fails.
          }
        }
      }

      final email = user?.email;
      if (email != null && email.isNotEmpty && await _credentials.isEnabled()) {
        await _credentials.enable(email: email);
      }
      await _loadMembership();
    });
  }

  Future<void> joinCommunity(String invite, MemberProfile draft) async {
    await _run(() async {
      if (invite.trim().isEmpty) {
        throw StateError('参加コードを入力してください。');
      }
      final emailHint = user?.email?.split('@').first;
      final metaName = '${user?.userMetadata?['full_name'] ?? ''}'.trim();
      final normalized = draft.normalizedCopy(
        fallbackName: metaName.isNotEmpty ? metaName : emailHint,
      );
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

  /// [fullSignOut] false + biometric enabled → soft lock (session stays).
  /// true → leave Supabase session; Face ID preference is always kept
  /// (only Settings can turn 顔認証 off).
  Future<void> signOut({bool fullSignOut = false, bool clearSavedCredentials = false}) async {
    final hardLogout = fullSignOut || clearSavedCredentials;

    if (!hardLogout && Environment.isConfigured && await _credentials.isEnabled()) {
      final email = user?.email ?? await _credentials.peekEmail();
      if (email != null && email.isNotEmpty) {
        await _credentials.enable(email: email);
      }
      // Keep Supabase session — only lock the UI behind Face ID.
      profile = null;
      biometricLocked = true;
      gate = AuthGate.locked;
      notifyListeners();
      return;
    }

    if (Environment.isConfigured) {
      await Supabase.instance.client.auth.signOut();
      try {
        await GoogleSignIn().signOut();
      } catch (_) {}
    }
    // Never clear tn_biometric_login_enabled here — Settings owns that toggle.
    await _credentials.clearSecretsKeepPreference();
    final email = user?.email ?? await _credentials.peekEmail();
    if (email != null && email.isNotEmpty && await _credentials.isEnabled()) {
      await _credentials.enable(email: email);
    }
    user = null;
    profile = null;
    demoSession = false;
    biometricLocked = false;
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
          biometricLocked = false;
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
      if (e.message.toLowerCase().contains('invalid login')) {
        await _credentials.clearPasswordOnly();
      }
    } catch (e) {
      error = _friendlyError('$e');
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  String _friendlyError(String raw) {
    final m = raw.toLowerCase();
    if (m.contains('invalid login') || m.contains('invalid_credentials')) {
      return 'ログイン情報が正しくありません。パスワードを入力するか、生体認証を設定し直してください。';
    }
    if (m.contains('invalid_profile') || m.contains('22023')) {
      return '名前・役職・棟・階・部屋番号を確認してください。';
    }
    if (m.contains('invalid_invite')) {
      return '参加コードを確認してください。';
    }
    if (m.contains('access_denied') || m.contains('42501')) {
      return 'この操作の権限がありません。';
    }
    if (m.contains('identity is already linked') ||
        m.contains('already been registered') ||
        m.contains('user already registered') ||
        m.contains('email address is already')) {
      return 'このメールは既に登録されています。メール・Google・Appleのいずれかでログインしてください。';
    }
    if (m.contains('email not confirmed')) {
      return '確認メールを開いてから、同じメールでGoogleやAppleでも入れます。';
    }
    if (m.contains('provider is not enabled') ||
        m.contains('unsupported provider') ||
        m.contains('apple') && m.contains('not enabled')) {
      return 'Appleログインはまだ有効になっていません。管理者に連絡してください。';
    }
    if (m.contains('unacceptable audience') || m.contains('audience')) {
      return 'Appleの設定（Client IDsに bundle ID）を確認してください。';
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
