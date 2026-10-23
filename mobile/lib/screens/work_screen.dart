import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';
import '../widgets/attach_bar.dart';

class WorkScreen extends StatefulWidget {
  const WorkScreen({super.key});

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _attachments = <AttachmentPin>[];
  DateTime _date = DateTime.now();
  String _category = '役職固有業務';
  static const _categories = ['役職固有業務', '巡回', '清掃', 'イベント', 'その他'];

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('業務名と内容を入力')),
      );
      return;
    }
    await context.read<AppDataProvider>().saveReport(
          title: _title.text.trim(),
          category: _category,
          body: _body.text.trim(),
          date: _date,
          attachments: _attachments,
        );
    if (!mounted) return;
    _title.clear();
    _body.clear();
    setState(() => _attachments.clear());
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('保存しました')));
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text('業務報告', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('日付'),
                  subtitle: Text(DateFormat('yyyy/MM/dd').format(_date)),
                  trailing: const Icon(Icons.calendar_today_outlined, size: 18),
                  onTap: () async {
                    final next = await showDatePicker(
                      context: context,
                      initialDate: _date,
                      firstDate: DateTime(2024),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (next != null) setState(() => _date = next);
                  },
                ),
                TextField(controller: _title, decoration: const InputDecoration(labelText: '業務名')),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final c in _categories)
                      ChoiceChip(
                        label: Text(c),
                        selected: _category == c,
                        onSelected: (_) => setState(() => _category = c),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _body,
                  minLines: 4,
                  maxLines: 8,
                  decoration: const InputDecoration(hintText: '実施内容・結果'),
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
                FilledButton(onPressed: _save, child: const Text('保存')),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text('最近の報告', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...context.watch<AppDataProvider>().reports.take(5).map(
              (r) => Card(
                child: ListTile(
                  title: Text('${r['title'] ?? ''}'),
                  subtitle: Text('${r['category'] ?? ''} · ${r['reportDate'] ?? ''}'),
                ),
              ),
            ),
        if (context.watch<AppDataProvider>().reports.isEmpty)
          const Text('まだありません', style: TextStyle(color: TnTokens.textMuted)),
      ],
    );
  }
}
