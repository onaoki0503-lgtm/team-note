import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart';

import 'package:team_note_mobile/forms/work_report_form.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';
import '../widgets/attach_bar.dart';

/// Full 業務報告 — same structure as web WorkStorageViews (S21/S22)
class WorkScreen extends StatefulWidget {
  const WorkScreen({super.key});

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _entryUnit = TextEditingController();
  final _entryPurpose = TextEditingController();
  final _attachments = <AttachmentPin>[];
  final _speech = SpeechToText();

  DateTime _date = DateTime.now();
  String _activity = 'inherent';
  var _reviewing = false;
  var _saving = false;
  var _listening = false;
  var _filterMonthOnly = true;
  String? _error;
  String? _notice;

  ActivityType get _type => activityByKey(_activity);

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _entryUnit.dispose();
    _entryPurpose.dispose();
    _speech.stop();
    super.dispose();
  }

  void _openReview() {
    setState(() => _error = null);
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      setState(() => _error = '業務名と実施内容を入力してください。');
      return;
    }
    if (_activity == 'unit_entry' &&
        (_entryUnit.text.trim().isEmpty || _entryPurpose.text.trim().isEmpty)) {
      setState(() => _error = '立ち入り先と目的を入力してください。');
      return;
    }
    setState(() => _reviewing = true);
  }

  Future<void> _confirmSave() async {
    setState(() => _saving = true);
    try {
      final body = StringBuffer(_body.text.trim());
      if (_activity == 'unit_entry') {
        body.writeln();
        body.writeln('【立ち入り先】${_entryUnit.text.trim()}');
        body.writeln('【目的】${_entryPurpose.text.trim()}');
      }
      final pins = [
        ..._attachments,
        AttachmentPin(kind: AttachmentKind.file, label: 'activityType:$_activity'),
      ];
      await context.read<AppDataProvider>().saveReport(
            title: _title.text.trim(),
            category: _type.label,
            body: body.toString(),
            date: _date,
            attachments: pins,
          );
      if (!mounted) return;
      _title.clear();
      _body.clear();
      _entryUnit.clear();
      _entryPurpose.clear();
      setState(() {
        _attachments.clear();
        _reviewing = false;
        _notice = '報告書を保存しました。';
        _error = null;
      });
    } catch (e) {
      setState(() => _error = '保存できませんでした。入力は残しています。');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _toggleVoice() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    final ok = await _speech.initialize();
    if (!ok) {
      setState(() => _error = 'この端末では音声入力ボタンを使えません。文字入力をお使いください。');
      return;
    }
    setState(() => _listening = true);
    final base = _body.text;
    await _speech.listen(
      listenOptions: SpeechListenOptions(localeId: 'ja_JP'),
      onResult: (r) {
        final next = base.isEmpty ? r.recognizedWords : '$base${r.recognizedWords}';
        setState(() => _body.text = next);
        _body.selection = TextSelection.collapsed(offset: _body.text.length);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final reports = context.watch<AppDataProvider>().reports;
    final ym = DateFormat('yyyy-MM').format(DateTime.now());
    final shown = _filterMonthOnly
        ? reports.where((r) => '${r['reportDate'] ?? ''}'.startsWith(ym)).toList()
        : reports;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('業務報告', style: Theme.of(context).textTheme.titleLarge),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: TnTokens.bgTint,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline, size: 12, color: TnTokens.textMuted),
                  SizedBox(width: 4),
                  Text('個人専用', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
                ],
              ),
            ),
            FilledButton.tonalIcon(
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 40),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              onPressed: () => _showNishimatsuInfo(context),
              icon: const Icon(Icons.description_outlined, size: 18),
              label: const Text('西松地所レポート'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'いつ・どこで・何をした・どうなった・申し送りを、話すか入力してください。',
          softWrap: true,
          style: TextStyle(fontSize: 13, color: TnTokens.textMuted, height: 1.45),
        ),
        if (_notice != null) ...[
          const SizedBox(height: 8),
          Text(_notice!, style: const TextStyle(color: TnTokens.accentGreen)),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: TnTokens.errorText)),
        ],
        const SizedBox(height: 12),
        if (_reviewing) _reviewCard() else _formCard(),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          alignment: WrapAlignment.spaceBetween,
          children: [
            Text('今月の報告ログ', style: Theme.of(context).textTheme.titleMedium),
            SegmentedButton<bool>(
              style: const ButtonStyle(
                visualDensity: VisualDensity.compact,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              segments: const [
                ButtonSegment(value: true, label: Text('今月')),
                ButtonSegment(value: false, label: Text('全て')),
              ],
              selected: {_filterMonthOnly},
              onSelectionChanged: (s) => setState(() => _filterMonthOnly = s.first),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (shown.isEmpty)
          const Text('まだ報告書がありません。', style: TextStyle(color: TnTokens.textMuted))
        else
          ...shown.map(
            (r) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('${r['title'] ?? ''}'),
                subtitle: Text(
                  '${r['category'] ?? ''} · ${r['reportDate'] ?? ''}\n${r['body'] ?? ''}',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
                isThreeLine: true,
              ),
            ),
          ),
      ],
    );
  }

  Widget _formCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('報告書への反映内容', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text('音声も文字入力も同じ報告書に反映します。まだ保存されていません。',
                style: TextStyle(fontSize: 12, color: TnTokens.textMuted)),
            const SizedBox(height: 14),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text.rich(TextSpan(children: [
                TextSpan(text: '日付 ', style: TextStyle(fontWeight: FontWeight.w700)),
                TextSpan(text: '必須', style: TextStyle(color: Color(0xFFB92F3D), fontSize: 11)),
              ])),
              subtitle: Text(DateFormat('yyyy-MM-dd').format(_date)),
              trailing: const Icon(Icons.calendar_today_outlined, size: 18),
              onTap: _listening
                  ? null
                  : () async {
                      final next = await showDatePicker(
                        context: context,
                        initialDate: _date,
                        firstDate: DateTime(2024),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (next != null) setState(() => _date = next);
                    },
            ),
            TextField(
              controller: _title,
              enabled: !_listening,
              decoration: const InputDecoration(
                labelText: '業務名（必須）',
                hintText: '業務名を入力',
              ),
            ),
            const SizedBox(height: 12),
            const Text.rich(TextSpan(children: [
              TextSpan(text: '区分 ', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              TextSpan(text: '必須', style: TextStyle(color: Color(0xFFB92F3D), fontSize: 11)),
            ])),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final t in activityTypes)
                  ChoiceChip(
                    label: Text(t.label, style: const TextStyle(fontSize: 12)),
                    selected: _activity == t.key,
                    onSelected: _listening ? null : (_) => setState(() => _activity = t.key),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(_type.hint, style: const TextStyle(fontSize: 11, color: TnTokens.textMuted)),
            if (_activity == 'unit_entry') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F9FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBAE6FD)),
                ),
                child: Column(
                  children: [
                    TextField(
                      controller: _entryUnit,
                      decoration: const InputDecoration(
                        labelText: '棟・ユニット番号（必須）',
                        hintText: '例: ローズマリー棟 302',
                      ),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _entryPurpose,
                      decoration: const InputDecoration(
                        labelText: '立ち入り目的（必須）',
                        hintText: '例: 水漏れ確認・緊急立ち入り',
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            Text.rich(TextSpan(children: [
              TextSpan(text: '${_type.bodyLabel} ', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              const TextSpan(text: '必須', style: TextStyle(color: Color(0xFFB92F3D), fontSize: 11)),
            ])),
            const SizedBox(height: 6),
            // Stack hint + mic vertically so Japanese stays horizontal (narrow Row
            // was wrapping 「どうなった」 etc. one character per line).
            const Text(
              'いつ・どこで・何をした・どうなった・申し送り',
              softWrap: true,
              style: TextStyle(fontSize: 12, color: TnTokens.textMuted, height: 1.4),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.tonalIcon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                onPressed: _toggleVoice,
                icon: Icon(_listening ? Icons.stop : Icons.mic, size: 18),
                label: Text(_listening ? '音声入力を止める' : '音声入力'),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _body,
              enabled: !_listening,
              minLines: 6,
              maxLines: 12,
              decoration: InputDecoration(hintText: _type.bodyHint),
            ),
            if (_listening)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text('聞いています。確定した文字を入力内容の続きに追加します。',
                    style: TextStyle(fontSize: 12, color: TnTokens.textMuted)),
              ),
            const SizedBox(height: 12),
            AttachBar(
              attachments: _attachments,
              onChanged: (next) => setState(() {
                _attachments
                  ..clear()
                  ..addAll(next);
              }),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _listening ? null : _openReview,
              icon: const Icon(Icons.send),
              label: const Text('報告書を確認する'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _reviewCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('保存前の確認', style: TextStyle(fontSize: 12, color: TnTokens.textMuted)),
            const SizedBox(height: 4),
            Text('報告書の内容', style: Theme.of(context).textTheme.titleMedium),
            const Divider(height: 20),
            _kv('実施日', DateFormat('yyyy-MM-dd').format(_date)),
            _kv('業務名', _title.text.trim()),
            _kv('区分', _type.label),
            if (_activity == 'unit_entry') ...[
              _kv('立ち入り先', _entryUnit.text.trim()),
              _kv('目的', _entryPurpose.text.trim()),
            ],
            _kv('実施内容・結果', _body.text.trim()),
            if (_attachments.isNotEmpty) _kv('添付', '${_attachments.length}件'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _confirmSave,
              child: Text(_saving ? '保存しています' : 'この内容で報告書を保存'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _saving ? null : () => setState(() => _reviewing = false),
              child: const Text('内容を直す'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _kv(String k, String v) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(k, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
            const SizedBox(height: 2),
            Text(v, style: const TextStyle(height: 1.45)),
          ],
        ),
      );

  void _showNishimatsuInfo(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('西松地所レポート作成', style: Theme.of(ctx).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Text(
              'Web版と同じく、蓄積した業務報告から西松地所向けレポートを組み立てます。'
              'まずは通常の報告書を保存してください。レポート出力UIは次ビルドでWebと同等に接続します。',
              style: TextStyle(height: 1.45, color: TnTokens.textMuted),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('閉じる')),
          ],
        ),
      ),
    );
  }
}
