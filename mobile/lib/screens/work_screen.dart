import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../theme/tokens.dart';
import '../widgets/attach_bar.dart';
import '../widgets/tn_card.dart';

class WorkScreen extends StatefulWidget {
  const WorkScreen({super.key});

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  final _draft = WorkReportDraft();
  final _title = TextEditingController();
  final _body = TextEditingController();
  static const _categories = ['役職固有業務', '巡回', '清掃', 'イベント', 'その他'];

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final next = await showDatePicker(
      context: context,
      initialDate: _draft.date,
      firstDate: DateTime(2024),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (next != null) setState(() => _draft.date = next);
  }

  void _save() {
    _draft.title = _title.text.trim();
    _draft.body = _body.text.trim();
    if (_draft.title.isEmpty || _draft.body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('業務名と内容を入力してください')),
      );
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '保存しました（添付 ${_draft.attachments.length}）',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat('yyyy/MM/dd').format(_draft.date);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Row(
          children: [
            Text('業務報告', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(width: 8),
            const Icon(Icons.lock_outline, size: 16, color: TnTokens.textMuted),
          ],
        ),
        const SizedBox(height: 12),
        TnCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              InkWell(
                onTap: _pickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: '日付',
                    suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                  ),
                  child: Text(dateLabel),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _title,
                decoration: const InputDecoration(labelText: '業務名'),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final c in _categories)
                    ChoiceChip(
                      label: Text(c),
                      selected: _draft.category == c,
                      onSelected: (_) => setState(() => _draft.category = c),
                      selectedColor: TnTokens.primary,
                      labelStyle: TextStyle(
                        color: _draft.category == c ? TnTokens.onPrimary : TnTokens.textMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _body,
                minLines: 4,
                maxLines: 8,
                decoration: const InputDecoration(
                  hintText: '実施内容・結果',
                ),
              ),
              const SizedBox(height: 14),
              AttachBar(
                attachments: _draft.attachments,
                onChanged: (next) => setState(() {
                  _draft.attachments
                    ..clear()
                    ..addAll(next);
                }),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _save,
                child: const Text('保存'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
