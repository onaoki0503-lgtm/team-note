import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../forms/proposal_form.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import 'step_workflow_screen.dart';

/// Project detail — mirrors web `ProjectDetailView` (概要 / 企画書 / スタッフ).
class ProjectDetailScreen extends StatefulWidget {
  const ProjectDetailScreen({super.key, required this.projectId});

  final String projectId;

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

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
    final auth = context.watch<AuthProvider>();
    final project = data.projectById(widget.projectId);

    if (project == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('企画')),
        body: const Center(child: Text('企画が見つかりません')),
      );
    }

    final uid = auth.user?.id;
    final joined = project.isJoinedBy(uid);
    final accent = project.accentColor;

    return Scaffold(
      appBar: AppBar(
        title: Text(project.title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
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
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
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
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            FilledButton(
                              onPressed: _busy
                                  ? null
                                  : () => _run(
                                        () => data.toggleJoinProject(
                                          project.id,
                                          auth,
                                        ),
                                      ),
                              style: FilledButton.styleFrom(
                                backgroundColor:
                                    joined ? TnTokens.bgTint : TnTokens.primary,
                                foregroundColor:
                                    joined ? TnTokens.textMain : Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 10,
                                ),
                              ),
                              child: Text(joined ? '参加中' : '参加する'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 10,
                          runSpacing: 6,
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
                        const SizedBox(height: 8),
                        TabBar(
                          controller: _tabs,
                          labelColor: TnTokens.textMain,
                          unselectedLabelColor: TnTokens.textMuted,
                          indicatorColor: TnTokens.textMain,
                          tabs: const [
                            Tab(text: '概要'),
                            Tab(text: '企画書'),
                            Tab(text: 'スタッフ'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                AnimatedBuilder(
                  animation: _tabs,
                  builder: (context, _) {
                    switch (_tabs.index) {
                      case 1:
                        return _ProposalTab(
                          project: project,
                          busy: _busy,
                          onEdit: () => _showProposalEdit(project),
                        );
                      case 2:
                        return _StaffTab(
                          project: project,
                          busy: _busy,
                          onAddStaff: () => _showAddStaff(project),
                          onAddGroup: () => _showAddGroup(project),
                        );
                      default:
                        return _OverviewTab(
                          project: project,
                          accent: accent,
                          busy: _busy,
                          onAddStep: () => _showAddStep(project),
                          onOpenStep: (step) {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => StepWorkflowScreen(
                                  projectId: project.id,
                                  stepId: step.id,
                                  stepTitle: step.title,
                                ),
                              ),
                            );
                          },
                        );
                    }
                  },
                ),
              ],
            ),
          ),
          if (_busy) const LinearProgressIndicator(minHeight: 2),
        ],
      ),
    );
  }

  Future<void> _showAddStep(ProjectItem project) async {
    final name = TextEditingController();
    final date = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('ステップを追加'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'ステップ名'),
              autofocus: true,
            ),
            TextField(
              controller: date,
              decoration: const InputDecoration(labelText: '日程・メモ（任意）'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('キャンセル')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('追加')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    if (name.text.trim().isEmpty) return;
    await _run(
      () => context.read<AppDataProvider>().addWorkflowStep(
            project.id,
            name.text,
            date.text,
          ),
    );
  }

  Future<void> _showAddGroup(ProjectItem project) async {
    final name = TextEditingController();
    final leader = TextEditingController();
    final goal = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('班を追加'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: '班の名前（必須）'),
              autofocus: true,
            ),
            TextField(
              controller: leader,
              decoration: const InputDecoration(labelText: 'リーダー（任意）'),
            ),
            TextField(
              controller: goal,
              decoration: const InputDecoration(labelText: '目標（任意）'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('キャンセル')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('追加')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    if (name.text.trim().isEmpty) return;
    await _run(
      () => context.read<AppDataProvider>().addGroup(
            project.id,
            ProjectGroup(
              id: 'grp-${DateTime.now().millisecondsSinceEpoch}',
              name: name.text.trim(),
              glName: leader.text.trim(),
              milestoneTitle: goal.text.trim(),
            ),
          ),
    );
  }

  Future<void> _showAddStaff(ProjectItem project) async {
    final data = context.read<AppDataProvider>();
    final auth = context.read<AuthProvider>();
    final candidates = data.members
        .where((m) => !project.members.any((pm) => pm.residentId == m.id))
        .toList();
    if (candidates.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('追加できる寮生がいません')),
      );
      return;
    }
    String? selectedId = candidates.first.id;
    var role = 'スタッフ';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('スタッフを追加'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: selectedId,
                decoration: const InputDecoration(labelText: '寮生'),
                items: [
                  for (final m in candidates)
                    DropdownMenuItem(value: m.id, child: Text(m.name)),
                ],
                onChanged: (v) => setLocal(() => selectedId = v),
              ),
              DropdownButtonFormField<String>(
                initialValue: role,
                decoration: const InputDecoration(labelText: '役割'),
                items: const [
                  DropdownMenuItem(value: 'スタッフ', child: Text('スタッフ')),
                  DropdownMenuItem(value: 'PL', child: Text('PL')),
                  DropdownMenuItem(value: 'GL', child: Text('GL')),
                  DropdownMenuItem(value: 'メンバー', child: Text('メンバー')),
                ],
                onChanged: (v) => setLocal(() => role = v ?? 'スタッフ'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('キャンセル')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('追加')),
          ],
        ),
      ),
    );
    if (ok != true || selectedId == null || !mounted) return;
    MemberProfile? resident;
    for (final m in candidates) {
      if (m.id == selectedId) {
        resident = m;
        break;
      }
    }
    if (resident == null) return;
    final member = ProjectMember(
      residentId: resident.id,
      name: resident.name,
      avatar: resident.avatarUrl ?? '',
      role: role,
      eventRole: role == 'スタッフ' ? 'メンバー' : role,
      building: resident.building,
      joinedAt: DateTime.now().toIso8601String().substring(0, 10),
    );
    await _run(() => data.addStaffMember(project.id, member, auth));
  }

  Future<void> _showProposalEdit(ProjectItem project) async {
    final doc = Map<String, dynamic>.from(project.proposalDoc ?? {});
    final title = TextEditingController(text: '${doc['title'] ?? project.title}');
    final recipient = TextEditingController(text: '${doc['recipient'] ?? doc['submittedTo'] ?? ''}');
    final date = TextEditingController(text: '${doc['submissionDate'] ?? doc['submittedDate'] ?? ''}');
    final purpose = TextEditingController(
      text: '${doc['purpose'] ?? doc['objective'] ?? project.descriptionPreview}',
    );
    final issues = TextEditingController(
      text: doc['problems'] is List
          ? (doc['problems'] as List).join('\n')
          : '${doc['background'] ?? ''}',
    );
    final overview = TextEditingController(text: '${doc['proposalOverview'] ?? ''}');
    final cost = TextEditingController(
      text: '${doc['totalBudget'] ?? doc['totalCostEstimate'] ?? ''}',
    );
    final summary = TextEditingController(text: '${doc['summary'] ?? ''}');

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
                Text('企画書を編集', style: Theme.of(ctx).textTheme.titleMedium),
                const SizedBox(height: 12),
                TextField(controller: title, decoration: const InputDecoration(labelText: 'タイトル')),
                TextField(controller: recipient, decoration: const InputDecoration(labelText: '提出先')),
                TextField(controller: date, decoration: const InputDecoration(labelText: '提出日')),
                TextField(controller: purpose, decoration: const InputDecoration(labelText: '目的'), maxLines: 3),
                TextField(controller: issues, decoration: const InputDecoration(labelText: '課題・背景'), maxLines: 3),
                TextField(controller: overview, decoration: const InputDecoration(labelText: '提案概要'), maxLines: 3),
                TextField(controller: cost, decoration: const InputDecoration(labelText: '予算')),
                TextField(controller: summary, decoration: const InputDecoration(labelText: 'まとめ'), maxLines: 2),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('保存'),
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

    final problems = issues.text
        .split('\n')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    final next = {
      ...doc,
      'title': title.text.trim(),
      'recipient': recipient.text.trim(),
      'submissionDate': date.text.trim(),
      'purpose': purpose.text.trim(),
      'objective': purpose.text.trim(),
      'background': issues.text.trim(),
      'problems': problems,
      'proposalOverview': overview.text.trim(),
      'totalBudget': cost.text.trim(),
      'summary': summary.text.trim(),
      'projectType': project.projectType,
    };
    await _run(
      () => context.read<AppDataProvider>().updateProposalDoc(project.id, next),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({
    required this.project,
    required this.accent,
    required this.busy,
    required this.onAddStep,
    required this.onOpenStep,
  });

  final ProjectItem project;
  final Color accent;
  final bool busy;
  final VoidCallback onAddStep;
  final void Function(WorkflowStep step) onOpenStep;

  @override
  Widget build(BuildContext context) {
    final steps = project.effectiveWorkflowSteps;
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            color: accent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '次にやること',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                project.effectiveNextAction,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('運営工程', style: Theme.of(context).textTheme.titleMedium),
                    const Spacer(),
                    TextButton(
                      onPressed: busy ? null : onAddStep,
                      child: const Text('＋ ステップを追加'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                for (final st in steps) ...[
                  InkWell(
                    onTap: () => onOpenStep(st),
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: st.done
                                  ? TnTokens.primary
                                  : st.active
                                      ? accent
                                      : TnTokens.bgSurface,
                              border: Border.all(
                                color: st.done
                                    ? TnTokens.textMain
                                    : st.active
                                        ? accent
                                        : TnTokens.border,
                                width: 2,
                              ),
                            ),
                            child: Text(
                              st.done ? '✓' : st.step,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: st.done || st.active
                                    ? Colors.white
                                    : TnTokens.textMuted,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        st.title,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    if (st.active) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: TnTokens.bgTint,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          '現在地',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: TnTokens.textMuted,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (st.date.isNotEmpty)
                                  Text(
                                    st.date,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: TnTokens.textMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 18, color: TnTokens.textMuted),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProposalTab extends StatelessWidget {
  const _ProposalTab({
    required this.project,
    required this.busy,
    required this.onEdit,
  });

  final ProjectItem project;
  final bool busy;
  final VoidCallback onEdit;

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
                  ),
                  child: const Text(
                    '下書き',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: TnTokens.textMuted,
                    ),
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: busy ? null : onEdit,
                  child: const Text('編集する'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
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
            const SizedBox(height: 10),
            Text(
              '${doc?['title'] ?? '${project.title} 企画書'}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, height: 1.35),
            ),
            if ('${doc?['subtitle'] ?? ''}'.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                '${doc?['subtitle']}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              '提出先: ${doc?['recipient'] ?? doc?['submittedTo'] ?? '西松地所株式会社 様 / 寮母・管理スタッフの皆様'}'
              '\n提出日: ${doc?['submissionDate'] ?? doc?['submittedDate'] ?? '—'}',
              style: const TextStyle(fontSize: 12, color: TnTokens.textMuted, height: 1.45),
            ),
            const Divider(height: 24),
            if (doc == null)
              Text(
                project.summary.startsWith('PROPOSAL_JSON:')
                    ? '企画書データがありません'
                    : (project.summary.isEmpty ? '—' : project.summary),
                style: const TextStyle(height: 1.45),
              )
            else ...[
              ..._savedDetailRows(doc),
              _ProposalSection(
                title: '1. 企画の趣旨・背景',
                child: Text(
                  _docText(doc, const ['background', 'purpose']).isEmpty
                      ? project.descriptionPreview
                      : _docText(doc, const ['background', 'purpose']),
                  style: const TextStyle(fontSize: 13.5, height: 1.7),
                ),
              ),
              if (_docList(doc, 'problems').isNotEmpty) ...[
                const SizedBox(height: 18),
                _ProposalSection(
                  title: '2. 生じている課題 寮生側',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_docText(doc, const ['highlightQuote']).isNotEmpty)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFFCA5A5)),
                          ),
                          child: Text(
                            '・${_docText(doc, const ['highlightQuote'])}',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF7F1D1D),
                            ),
                          ),
                        ),
                      for (final p in _docList(doc, 'problems'))
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('・$p', style: const TextStyle(fontSize: 13, height: 1.45)),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 18),
              _ProposalSection(
                title: '3. 提案内容の概要',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _docText(doc, const ['proposalOverview']).isEmpty
                          ? '具体的な運用ルールおよび設備配置を導入します。'
                          : _docText(doc, const ['proposalOverview']),
                      style: const TextStyle(fontSize: 13.5, height: 1.7),
                    ),
                    if (_docMapList(doc, 'conceptBoxes').isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final box in _docMapList(doc, 'conceptBoxes'))
                            SizedBox(
                              width: 140,
                              child: Container(
                                padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
                                decoration: BoxDecoration(
                                  color: TnTokens.bgTint,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: TnTokens.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${box['number'] ?? ''} ${box['title'] ?? ''}'.trim(),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${box['description'] ?? ''}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: TnTokens.textMuted,
                                        height: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                    if (_docMapList(doc, 'flowItems').isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _SimpleTable(
                        headers: const ['対象', '手順・内容'],
                        rows: [
                          for (final fl in _docMapList(doc, 'flowItems'))
                            ['${fl['target'] ?? ''}', '${fl['content'] ?? ''}'],
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              if (_docMapList(doc, 'improvements').isNotEmpty) ...[
                const SizedBox(height: 18),
                _ProposalSection(
                  title: '4. 導入による改善点',
                  child: Column(
                    children: [
                      for (final imp in _docMapList(doc, 'improvements'))
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: TnTokens.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  color: TnTokens.bgTint,
                                  child: Text(
                                    '${imp['audience'] ?? ''}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${imp['title'] ?? ''}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${imp['desc'] ?? ''}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: TnTokens.textMuted,
                                          height: 1.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 18),
              _ProposalSection(
                title: '5. 必要資材および費用概算',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_docMapList(doc, 'budgetItems').isNotEmpty)
                      _SimpleTable(
                        headers: const ['品名', '仕様', '数量', '概算費用'],
                        rows: [
                          for (final b in _docMapList(doc, 'budgetItems'))
                            [
                              '${b['name'] ?? ''}',
                              '${b['spec'] ?? ''}',
                              '${b['quantity'] ?? ''}',
                              '${b['cost'] ?? ''}',
                            ],
                        ],
                      ),
                    const SizedBox(height: 8),
                    Text(
                      '合計概算費用: ${_docText(doc, const ['totalBudget', 'totalCostEstimate']).isEmpty ? '自治会費より約 4,800 円' : _docText(doc, const ['totalBudget', 'totalCostEstimate'])}',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0284C7),
                      ),
                    ),
                  ],
                ),
              ),
              if (_docList(doc, 'steps').isNotEmpty ||
                  _docText(doc, const ['actionSteps']).isNotEmpty) ...[
                const SizedBox(height: 18),
                _ProposalSection(
                  title: '6. 導入手順 案',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final st in _docList(doc, 'steps'))
                        Text(st, style: const TextStyle(fontSize: 13, height: 1.5)),
                      if (_docList(doc, 'steps').isEmpty)
                        Text(
                          _docText(doc, const ['actionSteps']),
                          style: const TextStyle(fontSize: 13, height: 1.5),
                        ),
                    ],
                  ),
                ),
              ],
              if (_docText(doc, const ['summary']).isNotEmpty) ...[
                const SizedBox(height: 18),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                  decoration: const BoxDecoration(
                    color: TnTokens.bgTint,
                    border: Border(left: BorderSide(color: Color(0xFF64748B), width: 4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'まとめ',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: TnTokens.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _docText(doc, const ['summary']),
                        style: const TextStyle(fontSize: 12.5, height: 1.55),
                      ),
                    ],
                  ),
                ),
              ],
              // Fallback: any remaining form fields not covered above.
              ...[
                for (final field in proposalFields)
                  if (field.key != 'title' &&
                      !_coveredProposalKeys.contains(field.key) &&
                      _fieldValue(doc, field.key).isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Text(
                      field.label,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(_fieldValue(doc, field.key), style: const TextStyle(height: 1.45)),
                  ],
              ],
            ],
          ],
        ),
      ),
    );
  }

  static const _coveredProposalKeys = {
    'background',
    'objective',
    'purpose',
    'proposalOverview',
    'totalCostEstimate',
    'submittedTo',
    'submittedDate',
    'actionSteps',
  };

  List<Widget> _savedDetailRows(Map<String, dynamic> doc) {
    final pairs = <(String, String)>[
      ('目的', _docText(doc, const ['objective', 'purpose'])),
      ('実施日時', _docText(doc, const ['implementationDate'])),
      ('場所', _docText(doc, const ['location'])),
      ('対象・人数', _docText(doc, const ['targetAudience'])),
      ('担当・役割', _docText(doc, const ['responsible'])),
      ('安全・確認事項', _fieldValue(doc, 'requirements')),
      ('成果・振り返り方法', _docText(doc, const ['expectedImpact'])),
    ].where((e) => e.$2.isNotEmpty).toList();
    if (pairs.isEmpty) return const [];
    return [
      for (final pair in pairs) ...[
        Text(pair.$1, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, color: TnTokens.textMuted)),
        const SizedBox(height: 2),
        Text(pair.$2, style: const TextStyle(fontSize: 13, height: 1.45)),
        const SizedBox(height: 10),
      ],
      const Divider(height: 20),
    ];
  }

  String _fieldValue(Map<String, dynamic> doc, String key) {
    final aliases = {
      'totalCostEstimate': ['totalBudget', 'budget', 'totalCostEstimate'],
      'submittedTo': ['recipient', 'submittedTo'],
      'submittedDate': ['submissionDate', 'submittedDate'],
      'actionSteps': ['actionSteps', 'steps'],
      'requirements': ['requirements'],
    };
    final keys = aliases[key] ?? [key];
    for (final k in keys) {
      final v = doc[k];
      if (v is List) {
        final joined = v.map((e) => '$e').where((s) => s.trim().isNotEmpty).join('\n');
        if (joined.isNotEmpty) return joined;
      } else {
        final s = '${v ?? ''}'.trim();
        if (s.isNotEmpty) return s;
      }
    }
    return '';
  }
}

