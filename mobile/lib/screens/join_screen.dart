import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

class JoinScreen extends StatefulWidget {
  const JoinScreen({super.key});

  @override
  State<JoinScreen> createState() => _JoinScreenState();
}

class _JoinScreenState extends State<JoinScreen> {
  final _invite = TextEditingController();
  final _name = TextEditingController();
  final _unit = TextEditingController();
  String _role = '一般寮生';
  String _building = 'rosemary';
  int _floor = 1;

  @override
  void dispose() {
    _invite.dispose();
    _name.dispose();
    _unit.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('プロフィール登録'),
        actions: [
          TextButton(
            onPressed: auth.busy ? null : () => auth.signOut(),
            child: const Text('別アカウント'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text('参加コードと寮の情報を入力してください。', style: TextStyle(color: TnTokens.textMuted)),
          const SizedBox(height: 16),
          TextField(
            controller: _invite,
            decoration: const InputDecoration(labelText: '参加コード'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: '名前'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _role,
            decoration: const InputDecoration(labelText: '役職'),
            items: [
              for (final r in MemberProfile.roles)
                DropdownMenuItem(value: r, child: Text(r)),
            ],
            onChanged: (v) => setState(() => _role = v ?? '一般寮生'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _building,
                  decoration: const InputDecoration(labelText: '棟'),
                  items: [
                    for (final e in MemberProfile.buildings.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) => setState(() => _building = v ?? 'rosemary'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<int>(
                  initialValue: _floor,
                  decoration: const InputDecoration(labelText: '階'),
                  items: [
                    for (final f in [1, 2, 3, 4])
                      DropdownMenuItem(value: f, child: Text('$f階')),
                  ],
                  onChanged: (v) => setState(() => _floor = v ?? 1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _unit,
            decoration: const InputDecoration(labelText: '部屋番号', hintText: '301-A'),
          ),
          if (auth.error != null) ...[
            const SizedBox(height: 12),
            Text(auth.error!, style: const TextStyle(color: TnTokens.errorText)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: auth.busy
                ? null
                : () async {
                    final draft = MemberProfile(
                      id: auth.user?.id ?? '',
                      name: _name.text.trim(),
                      role: _role,
                      building: _building,
                      floor: _floor,
                      unit: _unit.text.trim(),
                    );
                    await auth.joinCommunity(_invite.text.trim(), draft);
                  },
            child: Text(auth.busy ? '確認中…' : '寮に参加する'),
          ),
        ],
      ),
    );
  }
}
