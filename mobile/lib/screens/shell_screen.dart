import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/environment.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../services/app_prefs.dart';
import '../theme/tokens.dart';
import '../widgets/home_scene.dart';
import 'archive_screen.dart';
import 'ideas_screen.dart';
import 'profile_screen.dart';
import 'projects_screen.dart';
import 'settings_screen.dart';
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
  @override
  void initState() {
    super.initState();
    _index = widget.initialTab.clamp(0, 3);
    _readMotion();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<AppDataProvider>().refreshAll(
          context.read<AuthProvider>(),
        );
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
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final keyboard = MediaQuery.viewInsetsOf(context).bottom > 0;
    final avatar = auth.profile?.avatarUrl;
    final pages = [
      IdeasScreen(
        motionPaused: _motionPaused,
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
        animate: _index == 0 && !_motionPaused && !keyboard,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
                child: GlassSurface(
                  radius: 25,
                  padding: const EdgeInsets.fromLTRB(12, 9, 8, 9),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 40,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Colors.white, Color(0xB8E5EEF8)],
                          ),
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(color: Colors.white),
                        ),
                        child: const Icon(
                          Icons.lightbulb_outline,
                          size: 24,
                          color: TnTokens.primary,
                        ),
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'チームノート',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              Environment.orgLabel,
                              maxLines: 1,
                              style: const TextStyle(
                                fontSize: 10,
                                color: TnTokens.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        tooltip: '設定',
                        onPressed: () async {
                          await SettingsScreen.showAsSheet(context);
                          await _readMotion();
                        },
                        icon: const Icon(
                          Icons.settings_outlined,
                          size: 20,
                          color: TnTokens.textMuted,
                        ),
                      ),
                      Semantics(
                        button: true,
                        label: 'プロフィール',
                        child: ExcludeSemantics(
                          child: Tooltip(
                            message: 'プロフィール',
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                customBorder: const CircleBorder(),
                                onTap: () => ProfileScreen.showAsSheet(context),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: TnTokens.bgTint,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2,
                                    ),
                                  ),
                                  child: ClipOval(
                                    child: avatar != null && avatar.isNotEmpty
                                        ? Image.network(
                                            avatar,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) =>
                                                const Icon(
                                                  Icons.person_outline,
                                                  color: TnTokens.primary,
                                                ),
                                          )
                                        : Center(
                                            child: Text(
                                              auth.profile?.name.isNotEmpty ==
                                                      true
                                                  ? auth
                                                        .profile!
                                                        .name
                                                        .characters
                                                        .first
                                                  : '?',
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                                color: TnTokens.primary,
                                              ),
                                            ),
                                          ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
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
