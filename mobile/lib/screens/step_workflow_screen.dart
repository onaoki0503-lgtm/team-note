import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

/// Step detail — mirrors web `StepWorkflowView` (企画書 / 議事録 / 振り返り / 運用ルール).
class StepWorkflowScreen extends StatefulWidget {
  const StepWorkflowScreen({
    super.key,
    required this.projectId,
    required this.stepId,
    required this.stepTitle,
  });

  final String projectId;
  final String stepId;
  final String stepTitle;

  @override
  State<StepWorkflowScreen> createState() => _StepWorkflowScreenState();
}

class _StepWorkflowScreenState extends State<StepWorkflowScreen> {
  int _category = 0; // 0 proposal, 1 minutes, 2 review, 3 rules
  bool _busy = false;
  int? _expandedNote;

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('操作に失敗しました: $e')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final project = data.projectById(widget.projectId);

    if (project == null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.stepTitle)),
        body: const Center(child: Text('企画が見つかりません')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.stepTitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 28),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'ステップ: ${widget.stepTitle}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: TnTokens.bgTint,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            '進行中',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: TnTokens.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    for (var i = 0; i < 4; i++)
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(right: i < 3 ? 6 : 0),
                          child: _CategoryChip(
                            label: const ['企画書', '議事録', '振り返り', '運用ルール'][i],
                            selected: _category == i,
                            onTap: () => setState(() => _category = i),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                switch (_category) {
                  1 => _MinutesPane(
                      project: project,
                      busy: _busy,
                      expandedIndex: _expandedNote,
                      onToggle: (i) => setState(
                        () => _expandedNote = _expandedNote == i ? null : i,
                      ),
                      onAdd: () => _showAddMinutes(project),
                    ),
                  2 => _ReviewPane(
                      project: project,
                      busy: _busy,
                      onAdd: () => _showAddReview(project),
                    ),
                  3 => const _RulesPane(),
                  _ => _StepProposalPane(project: project),
                },
              ],
            ),
          ),
          if (_busy) const LinearProgressIndicator(minHeight: 2),
        ],
      ),
    );
  }

  Future<void> _showAddMinutes(ProjectItem project) async {
    final title = TextEditingController();
    final date = TextEditingController(
      text: DateTime.now().toIso8601String().substring(0, 10),
    );
    final attendees = TextEditingController();
    final summary = TextEditingController();
    final decisions = TextEditingController();
    final todos = TextEditingController();

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('議事録を作る', style: Theme.of(ctx).textTheme.titleMedium),
                const SizedBox(height: 12),
                TextField(
                  controller: title,
                  decoration: const InputDecoration(labelText: 'タイトル（必須）'),
                  autofocus: true,
                ),
                TextField(controller: date, decoration: const InputDecoration(labelText: '開催日')),
                TextField(controller: attendees, decoration: const InputDecoration(labelText: '出席者')),
                TextField(
                  controller: summary,
                  decoration: const InputDecoration(labelText: 'メモ・内容（必須）'),
                  maxLines: 4,
                ),
                TextField(
                  controller: decisions,
                  decoration: const InputDecoration(labelText: '決定事項（1行ずつ）'),
                  maxLines: 3,
                ),
                TextField(
                  controller: todos,
                  decoration: const InputDecoration(labelText: '次のTODO（1行ずつ）'),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('保存する'),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('キャンセル'),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (ok != true || !mounted) return;
    if (title.text.trim().isEmpty || summary.text.trim().isEmpty) return;

    List<String> lines(String raw) => raw
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    await _run(
      () => context.read<AppDataProvider>().addMeetingNote(
            project.id,
            MeetingNote(
              id: 'mn-${DateTime.now().millisecondsSinceEpoch}',
              title: title.text.trim(),
              date: date.text.trim(),
              attendees: attendees.text.trim(),
              summary: summary.text.trim(),
              decisions: lines(decisions.text),
              nextTodos: lines(todos.text),
            ),
          ),
    );
  }

  Future<void> _showAddReview(ProjectItem project) async {
    final auth = context.read<AuthProvider>();
    var facilitation = 4;
    var communication = 3;
    var safety = 5;
    var budget = 4;
    var verdict = '未評価';
    final good = TextEditingController();
    final bad = TextEditingController();
    final target = TextEditingController(
      text: project.members.isNotEmpty ? project.members.first.name : '',
    );

    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            Widget scoreRow(String label, int value, void Function(int) onChanged) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  children: [
                    SizedBox(
                      width: 88,
                      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    ),
                    for (var n = 1; n <= 5; n++)
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: ChoiceChip(
                          label: Text('$n'),
                          selected: value == n,
                          onSelected: (_) => setLocal(() => onChanged(n)),
                        ),
                      ),
                  ],
                ),
              );
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('振り返りを記録', style: Theme.of(ctx).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    TextField(
                      controller: target,
                      decoration: const InputDecoration(labelText: '対象者'),
                    ),
                    scoreRow('統率', facilitation, (v) => facilitation = v),
                    scoreRow('連絡', communication, (v) => communication = v),
                    scoreRow('安全・折衝', safety, (v) => safety = v),
                    scoreRow('期日・予算', budget, (v) => budget = v),
                    TextField(controller: good, decoration: const InputDecoration(labelText: '強み'), maxLines: 2),
                    TextField(controller: bad, decoration: const InputDecoration(labelText: 'フォローが必要な点'), maxLines: 2),
                    DropdownButtonFormField<String>(
                      initialValue: verdict,
                      decoration: const InputDecoration(labelText: '総合適性'),
                      items: const [
                        DropdownMenuItem(value: '未評価', child: Text('未評価')),
                        DropdownMenuItem(value: 'PL適格', child: Text('PL適格')),
                        DropdownMenuItem(value: 'GL適格', child: Text('GL適格')),
                        DropdownMenuItem(value: '専門実務向き', child: Text('専門実務向き')),
                        DropdownMenuItem(value: '要フォロー', child: Text('要フォロー')),
                      ],
                      onChanged: (v) => setLocal(() => verdict = v ?? '未評価'),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('保存する'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('キャンセル'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
    if (ok != true || !mounted) return;

    await _run(
      () => context.read<AppDataProvider>().addEvaluation(
            project.id,
            LeaderEvaluation(
              id: 'ev-${DateTime.now().millisecondsSinceEpoch}',
              targetName: target.text.trim().isEmpty ? 'メンバー' : target.text.trim(),
              authorName: auth.profile?.name ?? auth.user?.email ?? '',
              facilitation: facilitation,
              communication: communication,
              safety: safety,
              budget: budget,
              verdict: verdict,
              good: good.text.trim(),
              bad: bad.text.trim(),
              createdAt: DateTime.now().toIso8601String(),
            ),
          ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? TnTokens.primary : TnTokens.bgSurface,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: selected ? TnTokens.textMain : TnTokens.border,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: selected ? Colors.white : TnTokens.textMain,
            ),
          ),
        ),
      ),
    );
  }
}

