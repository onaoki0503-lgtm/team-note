import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/media_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_header.dart';
import '../widgets/tn_card.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _bio;
  late final TextEditingController _building;
  late final TextEditingController _unit;
  String _role = 'HL';
  String? _localAvatarPath;
  final _media = MediaService();

  @override
  void initState() {
    super.initState();
    final p = context.read<AuthProvider>().profile;
    _name = TextEditingController(text: p.name);
    _bio = TextEditingController(text: p.bio);
    _building = TextEditingController(text: p.building);
    _unit = TextEditingController(text: p.unit);
    _role = p.role.isEmpty ? 'HL' : p.role;
  }

  @override
  void dispose() {
    _name.dispose();
    _bio.dispose();
    _building.dispose();
    _unit.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final pin = await _media.takePhoto() ?? await _media.pickFromGallery();
    if (pin?.path == null) return;
    setState(() => _localAvatarPath = pin!.path);
  }

  Future<void> _save() async {
    final auth = context.read<AuthProvider>();
    final next = auth.profile
      ..name = _name.text.trim()
      ..bio = _bio.text.trim()
      ..building = _building.text.trim()
      ..unit = _unit.text.trim()
      ..role = _role;
    await auth.saveProfile(next);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('保存しました')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: Column(
        children: [
          const SafeArea(bottom: false, child: AppHeader(showBack: true)),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Text('プロフィール', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 14),
                TnCard(
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Stack(
                            children: [
                              CircleAvatar(
                                radius: 36,
                                backgroundColor: TnTokens.bgTint,
                                backgroundImage: _localAvatarPath != null
                                    ? FileImage(File(_localAvatarPath!))
                                    : (auth.profile.avatarUrl != null
                                        ? NetworkImage(auth.profile.avatarUrl!)
                                        : null),
                                child: _localAvatarPath == null &&
                                        auth.profile.avatarUrl == null
                                    ? Text(
                                        _name.text.isNotEmpty
                                            ? _name.text.characters.first
                                            : '?',
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      )
                                    : null,
                              ),
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: InkWell(
                                  onTap: _pickAvatar,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: TnTokens.accentOrange,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.photo_camera, size: 14, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                TextField(
                                  controller: _name,
                                  decoration: const InputDecoration(
                                    isDense: true,
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    filled: false,
                                    contentPadding: EdgeInsets.zero,
                                    hintText: '名前',
                                  ),
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                Text(
                                  '${_building.text} ${_unit.text}'.trim(),
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _bio,
                        maxLines: 2,
                        decoration: const InputDecoration(hintText: '自己紹介'),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _role,
                              items: const [
                                DropdownMenuItem(value: 'HL', child: Text('HL')),
                                DropdownMenuItem(value: 'スタッフ', child: Text('スタッフ')),
                                DropdownMenuItem(value: '寮生', child: Text('寮生')),
                              ],
                              onChanged: (v) => setState(() => _role = v ?? 'HL'),
                              decoration: const InputDecoration(labelText: '役職'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _building,
                              decoration: const InputDecoration(labelText: '棟'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _unit,
                        decoration: const InputDecoration(labelText: '部屋'),
                      ),
                      const SizedBox(height: 16),
                      FilledButton.icon(
                        onPressed: _save,
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('保存'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () async {
                    await auth.signOut();
                    if (context.mounted) context.go('/login');
                  },
                  child: const Text('ログアウト'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
