import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/archives_list_screen.dart';
import '../screens/inventory_screen.dart';
import '../screens/join_screen.dart';
import '../screens/login_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/proposal_screen.dart';
import '../screens/shell_screen.dart';

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      switch (auth.gate) {
        case AuthGate.loading:
          return null;
        case AuthGate.login:
          return loc == '/login' ? null : '/login';
        case AuthGate.join:
          return loc == '/join' ? null : '/join';
        case AuthGate.error:
          return loc == '/login' ? null : '/login';
        case AuthGate.ready:
          if (loc == '/login' || loc == '/join') return '/';
          return null;
      }
    },
    routes: [
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/join', builder: (_, _) => const JoinScreen()),
      GoRoute(
        path: '/',
        builder: (context, state) {
          final tab = int.tryParse(state.uri.queryParameters['tab'] ?? '') ?? 0;
          return ShellScreen(initialTab: tab);
        },
      ),
      GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(path: '/proposal', builder: (_, _) => const ProposalScreen()),
      GoRoute(path: '/inventory', builder: (_, _) => const InventoryScreen()),
      GoRoute(path: '/archives', builder: (_, _) => const ArchivesListScreen()),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('ページなし: ${state.error}')),
    ),
  );
}
