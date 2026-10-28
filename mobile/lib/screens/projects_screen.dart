import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
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
    final auth = context.watch<AuthProvider>();
    final q = _search.text.trim().toLowerCase();
    final list = data.filteredProjectsFor(auth.user?.id).where((p) {
      if (q.isEmpty) return true;
      return p.title.toLowerCase().contains(q) ||
          p.descriptionPreview.toLowerCase().contains(q) ||
          p.ownerName.toLowerCase().contains(q) ||
          p.members.any((m) => m.name.toLowerCase().contains(q));
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
              hintText: '企画を検索',
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
            Padding(
              padding: const EdgeInsets.only(top: 48),
              child: Column(
                children: [
                  const Text(
                    '一致する企画が見つかりませんでした。',
                    style: TextStyle(color: TnTokens.textMuted),
                    textAlign: TextAlign.center,
                  ),
                  if (q.isNotEmpty || data.projectFilter != 'すべて') ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () {
                        _search.clear();
                        data.setProjectFilter('すべて');
                        setState(() {});
                      },
                      child: const Text('条件をクリア'),
                    ),
                  ],
                ],
              ),
            )
          else
            ...list.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ProjectCard(
                  project: p,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ProjectDetailScreen(projectId: p.id),
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

/// Text-only list card with left accent — mirrors web ProjectListView (no banner image).
class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.onTap});

  final ProjectItem project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final description = project.descriptionPreview.trim();
    return Material(
      color: TnTokens.bgSurface,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      shadowColor: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
            boxShadow: const [
              BoxShadow(color: Color(0x08171A21), blurRadius: 6, offset: Offset(0, 2)),
            ],
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 5, color: project.accentColor),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(14, 16, 12, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 8,
                                runSpacing: 4,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text(
                                    project.title,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: TnTokens.textMain,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: TnTokens.bgTint,
                                      borderRadius: BorderRadius.circular(7),
                                      border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
                                    ),
                                    child: Text(
                                      project.statusLabel,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: TnTokens.textMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (description.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  description,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: TnTokens.textMuted,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.people_outline, size: 13, color: TnTokens.textMuted),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      '${project.memberCount} 人'
                                      '${project.ownerName.isNotEmpty ? '    発起人 ${project.ownerName}' : ''}',
                                      style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: TnTokens.textMuted, size: 18),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
