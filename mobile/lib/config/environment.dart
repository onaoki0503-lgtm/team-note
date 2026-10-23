import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class Environment {
  static String supabaseUrl = '';
  static String supabaseAnonKey = '';
  static String orgLabel = 'H-Village';
  static const communityId = 'h-village';
  static const authRedirectUrl = 'teamnote://login-callback';

  /// Optional Google iOS client id (reversed) for google_sign_in.
  static String googleIosClientId = '';
  static String googleWebClientId = '';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty &&
      supabaseAnonKey.isNotEmpty &&
      !supabaseUrl.contains('placeholder');

  static bool get demoMode => !isConfigured;

  static Future<void> load() async {
    const defineUrl = String.fromEnvironment('SUPABASE_URL');
    const defineKey = String.fromEnvironment('SUPABASE_ANON_KEY');
    const defineOrg = String.fromEnvironment('ORG_LABEL', defaultValue: 'H-Village');
    const defineGoogleIos = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');
    const defineGoogleWeb = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');

    supabaseUrl = defineUrl;
    supabaseAnonKey = defineKey;
    orgLabel = defineOrg.isEmpty ? 'H-Village' : defineOrg;
    googleIosClientId = defineGoogleIos;
    googleWebClientId = defineGoogleWeb;

    if (!isConfigured) {
      try {
        final raw = await rootBundle.loadString('assets/config/.env.local');
        for (final line in raw.split('\n')) {
          final t = line.trim();
          if (t.isEmpty || t.startsWith('#')) continue;
          final i = t.indexOf('=');
          if (i <= 0) continue;
          final k = t.substring(0, i).trim();
          final v = t.substring(i + 1).trim();
          switch (k) {
            case 'SUPABASE_URL':
              supabaseUrl = v;
            case 'SUPABASE_ANON_KEY':
            case 'SUPABASE_PUBLISHABLE_KEY':
              supabaseAnonKey = v;
            case 'ORG_LABEL':
              if (v.isNotEmpty) orgLabel = v;
            case 'GOOGLE_IOS_CLIENT_ID':
              googleIosClientId = v;
            case 'GOOGLE_WEB_CLIENT_ID':
              googleWebClientId = v;
          }
        }
      } catch (_) {}
    }

    if (kDebugMode) {
      debugPrint(
        demoMode
            ? 'Team Note: demo (set SUPABASE_URL / ANON_KEY)'
            : 'Team Note: $supabaseUrl / ${Environment.communityId}',
      );
    }
  }
}
