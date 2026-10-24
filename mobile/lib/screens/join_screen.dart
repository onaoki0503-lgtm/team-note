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
  bool _showExtras = false;
  String _role = '一般寮生';
  String _building = 'rosemary';
  int _floor = 1;
  final _unit = TextEditingController();

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
    final emailHint = auth.user?.email?.split('@').first ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('寮に参加'),
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
          const Text(
            '参加コードは、寮の担当者から受け取った招待用の合言葉です（Web版と同じ）。'
            'メール登録後、初めて入るときに一度だけ使います。',
            style: TextStyle(color: TnTokens.textMuted, height: 1.45),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _invite,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: '参加コード',
              hintText: '担当者から受け取ったコード',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _name,
            decoration: InputDecoration(
              labelText: '表示名（任意）',
              hintText: emailHint.isEmpty ? 'あとから変更できます' : emailHint,
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => setState(() => _showExtras = !_showExtras),
            child: Text(_showExtras ? '棟・部屋などの入力を隠す' : '棟・部屋なども入力する（任意）'),
          ),
          if (_showExtras) ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _role,
              decoration: const InputDecoration(labelText: '役職（任意）'),
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
                    decoration: const InputDecoration(labelText: '棟（任意）'),
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
                    decoration: const InputDecoration(labelText: '階（任意）'),
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
              decoration: const InputDecoration(
                labelText: '部屋番号（任意）',
                hintText: 'あとからプロフィールで設定できます',
              ),
            ),
          ],
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
            child: Text(auth.busy ? '確認中…' : '参加する'),
          ),
        ],
      ),
    );
  }
}