class _StepProposalPane extends StatelessWidget {
  const _StepProposalPane({required this.project});

  final ProjectItem project;

  @override
  Widget build(BuildContext context) {
    final doc = project.proposalDoc;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: TnTokens.bgTint,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFFBAE6FD)),
                  ),
                  child: const Text(
                    '企画提案書',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0284C7),
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '${doc?['submissionDate'] ?? doc?['submittedDate'] ?? ''}',
                  style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '${doc?['title'] ?? '${project.title} 企画書'}',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
            if ('${doc?['subtitle'] ?? ''}'.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                '${doc?['subtitle']}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
            const Divider(height: 24),
            _SectionHeading('1. 企画の趣旨・背景'),
            Text(
              _firstNonEmpty([
                doc?['background'],
                doc?['purpose'],
                project.descriptionPreview,
              ]),
              style: const TextStyle(fontSize: 13.5, height: 1.7),
            ),
            if (_asStringList(doc?['problems']).isNotEmpty) ...[
              const SizedBox(height: 16),
              _SectionHeading('2. 生じている課題'),
              for (final p in _asStringList(doc?['problems']))
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text('・$p', style: const TextStyle(fontSize: 13, height: 1.45)),
                ),
            ],
            const SizedBox(height: 16),
            _SectionHeading('3. 提案内容の概要'),
            Text(
              _firstNonEmpty([
                doc?['proposalOverview'],
                '具体的な運用ルールおよび専用設備を導入します。',
              ]),
              style: const TextStyle(fontSize: 13.5, height: 1.7),
            ),
            if (_firstNonEmpty([doc?['totalBudget'], doc?['totalCostEstimate']]).isNotEmpty) ...[
              const SizedBox(height: 16),
              const Divider(),
              Row(
                children: [
                  const Text('合計概算費用', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const Spacer(),
                  Text(
                    _firstNonEmpty([doc?['totalBudget'], doc?['totalCostEstimate']]),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: Color(0xFF0284C7),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MinutesPane extends StatelessWidget {
  const _MinutesPane({
    required this.project,
    required this.busy,
    required this.expandedIndex,
    required this.onToggle,
    required this.onAdd,
  });

  final ProjectItem project;
  final bool busy;
  final int? expandedIndex;
  final void Function(int index) onToggle;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final notes = project.meetingNotes;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                '会議の決定事項と次の行動',
                style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
              ),
            ),
            FilledButton(
              onPressed: busy ? null : onAdd,
              child: const Text('議事録を追加'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (notes.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('議事録はまだありません', style: TextStyle(color: TnTokens.textMuted)),
            ),
          )
        else
          for (var i = 0; i < notes.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: InkWell(
                  onTap: () => onToggle(i),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                notes[i].title,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                              ),
                            ),
                            Text(
                              notes[i].date,
                              style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                            ),
                          ],
                        ),
                        if (notes[i].summary.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            notes[i].summary,
                            style: const TextStyle(fontSize: 13, color: TnTokens.textMuted, height: 1.45),
                          ),
                        ],
                        if (expandedIndex == i) ...[
                          const Divider(height: 20),
                          if (notes[i].attendees.isNotEmpty)
                            Text(
                              '出席者: ${notes[i].attendees}',
                              style: const TextStyle(fontSize: 13),
                            ),
                          if (notes[i].decisions.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            const Text('決定事項', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                            for (final d in notes[i].decisions)
                              Text('・$d', style: const TextStyle(fontSize: 13, height: 1.5)),
                          ],
                          if (notes[i].nextTodos.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            const Text('次のTODO', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                            for (final t in notes[i].nextTodos)
                              Text('・$t', style: const TextStyle(fontSize: 13, height: 1.5)),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
      ],
    );
  }
}

class _ReviewPane extends StatelessWidget {
  const _ReviewPane({
    required this.project,
    required this.busy,
    required this.onAdd,
  });

  final ProjectItem project;
  final bool busy;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final evals = project.evaluations;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                '関係者のみ閲覧可能',
                style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
              ),
            ),
            FilledButton(
              onPressed: busy ? null : onAdd,
              child: const Text('振り返りを記録'),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'メンバーの提出状況',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: TnTokens.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                if (project.members.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text('メンバーがいません', style: TextStyle(color: TnTokens.textMuted)),
                  )
                else
                  for (final m in project.members)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: TnTokens.bgTint,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          evals.any((e) => e.targetName == m.name || e.authorName == m.name)
                              ? '提出済'
                              : '未提出',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: TnTokens.textMuted),
                        ),
                      ),
                    ),
              ],
            ),
          ),
        ),
        if (evals.isNotEmpty) ...[
          const SizedBox(height: 10),
          for (final e in evals)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  title: Text(
                    e.targetName.isEmpty ? '評価' : e.targetName,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    [
                      if (e.verdict.isNotEmpty) e.verdict,
                      if (e.good.isNotEmpty) '強み: ${e.good}',
                    ].join('\n'),
                  ),
                  isThreeLine: e.good.isNotEmpty,
                ),
              ),
            ),
        ],
      ],
    );
  }
}

