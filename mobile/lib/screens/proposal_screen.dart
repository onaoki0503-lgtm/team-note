import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'package:team_note_mobile/forms/proposal_form.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import '../widgets/attach_bar.dart';

/// Full 企画書作成 — same fields as web IdeaFlowViews / proposalForm.ts
class ProposalScreen extends StatefulWidget {
  const ProposalScreen({super.key, this.seedFromIdea});

  /// Prefill 実施内容 when opened via 「企画にする」 from an idea.
  final String? seedFromIdea;

  @override
  State<ProposalScreen> createState() => _ProposalScreenState();
}

class _ProposalScreenState extends State<ProposalScreen> {
  var _stage = 1; // 1 input, 3 confirm (web numbering)
  var _form = ProposalForm();
  final _memo = TextEditingController();
  final _attachments = <AttachmentPin>[];
  final _speech = SpeechToText();
  var _listening = false;
  var _distributing = false;
  var _submitting = false;
  String? _error;
  String? _notice;
  List<String> _missing = [];
  List<ProposalAssignment> _candidates = [];
  final Set<String> _selected = {};

  String get _draftKey {
    final id = context.read<AuthProvider>().profile?.id ?? 'anon';
    return 'tn_proposal_form:$id:v1';
  }

  @override
  void initState() {
    super.initState();
    final seed = widget.seedFromIdea?.trim();
    if (seed != null && seed.isNotEmpty) {
      _form = ProposalForm();
      _form['proposalOverview'] = seed;
      _form['title'] = seed.length > 40 ? '${seed.substring(0, 40)}…' : seed;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDraft());
  }

  @override
  void dispose() {
    _memo.dispose();
    _speech.stop();
    super.dispose();
  }

