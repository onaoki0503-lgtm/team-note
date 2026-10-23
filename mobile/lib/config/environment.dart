import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Loads Supabase settings from --dart-define or optional asset `.env.local`.
class Environment {
  static String supabaseUrl = '';
  static String supabaseAnonKey = '';
  static String orgLabel = 'H-Village';
  static bool demoMode = true;

  static const authRedirectUrl = 'teamnote://login-callback';

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty &&
      supabaseAnonKey.isNotEmpty &&
      !supabaseUrl.contains('placeholder');

  static Future<void> load() async {
    const defineUrl = String.fromEnvironment('SUPABASE_URL');
    const defineKey = String.fromEnvironment('SUPABASE_ANON_KEY');
    const defineOrg = String.fromEnvironment('ORG_LABEL', defaultValue: 'H-Village');

    supabaseUrl = defineUrl;
    supabaseAnonKey = defineKey;
    orgLabel = defineOrg.isEmpty ? 'H-Village' : defineOrg;

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
              supabaseAnonKey = v;
            case 'ORG_LABEL':
              if (v.isNotEmpty) orgLabel = v;
          }
        }
      } catch (_) {
        // Asset optional — demo mode without cloud.
      }
    }

    demoMode = !isConfigured;
    if (kDebugMode) {
      debugPrint(
        demoMode
            ? 'Team Note: demo mode (Supabase not configured)'
            : 'Team Note: Supabase → $supabaseUrl',
      );
    }
  }
}