class _RulesPane extends StatelessWidget {
  const _RulesPane();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('日常の手順', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            SizedBox(height: 8),
            Text('1. 使い終わったら、シンクと作業台を清掃する。', style: TextStyle(height: 1.7)),
            Text('2. 消耗品の残量を確認し、必要に応じて補充する。', style: TextStyle(height: 1.7)),
            Text('3. 異常があれば、すぐにチームに共有する。', style: TextStyle(height: 1.7)),
            SizedBox(height: 16),
            Text('保管場所', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
            SizedBox(height: 4),
            Text('倉庫A'),
            SizedBox(height: 12),
            Text('補充の目安', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
            SizedBox(height: 4),
            Text('残り3ロール以下になった時点で補充'),
          ],
        ),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(left: BorderSide(color: Color(0xFF0284C7), width: 4)),
        ),
        child: Padding(
          padding: const EdgeInsets.only(left: 10),
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

String _firstNonEmpty(List<dynamic> values) {
  for (final v in values) {
    final s = '${v ?? ''}'.trim();
    if (s.isNotEmpty) return s;
  }
  return '';
}

List<String> _asStringList(dynamic v) {
  if (v is List) {
    return [for (final e in v) '$e'.trim()].where((s) => s.isNotEmpty).toList();
  }
  if (v is String && v.trim().isNotEmpty) {
    return v
        .split(RegExp(r'[,、\n]'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }
  return const [];
}
