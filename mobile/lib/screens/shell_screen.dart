import 'package:flutter/material.dart';

import '../widgets/app_header.dart';
import '../widgets/bottom_nav.dart';
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

  @override
  void initState() {
    super.initState();
    _index = widget.initialTab.clamp(0, 3);
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
    final pages = const [
      IdeasScreen(),
      ProjectsScreen(),
      WorkScreen(),
      ArchiveScreen(),
    ];

    return Scaffold(
      body: Column(
        children: [
          const SafeArea(bottom: false, child: AppHeader()),
          Expanded(child: pages[_index]),
        ],
      ),
      bottomNavigationBar: BottomNav(
        index: _index,
        onChanged: (i) => setState(() => _index = i),
      ),
    );
  }
}
