import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../services/app_prefs.dart';
import '../widgets/home_scene.dart';
import 'archive_screen.dart';
import 'ideas_screen.dart';
import 'profile_screen.dart';
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
  bool _motionPaused = false;
  bool _profileOpen = false;
  AppDataProvider? _data;
  @override
  void initState() {
    super.initState();
    _index = widget.initialTab.clamp(0, 3);
    _readMotion();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _data = context.read<AppDataProvider>();
        _data!.refreshAll(context.read<AuthProvider>());
      }
    });
  }

  Future<void> _readMotion() async {
    final paused = await AppPrefs.readMotionPaused();
    if (mounted) setState(() => _motionPaused = paused);
  }

  @override
  void didUpdateWidget(covariant ShellScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _index = widget.initialTab.clamp(0, 3);
    }
  }

  @override
  @override
  void dispose() {
    // Soft-lock / logout leaves this route; drop the board channel with it.
    _data?.stopBoardRealtime();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final keyboard = MediaQuery.viewInsetsOf(context).bottom > 0;
    final avatar = auth.profile?.avatarUrl;
    final pages = [
      IdeasScreen(
        motionPaused: _motionPaused || _profileOpen,
        active: _index == 0,
        keyboardVisible: keyboard,
      ),
      const ProjectsScreen(),
      WorkScreen(active: _index == 2),
      const ArchiveScreen(),
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFFBFDFF),
      body: GlassBackdrop(
        animate: _index == 0 && !_motionPaused && !_profileOpen && !keyboard,
        child: SafeArea(
          bottom: false,
          // Keep chrome clear of the Dynamic Island / notch; atmosphere
          // already paints edge-to-edge behind this inset.
          minimum: const EdgeInsets.only(top: 6),
          child: Column(
            children: [
              TeamNoteHeader(
                name: auth.profile?.name ?? '',
                avatar: avatar,
                onProfile: () async {
                  setState(() => _profileOpen = true);
                  try {
                    await ProfileScreen.showAsSheet(context);
                  } finally {
                    if (mounted) setState(() => _profileOpen = false);
                  }
                  await _readMotion();
                },
              ),
              Expanded(
                child: IndexedStack(
                  index: _index,
                  children: [
                    for (var i = 0; i < pages.length; i++)
                      TickerMode(enabled: _index == i, child: pages[i]),
                  ],
                ),
              ),
              if (!(_index == 0 && keyboard))
                GlassBottomNav(
                  index: _index,
                  onSelected: (i) {
                    FocusManager.instance.primaryFocus?.unfocus();
                    setState(() => _index = i);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
