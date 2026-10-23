import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/environment.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  bool initialized = false;
  bool busy = false;
  String? error;
  User? user;
  ProfileData profile = ProfileData();
  bool demoSession = false;

  bool get isSignedIn => demoSession || user != null;

  Future<void> initialize() async {
    if (!Environment.isConfigured) {
      demoSession = true;
      profile = ProfileData(
        name: 'デモ利用者',
        role: 'HL',
        building: 'rosemary棟',
        unit: '301-A',
      );
      initialized = true;
      notifyListeners();
      return;
    }

    final client = Supabase.instance.client;
    user = client.auth.currentUser;
    client.auth.onAuthStateChange.listen((data) {
      user = data.session?.user;
      notifyListeners();
    });
    if (user != null) {
      await refreshProfile();
    }
    initialized = true;
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      if (!Environment.isConfigured) {
        demoSession = true;
        return;
      }
      final res = await Supabase.instance.client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      user = res.user;
      await refreshProfile();
    } on AuthException catch (e) {
      error = e.message;
    } catch (e) {
      error = '$e';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signUp(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      if (!Environment.isConfigured) {
        demoSession = true;
        return;
      }
      final res = await Supabase.instance.client.auth.signUp(
        email: email.trim(),
        password: password,
      );
      user = res.user;
    } on AuthException catch (e) {
      error = e.message;
    } catch (e) {
      error = '$e';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    if (Environment.isConfigured) {
      await Supabase.instance.client.auth.signOut();
    }
    user = null;
    demoSession = Environment.demoMode;
    profile = ProfileData();
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    if (!Environment.isConfigured || user == null) return;
    try {
      final row = await Supabase.instance.client.rpc('tn_get_my_profile');
      if (row is Map) {
        final m = Map<String, dynamic>.from(row);
        profile = ProfileData(
          name: '${m['display_name'] ?? m['name'] ?? ''}',
          role: '${m['role'] ?? ''}',
          building: '${m['building'] ?? ''}',
          unit: '${m['unit'] ?? m['room'] ?? ''}',
          bio: '${m['bio'] ?? ''}',
          avatarUrl: m['avatar_url'] as String?,
        );
      }
    } catch (_) {
      // Profile RPC may not exist yet — keep empty editable shell.
    }
    notifyListeners();
  }

  Future<void> saveProfile(ProfileData next) async {
    profile = next;
    notifyListeners();
    if (!Environment.isConfigured || user == null) return;
    try {
      await Supabase.instance.client.rpc('tn_upsert_my_profile', params: {
        'p_name': next.name,
        'p_role': next.role,
        'p_building': next.building,
        'p_unit': next.unit,
        'p_bio': next.bio,
      });
    } catch (_) {
      // Local save still applied for offline / incomplete schema.
    }
  }
}
