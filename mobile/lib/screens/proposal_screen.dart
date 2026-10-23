import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';

import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_header.dart';
import '../widgets/attach_bar.dart';
import '../widgets/tn_card.dart';

class ProposalScreen extends StatefulWidget {
  const ProposalScreen({super.key});

  @override
  State<ProposalScreen> createState() => _ProposalScreenState();
}

class _ProposalScreenState extends State<ProposalScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _attachments = <AttachmentPin>[];
  var _step = 0;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  void _confirm() {
    final title = _title.text.trim();
    final summary = _body.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('タイトルを入力してください')),
      );
      return;
    }
    final owner = context.read<AuthProvider>().profile.name;
    context.read<AppDataProvider>().addProject(
          ProjectItem(
            id: const Uuid().v4(),
            title: title,
            summary: summary.isEmpty ? '—' : summary,
            status: '進行中',
            memberCount: 1,
            ownerName: owner,
          ),
        );
    context.go('/?tab=1');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          const SafeArea(bottom: false, child: AppHeader(showBack: true)),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Row(
                  children: [
                    _StepChip(label: '1 入力', active: _step == 0),
                    const Icon(Icons.chevron_right, size: 18),
                    _StepChip(label: '2 確認', active: _step == 1),
                  ],
                ),
                const SizedBox(height: 16),
                if (_step == 0) ...[
                  TnCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('企画書', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _title,
                          decoration: const InputDecoration(labelText: 'タイトル'),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _body,
                          minLines: 5,
                          maxLines: 10,
                          maxLength: 2400,
                          decoration: const InputDecoration(
                            hintText: '背景・目的・実施・日時・場所・担当・予算',
                          ),
                        ),
                        const SizedBox(height: 8),
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
                          onPressed: () => setState(() => _step = 1),
                          child: const Text('確認へ'),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  TnCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(_title.text.trim().isEmpty ? '（無題）' : _title.text.trim(),
                            style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        Text(
                          _body.text.trim().isEmpty ? '本文なし' : _body.text.trim(),
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        if (_attachments.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            '添付 ${_attachments.length}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                        const SizedBox(height: 16),
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
                              child: FilledButton(
                                onPressed: _confirm,
                                child: const Text('登録'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: active ? const Color(0xFF285782) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0x52AABBD0)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: active ? Colors.white : const Color(0xFF626E80),
        ),
      ),
    );
  }
}
