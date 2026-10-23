import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';
import '../widgets/tn_card.dart';

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

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
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
            prefixIcon: Icon(Icons.search, size: 20),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          children: [
            for (final f in ['すべて', '参加中', '自分の企画'])
              ChoiceChip(
                label: Text(f),
                selected: data.projectFilter == f,
                onSelected: (_) => data.setProjectFilter(f),
                selectedColor: TnTokens.primary,
                labelStyle: TextStyle(
                  color: data.projectFilter == f ? TnTokens.onPrimary : TnTokens.textMuted,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 40),
            child: Center(
              child: Text('企画なし', style: Theme.of(context).textTheme.bodySmall),
            ),
          )
        else
          ...list.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TnCard(
                onTap: () {},
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.title, style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: TnTokens.bgMain,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(p.status, style: Theme.of(context).textTheme.bodySmall),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            p.summary,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              const Icon(Icons.people_outline, size: 16, color: TnTokens.textMuted),
                              const SizedBox(width: 4),
                              Text('${p.memberCount}人', style: Theme.of(context).textTheme.bodySmall),
                              if (p.ownerName.isNotEmpty) ...[
                                const SizedBox(width: 12),
                                Flexible(
                                  child: Text(
                                    p.ownerName,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: TnTokens.textMuted),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
