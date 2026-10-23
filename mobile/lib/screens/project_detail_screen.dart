import 'dart:convert';

import 'package:flutter/material.dart';

import '../forms/proposal_form.dart';
import '../models/models.dart';
import '../theme/tokens.dart';

/// Shows full 企画書 content when stored as PROPOSAL_JSON in summary.
class ProjectDetailScreen extends StatelessWidget {
  const ProjectDetailScreen({super.key, required this.project});

  final ProjectItem project;

  Map<String, dynamic>? get _proposal {
    final s = project.summary;
    if (!s.startsWith('PROPOSAL_JSON:')) return null;
    try {
      return jsonDecode(s.substring('PROPOSAL_JSON:'.length)) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final doc = _proposal;
    return Scaffold(
      appBar: AppBar(title: Text(project.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              title: Text(project.title),
              subtitle: Text('${project.status} · ${project.memberCount}人'
                  '${project.ownerName.isNotEmpty ? ' · ${project.ownerName}' : ''}'),
            ),
          ),
          const SizedBox(height: 12),
          if (doc == null) ...[
            Text('概要', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(project.summary.isEmpty ? '—' : project.summary, style: const TextStyle(height: 1.45)),
          ] else ...[
            Text('企画提案書', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              doc['projectType'] == 'event' ? 'イベント' : '日常運営・改善',
              style: const TextStyle(color: TnTokens.textMuted),
            ),
            const Divider(height: 24),
            for (final field in proposalFields) ...[
              Text(field.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const SizedBox(height: 4),
              Text(
                '${doc[field.key] ?? ''}'.trim().isEmpty ? '未記入' : '${doc[field.key]}',
                style: const TextStyle(height: 1.45),
              ),
              const SizedBox(height: 14),
            ],
          ],
        ],
      ),
    );
  }
}
