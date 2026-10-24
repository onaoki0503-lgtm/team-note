import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
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
      return p.title.toLowerCase().contains(q) ||
          p.descriptionPreview.toLowerCase().contains(q) ||
          p.ownerName.toLowerCase().contains(q);
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
            const Padding(
              padding: EdgeInsets.only(top: 48),
              child: Center(child: Text('企画なし', style: TextStyle(color: TnTokens.textMuted))),
            )
          else
            ...list.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ProjectCard(
                  project: p,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ProjectDetailScreen(project: p),
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

/// List card with left accent + optional top hero strip — mirrors web ProjectListView.
class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project, required this.onTap});

  final ProjectItem project;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TnTokens.bgSurface,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(width: 5, color: project.accentColor),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: 88,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ColorFiltered(
                              colorFilter: const ColorFilter.matrix(<double>[
                                0.2126, 0.7152, 0.0722, 0, 0,
                                0.2126, 0.7152, 0.0722, 0, 0,
                                0.2126, 0.7152, 0.0722, 0, 0,
                                0, 0, 0, 1, 0,
                              ]),
                              child: Image.asset(
                                project.bannerAsset,
                                fit: BoxFit.cover,
                                alignment: Alignment.center,
                                errorBuilder: (context, error, stackTrace) =>
                                    Container(color: TnTokens.bgTint),
                              ),
                            ),
                            Container(color: Colors.black.withValues(alpha: 0.1)),
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              child: Container(height: 3, color: project.accentColor),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 12, 10, 14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
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
                                  const SizedBox(height: 6),
                                  Text(
                                    project.descriptionPreview,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: TnTokens.textMuted,
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${project.memberCount}人'
                                    '${project.ownerName.isNotEmpty ? '  ·  発起人 ${project.ownerName}' : ''}',
                                    style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.only(top: 4),
                              child: Icon(Icons.chevron_right, color: TnTokens.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ],
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
