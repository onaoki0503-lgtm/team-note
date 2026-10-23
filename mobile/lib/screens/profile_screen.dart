import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../services/media_service.dart';
import '../theme/tokens.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _editing = false;
  final _media = MediaService();
  String? _localAvatar;

  late TextEditingController _name;
  late TextEditingController _unit;
  late TextEditingController _bio;
  late String _role;
  late String _building;
  late int _floor;

  @override
  void initState() {
    super.initState();
    final p = context.read<AuthProvider>().profile ?? MemberProfile.blank();
    _name = TextEditingController(text: p.name);
    _unit = TextEditingController(text: p.unit);
    _bio = TextEditingController(text: p.bio);
    _role = p.role;
    _building = p.building;
    _floor = p.floor;
  }

  @override
  void dispose() {
    _name.dispose();
    _unit.dispose();
    _bio.dispose();
    super.dispose();
  }

  void _startEdit(MemberProfile p) {
    _name.text = p.name;
    _unit.text = p.unit;
    _bio.text = p.bio;
    _role = MemberProfile.roles.contains(p.role) ? p.role : '一般寮生';
    _building = MemberProfile.buildings.containsKey(p.building) ? p.building : 'rosemary';
    _floor = p.floor.clamp(1, 4);
    setState(() => _editing = true);
  }

  Future<void> _save(AuthProvider auth) async {
    final next = MemberProfile(
      id: auth.profile?.id ?? auth.user?.id ?? '',
      name: _name.text.trim(),
      role: _role,
      building: _building,
      floor: _floor,
      unit: _unit.text.trim(),
      bio: _bio.text.trim(),
      avatarUrl: auth.profile?.avatarUrl,
    );
    await auth.saveProfile(next, localAvatarPath: _localAvatar);
    if (!mounted) return;
    setState(() {
      _editing = false;
      _localAvatar = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final p = auth.profile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('プロフィール'),
        actions: [
          if (p != null && !_editing)
            TextButton(
              onPressed: () => _startEdit(p),
              child: const Text('編集'),
            ),
        ],
      ),
      body: p == null
          ? const Center(child: Text('未参加'))
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: _editing ? _editForm(auth, p) : _view(p),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('活動履歴', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Text(
                          'スタッフとして参加した企画はまだありません。',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                OutlinedButton(
                  onPressed: auth.busy ? null : () async {
                    await auth.signOut();
                    if (context.mounted) Navigator.of(context).popUntil((r) => r.isFirst);
                  },
                  child: const Text('ログアウト'),
                ),
              ],
            ),
    );
  }

  Widget _view(MemberProfile p) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _avatar(p),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          p.name,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        p.role,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: p.role == '一般寮生' ? TnTokens.textMuted : TnTokens.accentOrange,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(p.locationLine, style: const TextStyle(fontSize: 12, color: TnTokens.textMuted)),
                ],
              ),
            ),
          ],
        ),
        const Divider(height: 28),
        const Text('自己紹介', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
        const SizedBox(height: 4),
        Text(
          p.bio.isEmpty ? '自己紹介が未設定です。' : p.bio,
          style: TextStyle(
            fontSize: 13,
            color: p.bio.isEmpty ? TnTokens.textMuted : TnTokens.textMain,
            fontStyle: p.bio.isEmpty ? FontStyle.italic : FontStyle.normal,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  Widget _editForm(AuthProvider auth, MemberProfile p) {
    return Column(
      children: [
        GestureDetector(
          onTap: () async {
            final pin = await _media.pickFromGallery() ?? await _media.takePhoto();
            if (pin?.path != null) setState(() => _localAvatar = pin!.path);
          },
          child: Stack(
            children: [
              _avatar(p, local: _localAvatar),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(color: TnTokens.accentOrange, shape: BoxShape.circle),
                  child: const Icon(Icons.photo_camera, size: 14, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextField(controller: _name, decoration: const InputDecoration(labelText: '名前')),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _role,
          decoration: const InputDecoration(labelText: '役職'),
          items: [for (final r in MemberProfile.roles) DropdownMenuItem(value: r, child: Text(r))],
          onChanged: (v) => setState(() => _role = v ?? '一般寮生'),
        ),
        const SizedBox(height: 10),
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
            const SizedBox(width: 10),
            Expanded(
              child: DropdownButtonFormField<int>(
                initialValue: _floor,
                decoration: const InputDecoration(labelText: '階'),
                items: [for (final f in [1, 2, 3, 4]) DropdownMenuItem(value: f, child: Text('$f階'))],
                onChanged: (v) => setState(() => _floor = v ?? 1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextField(controller: _unit, decoration: const InputDecoration(labelText: '部屋番号')),
        const SizedBox(height: 10),
        TextField(
          controller: _bio,
          maxLines: 3,
          maxLength: 500,
          decoration: const InputDecoration(labelText: '自己紹介'),
        ),
        if (auth.error != null) Text(auth.error!, style: const TextStyle(color: TnTokens.errorText)),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: auth.busy ? null : () => setState(() => _editing = false),
                child: const Text('キャンセル'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                onPressed: auth.busy ? null : () => _save(auth),
                child: Text(auth.busy ? '…' : '保存する'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _avatar(MemberProfile p, {String? local}) {
    ImageProvider? image;
    if (local != null) {
      image = FileImage(File(local));
    } else if (p.avatarUrl != null) {
      image = NetworkImage(p.avatarUrl!);
    }
    return CircleAvatar(
      radius: 36,
      backgroundColor: TnTokens.bgTint,
      backgroundImage: image,
      child: image == null
          ? Text(
              p.name.isNotEmpty ? p.name.characters.first : '?',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            )
          : null,
    );
  }
}