  Future<void> _loadDraft() async {
    // Don't overwrite an idea seed with an older local draft.
    if ((widget.seedFromIdea ?? '').trim().isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftKey);
    if (raw == null) return;
    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final formJson = data['form'];
      if (formJson is Map<String, dynamic>) {
        setState(() => _form = ProposalForm.fromJson(formJson));
      }
    } catch (_) {}
  }

  Future<void> _saveDraft() async {
    final tooLong = proposalFields.where((f) => _form[f.key].length > f.max).firstOrNull;
    if (tooLong != null) {
      setState(() => _error = '${tooLong.label}は${tooLong.max}文字以内に直してから保存してください。');
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_draftKey, jsonEncode({'version': 1, 'form': _form.toJson()}));
    setState(() {
      _notice = 'この端末に下書きを保存しました。';
      _error = null;
    });
  }

  void _distribute() {
    final text = _memo.text;
    if (text.trim().isEmpty || text.length > maxDistributionInput) {
      setState(() => _error = '振り分ける内容を$maxDistributionInput文字以内で入力してください。');
      return;
    }
    setState(() {
      _distributing = true;
      _error = null;
      _candidates = [];
      _selected.clear();
    });
    final local = localAssignments(text);
    setState(() {
      _distributing = false;
      if (local.isEmpty) {
        _notice = '項目名付きの文がないため自動分配できませんでした。各項目へ直接入力するか、「企画名は…」形式で書いてください。';
      } else {
        _candidates = local;
        for (final item in local) {
          final def = proposalFields.firstWhere((f) => f.key == item.field);
          if (_form[item.field].trim().isEmpty && item.quote.length <= def.max) {
            _selected.add(item.field);
          }
        }
        _notice = '項目名から振り分けました。反映する内容を確認してください。';
      }
    });
  }

  void _applyCandidates() {
    for (final item in _candidates.where((c) => _selected.contains(c.field))) {
      final def = proposalFields.firstWhere((f) => f.key == item.field);
      if (item.quote.length > def.max) {
        setState(() => _error = '項目の文字数上限を超えています。メモを短くして振り分け直してください。');
        return;
      }
      _form[item.field] = item.quote;
    }
    final n = _selected.length;
    setState(() {
      _candidates = [];
      _selected.clear();
      _notice = '$n項目に反映しました。';
      _error = null;
    });
  }

  Future<void> _toggleListen() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      _distribute();
      return;
    }
    final ok = await _speech.initialize();
    if (!ok) {
      setState(() => _error = 'この端末では音声入力を使えません。各項目に文字入力できます。');
      return;
    }
    setState(() {
      _listening = true;
      _error = null;
    });
    await _speech.listen(
      listenOptions: SpeechListenOptions(localeId: 'ja_JP'),
      onResult: (r) {
        setState(() => _memo.text = r.recognizedWords);
        _memo.selection = TextSelection.collapsed(offset: _memo.text.length);
      },
    );
  }

  void _preview() {
    final errors = _form.errors();
    setState(() {
      _missing = errors;
      if (errors.isEmpty) {
        _stage = 3;
        _error = null;
      }
    });
  }

  Future<void> _confirm() async {
    final errors = _form.errors();
    if (errors.isNotEmpty) {
      setState(() {
        _missing = errors;
        _stage = 1;
      });
      return;
    }
    setState(() => _submitting = true);
    try {
      await context.read<AppDataProvider>().createProjectFull(
            _form,
            attachments: _attachments,
            auth: context.read<AuthProvider>(),
          );
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      if (!mounted) return;
      context.go('/?tab=1');
    } catch (_) {
      if (mounted) setState(() => _error = '登録できませんでした。入力内容は残しています。');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('企画書を作成'),
        actions: [
          if (_stage == 1)
            TextButton(onPressed: _listening || _distributing ? null : _saveDraft, child: const Text('下書き')),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          Row(
            children: [
              _stepChip('1 項目を入力', _stage == 1),
              const Icon(Icons.chevron_right, size: 18),
              _stepChip('2 確認・登録', _stage == 3),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: TnTokens.errorText)),
          ],
          if (_notice != null) ...[
            const SizedBox(height: 8),
            Text(_notice!, style: const TextStyle(color: TnTokens.accentGreen)),
          ],
          if (_missing.isNotEmpty) ...[
            const SizedBox(height: 8),
            ..._missing.map((e) => Text('・$e', style: const TextStyle(color: TnTokens.errorText, fontSize: 13))),
          ],
          const SizedBox(height: 14),
          if (_stage == 1) ..._inputStage() else ..._confirmStage(),
        ],
      ),
    );
  }

  List<Widget> _inputStage() => [
        const Text(
          '項目に入力した内容を、そのまま企画書に反映します。未定の項目は「未定」と記載してください。',
          style: TextStyle(color: TnTokens.textMuted, fontSize: 13, height: 1.45),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('企画全体をまとめて話す', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 6),
                const Text(
                  '背景・目的・実施内容・日時・場所・担当・予算などをまとめて話してください。終了後、各項目に振り分けます。',
                  style: TextStyle(fontSize: 12, color: TnTokens.textMuted, height: 1.4),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: _distributing ? null : _toggleListen,
                  icon: Icon(_listening ? Icons.stop : Icons.mic),
                  label: Text(_listening ? '終了して自動分配' : '音声入力を開始'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _memo,
                  maxLength: maxDistributionInput,
                  minLines: 4,
                  maxLines: 8,
                  enabled: !_listening,
                  decoration: const InputDecoration(labelText: 'まとめて入力'),
                ),
                OutlinedButton(
                  onPressed: _listening || _distributing || !_memo.text.trim().isNotEmpty ? null : _distribute,
                  child: Text(_distributing ? '振り分け中…' : '入力内容を自動分配'),
                ),
                if (_candidates.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('振り分け候補', style: TextStyle(fontWeight: FontWeight.w600)),
                  ..._candidates.map((item) {
                    final label = proposalFields.firstWhere((f) => f.key == item.field).label;
                    return CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _selected.contains(item.field),
                      onChanged: (v) => setState(() {
                        if (v == true) {
                          _selected.add(item.field);
                        } else {
                          _selected.remove(item.field);
                        }
                      }),
                      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      subtitle: Text('候補：${item.quote}', maxLines: 4, overflow: TextOverflow.ellipsis),
                    );
                  }),
                  FilledButton(
                    onPressed: _selected.isEmpty ? null : _applyCandidates,
                    child: const Text('選択した項目に反映'),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _form.projectType,
                  decoration: const InputDecoration(labelText: '企画の種類'),
                  items: const [
                    DropdownMenuItem(value: 'operation', child: Text('日常運営・改善')),
                    DropdownMenuItem(value: 'event', child: Text('イベント')),
                  ],
                  onChanged: _listening
                      ? null
                      : (v) => setState(() => _form.projectType = v ?? 'operation'),
                ),
                const SizedBox(height: 12),
                for (final field in proposalFields) ...[
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: field.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        if (field.required)
                          const TextSpan(text: ' 必須', style: TextStyle(color: Color(0xFFB92F3D), fontSize: 11)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(field.hint, style: const TextStyle(fontSize: 12, color: TnTokens.textMuted)),
                  const SizedBox(height: 6),
                  TextFormField(
                    initialValue: _form[field.key],
                    maxLength: field.max,
                    minLines: field.max <= 400 ? 2 : 3,
                    maxLines: field.max <= 400 ? 4 : 8,
                    enabled: !_listening,
                    decoration: const InputDecoration(isDense: true),
                    onChanged: (v) => setState(() => _form[field.key] = v),
                  ),
                  const SizedBox(height: 12),
                ],
                AttachBar(
                  attachments: _attachments,
                  onChanged: (next) => setState(() {
                    _attachments
                      ..clear()
                      ..addAll(next);
                  }),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _listening || _distributing ? null : _preview,
                  child: const Text('企画書を確認'),
                ),
              ],
            ),
          ),
        ),
      ];

  List<Widget> _confirmStage() => [
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _submitting ? null : () => setState(() => _stage = 1),
                child: const Text('入力内容を直す'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('企画提案書', style: TextStyle(fontSize: 12, color: TnTokens.textMuted)),
                const SizedBox(height: 6),
                Text(_form['title'], style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(_form.projectType == 'event' ? 'イベント' : '日常運営・改善',
                    style: const TextStyle(color: TnTokens.textMuted)),
                const Divider(height: 24),
                for (final field in proposalFields.where((f) => f.key != 'title')) ...[
                  Text(field.label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    _form[field.key].trim().isEmpty ? '未記入' : _form[field.key],
                    style: const TextStyle(height: 1.45),
                  ),
                  const SizedBox(height: 14),
                ],
                if (_attachments.isNotEmpty)
                  Text('添付 ${_attachments.length}件', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _submitting ? null : _confirm,
          child: Text(_submitting ? '登録しています' : 'この内容で企画を登録'),
        ),
      ];

  Widget _stepChip(String label, bool active) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? TnTokens.primary : TnTokens.bgSurface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: TnTokens.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : TnTokens.textMuted,
          ),
        ),
      );
}
