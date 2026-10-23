import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/environment.dart';
import 'providers/app_data_provider.dart';
import 'providers/auth_provider.dart';
import 'routing/app_router.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Environment.load();

  if (Environment.isConfigured) {
    await Supabase.initialize(
      url: Environment.supabaseUrl,
      publishableKey: Environment.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  runApp(const TeamNoteApp());
}

class TeamNoteApp extends StatefulWidget {
  const TeamNoteApp({super.key});

  @override
  State<TeamNoteApp> createState() => _TeamNoteAppState();
}

class _TeamNoteAppState extends State<TeamNoteApp> {
  late final AuthProvider _auth = AuthProvider();
  late final AppDataProvider _data = AppDataProvider();
  late final _router = createRouter(_auth);

  @override
  void initState() {
    super.initState();
    _auth.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _data),
      ],
      child: ListenableBuilder(
        listenable: _auth,
        builder: (context, _) {
          return MaterialApp.router(
            title: 'チームノート',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            locale: const Locale('ja'),
            supportedLocales: const [Locale('ja'), Locale('en')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            routerConfig: _router,
            builder: (context, child) {
              if (_auth.gate == AuthGate.loading) {
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              }
              return child ?? const SizedBox.shrink();
            },
          );
        },
      ),
    );
  }
}