class _ProposalSection extends StatelessWidget {
  const _ProposalSection({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DecoratedBox(
          decoration: const BoxDecoration(
            border: Border(left: BorderSide(color: Color(0xFF0284C7), width: 4)),
          ),
          child: Padding(
            padding: const EdgeInsets.only(left: 10),
            child: Text(
              title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _SimpleTable extends StatelessWidget {
  const _SimpleTable({required this.headers, required this.rows});

  final List<String> headers;
  final List<List<String>> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: TnTokens.border),
      ),
      child: Column(
        children: [
          Container(
            color: TnTokens.bgTint,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
            child: Row(
              children: [
                for (final h in headers)
                  Expanded(
                    child: Text(
                      h,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
          for (var i = 0; i < rows.length; i++)
            Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: TnTokens.border.withValues(alpha: 0.6)),
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final cell in rows[i])
                    Expanded(
                      child: Text(cell, style: const TextStyle(fontSize: 12, height: 1.35)),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

String _docText(Map<String, dynamic> doc, List<String> keys) {
  for (final k in keys) {
    final s = '${doc[k] ?? ''}'.trim();
    if (s.isNotEmpty) return s;
  }
  return '';
}

List<String> _docList(Map<String, dynamic> doc, String key) {
  final v = doc[key];
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

List<Map<String, dynamic>> _docMapList(Map<String, dynamic> doc, String key) {
  final v = doc[key];
  if (v is! List) return const [];
  return [
    for (final e in v)
      if (e is Map) Map<String, dynamic>.from(e),
  ];
}

class _StaffTab extends StatelessWidget {
  const _StaffTab({
    required this.project,
    required this.busy,
    required this.onAddStaff,
    required this.onAddGroup,
  });

  final ProjectItem project;
  final bool busy;
  final VoidCallback onAddStaff;
  final VoidCallback onAddGroup;

  @override
  Widget build(BuildContext context) {
    final groups = project.groups;
    return Column(
      children: [
        Row(
          children: [
            TextButton(onPressed: busy ? null : onAddGroup, child: const Text('＋ 班を追加')),
            const Spacer(),
            FilledButton(
              onPressed: busy ? null : onAddStaff,
              child: const Text('＋ スタッフを追加'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '企画全体',
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
                    child: Text('まだスタッフがいません', style: TextStyle(color: TnTokens.textMuted)),
                  )
                else
                  for (final m in project.members)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: TnTokens.bgTint,
                        child: Text(
                          m.name.isNotEmpty ? String.fromCharCodes(m.name.runes.take(1)) : '?',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(
                        m.building.isEmpty ? '—' : '${MemberProfile.buildings[m.building] ?? m.building}棟',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Text(
                        m.eventRole ?? m.role,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        if (groups.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('班はまだありません', style: TextStyle(color: TnTokens.textMuted)),
            ),
          )
        else
          for (final g in groups)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  title: Text(g.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                    [
                      if (g.glName.isNotEmpty) 'リーダー ${g.glName}',
                      if (g.milestoneTitle.isNotEmpty) '目標 ${g.milestoneTitle}',
                    ].join('  ·  '),
                  ),
                ),
              ),
            ),
      ],
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
                errorBuilder: (context, error, stackTrace) => Container(color: TnTokens.bgTint),
              ),
            ),
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
