import 'package:flutter/material.dart';

import '../forms/proposal_form.dart';
import '../models/models.dart';
import '../theme/tokens.dart';

/// Project detail — mirrors web `ProjectDetailView` hero + title card + 企画書 body.
class ProjectDetailScreen extends StatelessWidget {
  const ProjectDetailScreen({super.key, required this.project});

  final ProjectItem project;

  Map<String, dynamic>? get _proposal => project.proposalDoc;

  @override
  Widget build(BuildContext context) {
    final doc = _proposal;
    final accent = project.accentColor;

    return Scaffold(
      appBar: AppBar(title: Text(project.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 28),
        children: [
          _HeroBanner(
            asset: project.bannerAsset,
            accent: accent,
            statusLabel: project.statusLabel,
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: TnTokens.textMain,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    project.descriptionPreview,
                    style: const TextStyle(
                      fontSize: 13,
                      color: TnTokens.textMuted,
                      height: 1.55,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _MetaChip(
                        icon: Icons.people_outline,
                        label: '${project.memberCount}人',
                      ),
                      if (project.ownerName.isNotEmpty)
                        _MetaChip(
                          icon: Icons.person_outline,
                          label: '発起人 ${project.ownerName}',
                        ),
                      _MetaChip(
                        icon: Icons.category_outlined,
                        label: project.isEvent ? 'イベント' : '日常運営・改善',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          if (doc == null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('概要', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(
                      project.summary.isEmpty ? '—' : project.summary,
                      style: const TextStyle(height: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('企画提案書', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 4),
                    Text(
                      project.isEvent ? 'イベント' : '日常運営・改善',
                      style: const TextStyle(color: TnTokens.textMuted, fontSize: 13),
                    ),
                    const Divider(height: 24),
                    for (final field in proposalFields)
                      if (field.key != 'title') ...[
                        Text(
                          field.label,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${doc[field.key] ?? ''}'.trim().isEmpty
                              ? '未記入'
                              : '${doc[field.key]}',
                          style: const TextStyle(height: 1.45),
                        ),
                        const SizedBox(height: 14),
                      ],
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.asset,
    required this.accent,
    required this.statusLabel,
  });

  final String asset;
  final Color accent;
  final String statusLabel;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 140,
        width: double.infinity,
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
                asset,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: TnTokens.bgTint),
              ),
            ),
            // Slight darken like web brightness(85%)
            Container(color: Colors.black.withValues(alpha: 0.12)),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: Container(height: 4, color: accent),
            ),
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  statusLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: TnTokens.textMain,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: TnTokens.textMuted),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: TnTokens.textMuted)),
      ],
    );
  }
}
