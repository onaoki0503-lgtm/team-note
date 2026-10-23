import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/proposal_screen.dart';
import '../screens/shell_screen.dart';

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      if (!auth.initialized) return null;
      final loggingIn = state.matchedLocation == '/login';
      if (!auth.isSignedIn && !loggingIn) return '/login';
      if (auth.isSignedIn && loggingIn) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, _) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) {
          final tab = int.tryParse(state.uri.queryParameters['tab'] ?? '') ?? 0;
          return ShellScreen(initialTab: tab);
        },
      ),
      GoRoute(
        path: '/profile',
        builder: (_, _) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/proposal',
        builder: (_, _) => const ProposalScreen(),
      ),
    ],
  );
}
