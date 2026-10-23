import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';
import 'project_detail_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final q = _search.text.trim().toLowerCase();
    final list = data.filteredProjects.where((p) {
      if (q.isEmpty) return true;
      return p.title.toLowerCase().contains(q) || p.summary.toLowerCase().contains(q);
    }).toList();

    return RefreshIndicator(
      onRefresh: data.refreshProjects,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          FilledButton.icon(
            onPressed: () => context.push('/proposal'),
            icon: const Icon(Icons.add),
            label: const Text('新しい企画をつくる'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _search,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: '検索',
              prefixIcon: Icon(Icons.search),
              isDense: true,
            ),
          ),
          const SizedBox(height: 10),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'すべて', label: Text('すべて')),
              ButtonSegment(value: '参加中', label: Text('参加中')),
              ButtonSegment(value: '自分の企画', label: Text('自分')),
            ],
            selected: {data.projectFilter},
            onSelectionChanged: (s) => data.setProjectFilter(s.first),
          ),
          const SizedBox(height: 14),
          if (list.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(child: Text('企画なし', style: TextStyle(color: TnTokens.textMuted))),
            )
          else
            ...list.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  child: ListTile(
                    title: Text(p.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Text(
                      '${p.status} · ${p.memberCount}人'
                      '${p.ownerName.isNotEmpty ? ' · ${p.ownerName}' : ''}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ProjectDetailScreen(project: p),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
