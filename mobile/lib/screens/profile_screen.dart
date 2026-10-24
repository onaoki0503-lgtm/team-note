import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'package:team_note_mobile/forms/dorm_roles.dart';
import '../data/activity_history.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../services/media_service.dart';
import '../theme/tokens.dart';

/// Full profile — mirrors web SharedProfile + RosterArchiveViews S28 fields.
/// Prefer [showAsSheet] from the shell / meibo so presentation matches other pull-up cards.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, this.asSheet = false});

  /// When true, omit Scaffold/AppBar and fit inside a modal bottom sheet.
  final bool asSheet;

  /// Same pull-up card chrome as meibo resident profiles.
  static Future<void> showAsSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: TnTokens.bgMain,
      builder: (ctx) {
        final maxH = MediaQuery.sizeOf(ctx).height * 0.70;
        return SizedBox(
          width: double.infinity,
          height: maxH,
          child: const ProfileScreen(asSheet: true),
        );
      },
    );
  }

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
    _syncControllers(p);
  }

  void _syncControllers(MemberProfile p) {
    _name = TextEditingController(text: p.name);
    _unit = TextEditingController(text: p.unit);
    _bio = TextEditingController(text: p.bio);
    _role = dormRoles.any((r) => r.key == p.role) ? p.role : '一般寮生';
    _building = MemberProfile.buildings.containsKey(p.building) ? p.building : 'rosemary';
    _floor = p.floor.clamp(1, 4);
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
    _role = dormRoles.any((r) => r.key == p.role) ? p.role : '一般寮生';
    _building = MemberProfile.buildings.containsKey(p.building) ? p.building : 'rosemary';
    _floor = p.floor.clamp(1, 4);
    setState(() => _editing = true);
  }

  Future<void> _save(AuthProvider auth) async {
    final roleCfg = dormRoles.firstWhere((r) => r.key == _role);
    final next = MemberProfile(
      id: auth.profile?.id ?? auth.user?.id ?? '',
      name: _name.text.trim(),
      role: roleCfg.key,
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
    final data = context.watch<AppDataProvider>();
    final p = auth.profile;
    final badge = roleBadgeInfo(p?.role);
    final history = getActivityHistory(data.projects, p?.id ?? '');
    final bottom = MediaQuery.paddingOf(context).bottom;

    final body = p == null
        ? const Center(child: Text('未参加'))
        : ListView(
            padding: EdgeInsets.fromLTRB(16, widget.asSheet ? 0 : 8, 16, bottom + 20),
            children: [
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _editing ? _editForm(auth, p) : _view(p, badge),
                ),
              ),
              const SizedBox(height: 14),
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('活動履歴', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 4),
                      const Text(
                        'スタッフ加入・担当の記録から自動表示',
                        style: TextStyle(fontSize: 12, color: TnTokens.textMuted),
                      ),
                      const SizedBox(height: 12),
                      if (history.isEmpty)
                        const Text(
                          'スタッフとして参加した企画はまだありません。',
                          style: TextStyle(color: TnTokens.textMuted, fontSize: 13),
                        )
                      else
                        ...history.map(
                          (item) => Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: TnTokens.bgTint.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.projectTitle,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item.groupName == null || item.groupName!.isEmpty
                                      ? item.role
                                      : '${item.role}・${item.groupName}',
                                  style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${item.period} ・ ${item.status}',
                                  style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                margin: EdgeInsets.zero,
                color: TnTokens.bgTint.withValues(alpha: 0.35),
                child: const ListTile(
                  leading: Icon(Icons.visibility_off_outlined, size: 20),
                  title: Text(
                    '関係者のみ閲覧できます',
                    style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              OutlinedButton(
                onPressed: auth.busy
                    ? null
                    : () async {
                        final bioOn = await auth.credentials.isEnabled();
                        if (!context.mounted) return;
                        final fullSignOut = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('ログアウト'),
                            content: Text(
                              bioOn
                                  ? '「残してログアウト」はロックするだけです。次回は Face ID / 指紋だけで開けます。「サインアウト」はメールや Google の入れ直しが必要ですが、顔認証の設定は残ります。'
                                  : 'ログアウトしますか？顔認証をオンにしていれば、その設定はこのまま端末に残ります。',
                              style: const TextStyle(height: 1.55),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('キャンセル'),
                              ),
                              if (bioOn)
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx, false),
                                  child: const Text('残してログアウト'),
                                ),
                              FilledButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: Text(bioOn ? 'サインアウト' : 'ログアウト'),
                              ),
                            ],
                          ),
                        );
                        if (fullSignOut == null) return;
                        await auth.signOut(fullSignOut: fullSignOut);
                        if (context.mounted) {
                          Navigator.of(context).popUntil((r) => r.isFirst);
                        }
                      },
                child: const Text('ログアウト'),
              ),
            ],
          );

    if (widget.asSheet) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 8, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'プロフィール',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
                if (p != null && !_editing)
                  TextButton(
                    onPressed: () => _startEdit(p),
                    child: const Text('プロフィールを編集'),
                  ),
              ],
            ),
          ),
          Expanded(child: body),
        ],
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('プロフィール'),
        actions: [
          if (p != null && !_editing)
            TextButton(onPressed: () => _startEdit(p), child: const Text('プロフィールを編集')),
        ],
      ),
      body: body,
    );
  }

  Widget _view(MemberProfile p, ({String badge, bool isLeadership}) badge) {
    final roleTitle = dormRoles.where((r) => r.key == p.role).map((r) => r.title).firstOrNull ?? p.role;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _avatar(p),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    children: [
                      Text(p.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                      if (badge.badge.isNotEmpty)
                        Text(
                          badge.badge,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: badge.isLeadership ? TnTokens.accentOrange : TnTokens.textMuted,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.locationLine,
                    style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
                  ),
                  const SizedBox(height: 4),
                  Text(roleTitle, style: const TextStyle(fontSize: 12, color: TnTokens.textMuted)),
                ],
              ),
            ),
          ],
        ),
        const Divider(height: 28),
        const Text('自己紹介', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
        const SizedBox(height: 4),
        Text(
          p.bio.isEmpty ? '自己紹介が未設定です。プロフィールを編集から設定できます。' : p.bio,
          style: TextStyle(
            fontSize: 13,
            height: 1.6,
            color: p.bio.isEmpty ? TnTokens.textMuted : TnTokens.textMain,
            fontStyle: p.bio.isEmpty ? FontStyle.italic : FontStyle.normal,
          ),
        ),
        const Divider(height: 28),
        Row(
          children: [
            const Text('役職の選択:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: TnTokens.textMuted)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(roleTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            ),
            const Text('✓ 現在の利用者', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF16A34A))),
          ],
        ),
      ],
    );
  }

  Widget _editForm(AuthProvider auth, MemberProfile p) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: GestureDetector(
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
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: '名前（任意）', hintText: '空ならメール名を使います'),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _role,
          decoration: const InputDecoration(labelText: '役職（任意）'),
          items: [
            for (final r in dormRoles)
              DropdownMenuItem(value: r.key, child: Text(r.title)),
          ],
          onChanged: (v) => setState(() => _role = v ?? '一般寮生'),
        ),
        const SizedBox(height: 6),
        Text(
          dormRoles.firstWhere((r) => r.key == _role).description,
          style: const TextStyle(fontSize: 12, color: TnTokens.textMuted),
        ),
        const SizedBox(height: 10),
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
            const SizedBox(width: 10),
            Expanded(
              child: DropdownButtonFormField<int>(
                initialValue: _floor,
                decoration: const InputDecoration(labelText: '階（任意）'),
                items: [for (final f in [1, 2, 3, 4]) DropdownMenuItem(value: f, child: Text('$f階'))],
                onChanged: (v) => setState(() => _floor = v ?? 1),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _unit,
          decoration: const InputDecoration(labelText: '部屋番号（任意）', hintText: '301-A'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _bio,
          maxLines: 4,
          maxLength: 500,
          decoration: const InputDecoration(labelText: '自己紹介（任意）'),
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
