import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../widgets/attach_bar.dart';

class ProposalScreen extends StatefulWidget {
  const ProposalScreen({super.key});

  @override
  State<ProposalScreen> createState() => _ProposalScreenState();
}

class _ProposalScreenState extends State<ProposalScreen> {
  final _title = TextEditingController();
  final _summary = TextEditingController();
  final _attachments = <AttachmentPin>[];
  var _step = 0;

  @override
  void dispose() {
    _title.dispose();
    _summary.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('タイトルを入力')));
      return;
    }
    await context.read<AppDataProvider>().createProject(title, _summary.text.trim());
    if (!mounted) return;
    context.go('/?tab=1');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_step == 0 ? '企画を作成' : '確認')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_step == 0) ...[
            TextField(controller: _title, decoration: const InputDecoration(labelText: 'タイトル')),
            const SizedBox(height: 12),
            TextField(
              controller: _summary,
              minLines: 5,
              maxLines: 10,
              decoration: const InputDecoration(hintText: '背景・目的・実施など'),
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
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => setState(() => _step = 1),
              child: const Text('確認へ'),
            ),
          ] else ...[
            Text(_title.text.trim(), style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(_summary.text.trim().isEmpty ? '本文なし' : _summary.text.trim()),
            if (_attachments.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('添付 ${_attachments.length}', style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _step = 0),
                    child: const Text('戻る'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(onPressed: _register, child: const Text('登録')),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
