import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import 'archive_screen.dart';
import 'ideas_screen.dart';
import 'projects_screen.dart';
import 'work_screen.dart';

class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  late int _index;

  static const _destinations = [
    NavigationDestination(
      icon: Icon(Icons.lightbulb_outline),
      selectedIcon: Icon(Icons.lightbulb),
      label: 'アイデア',
    ),
    NavigationDestination(
      icon: Icon(Icons.play_circle_outline),
      selectedIcon: Icon(Icons.play_circle),
      label: '進行中',
    ),
    NavigationDestination(
      icon: Icon(Icons.work_outline),
      selectedIcon: Icon(Icons.work),
      label: 'はたらく',
    ),
    NavigationDestination(
      icon: Icon(Icons.inventory_2_outlined),
      selectedIcon: Icon(Icons.inventory_2),
      label: '保管する',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _index = widget.initialTab.clamp(0, 3);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      context.read<AppDataProvider>().refreshAll(auth);
    });
  }

  @override
  void didUpdateWidget(covariant ShellScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _index = widget.initialTab.clamp(0, 3);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pages = const [
      IdeasScreen(),
      ProjectsScreen(),
      WorkScreen(),
      ArchiveScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('チームノート'),
            Text(
              auth.profile?.locationLine ?? 'H-Village',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: TnTokens.textMuted,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'プロフィール',
            onPressed: () => context.push('/profile'),
            icon: CircleAvatar(
              radius: 16,
              backgroundColor: TnTokens.bgTint,
              foregroundColor: TnTokens.primary,
              backgroundImage: auth.profile?.avatarUrl != null
                  ? NetworkImage(auth.profile!.avatarUrl!)
                  : null,
              child: auth.profile?.avatarUrl == null
                  ? Text(
                      (auth.profile?.name.isNotEmpty == true)
                          ? auth.profile!.name.characters.first
                          : '?',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    )
                  : null,
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations,
      ),
    );
  }
}
