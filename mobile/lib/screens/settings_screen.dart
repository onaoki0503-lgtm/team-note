import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

const _faceKey = 'tn_face_login';
const _motionKey = 'tn_motion_paused';

class FaceEnrollment {
  FaceEnrollment({
    required this.enabled,
    required this.userId,
    required this.email,
    required this.displayName,
    required this.descriptorBase64,
    required this.enrolledAt,
  });

  final bool enabled;
  final String userId;
  final String email;
  final String displayName;
  final String descriptorBase64;
  final String enrolledAt;

  Map<String, dynamic> toJson() => {
        'version': 1,
        'enabled': enabled,
        'userId': userId,
        'email': email,
        'displayName': displayName,
        'descriptor': descriptorBase64,
        'enrolledAt': enrolledAt,
      };

  static FaceEnrollment? fromJson(Map<String, dynamic>? json) {
    if (json == null || json['version'] != 1) return null;
    final descriptor = json['descriptor'];
    if (descriptor is! String || descriptor.isEmpty) return null;
    return FaceEnrollment(
      enabled: json['enabled'] == true,
      userId: '${json['userId'] ?? ''}',
      email: '${json['email'] ?? ''}',
      displayName: '${json['displayName'] ?? ''}',
      descriptorBase64: descriptor,
      enrolledAt: '${json['enrolledAt'] ?? ''}',
    );
  }
}

class FaceLoginStore {
  static Future<FaceEnrollment?> read() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_faceKey);
    if (raw == null) return null;
    try {
      return FaceEnrollment.fromJson(
        jsonDecode(raw) as Map<String, dynamic>,
      );
    } catch (_) {
      return null;
    }
  }

  static Future<void> write(FaceEnrollment? enrollment) async {
    final prefs = await SharedPreferences.getInstance();
    if (enrollment == null) {
      await prefs.remove(_faceKey);
    } else {
      await prefs.setString(_faceKey, jsonEncode(enrollment.toJson()));
    }
  }

  static Future<bool> readMotionPaused() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_motionKey) ?? false;
  }

  static Future<void> writeMotionPaused(bool paused) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_motionKey, paused);
  }
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  static Future<void> showAsSheet(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: TnTokens.bgSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => const FractionallySizedBox(
        heightFactor: 0.92,
        child: SettingsScreen(),
      ),
    );
  }

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  FaceEnrollment? _enrollment;
  bool _motionPaused = false;
  bool _busy = false;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final enrollment = await FaceLoginStore.read();
    final motion = await FaceLoginStore.readMotionPaused();
    if (!mounted) return;
    setState(() {
      _enrollment = enrollment;
      _motionPaused = motion;
    });
  }

  Future<void> _enroll() async {
    final auth = context.read<AuthProvider>();
    final profile = auth.profile;
    if (profile == null) return;
    setState(() {
      _busy = true;
      _notice = null;
    });
    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 480,
        imageQuality: 70,
      );
      if (file == null) {
        setState(() => _busy = false);
        return;
      }
      final bytes = await file.readAsBytes();
      final enrollment = FaceEnrollment(
        enabled: true,
        userId: profile.id,
        email: auth.user?.email ?? '',
        displayName: profile.name,
        descriptorBase64: base64Encode(bytes),
        enrolledAt: DateTime.now().toIso8601String(),
      );
      await FaceLoginStore.write(enrollment);
      if (!mounted) return;
      setState(() {
        _enrollment = enrollment;
        _busy = false;
        _notice = '顔認証を登録しました。ログイン画面で使えます。';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _notice = 'カメラを開けませんでした。';
      });
    }
  }

  Future<void> _remove() async {
    await FaceLoginStore.write(null);
    if (!mounted) return;
    setState(() {
      _enrollment = null;
      _notice = '顔認証の登録を削除しました。';
    });
  }

  Future<void> _toggleEnabled(bool enabled) async {
    final current = _enrollment;
    if (current == null) return;
    final next = FaceEnrollment(
      enabled: enabled,
      userId: current.userId,
      email: current.email,
      displayName: current.displayName,
      descriptorBase64: current.descriptorBase64,
      enrolledAt: current.enrolledAt,
    );
    await FaceLoginStore.write(next);
    if (!mounted) return;
    setState(() {
      _enrollment = next;
      _notice = enabled ? '顔認証ログインをオンにしました。' : '顔認証ログインをオフにしました。';
    });
  }

  Future<void> _toggleMotion(bool paused) async {
    await FaceLoginStore.writeMotionPaused(paused);
    if (!mounted) return;
    setState(() => _motionPaused = paused);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.profile;
    final mine = _enrollment?.userId == profile?.id ? _enrollment : null;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  '設定',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                ),
              ),
              IconButton(
                tooltip: '閉じる',
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'この端末の表示とログイン補助を管理します。',
            style: TextStyle(color: TnTokens.textMuted, fontSize: 13, height: 1.6),
          ),
          const SizedBox(height: 18),
          _SettingsCard(
            icon: Icons.face_retouching_natural_outlined,
            title: 'ログイン用の顔認証',
            subtitle: 'カメラで顔を登録し、ログイン時の本人確認に使います。パスワードの代わりにはなりません。',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (mine != null) ...[
                  Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.memory(
                          Uint8List.fromList(base64Decode(mine.descriptorBase64)),
                          width: 56,
                          height: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            width: 56,
                            height: 56,
                            color: TnTokens.bgTint,
                            child: const Icon(Icons.face),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(mine.displayName, style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text(
                              '登録済み',
                              style: TextStyle(color: TnTokens.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('顔認証でログインを使う'),
                    value: mine.enabled,
                    onChanged: _busy ? null : _toggleEnabled,
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _busy ? null : _enroll,
                          child: const Text('撮り直す'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _busy ? null : _remove,
                          child: const Text('登録を削除'),
                        ),
                      ),
                    ],
                  ),
                ] else
                  FilledButton.icon(
                    onPressed: _busy || profile == null ? null : _enroll,
                    icon: const Icon(Icons.face_retouching_natural),
                    label: Text(_busy ? '準備中…' : '顔認証を追加'),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _SettingsCard(
            icon: Icons.animation_outlined,
            title: '表示',
            subtitle: '動きのある演出を抑えたいときに使います。',
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('アニメーションを停止する'),
              value: _motionPaused,
              onChanged: _toggleMotion,
            ),
          ),
          const SizedBox(height: 12),
          _SettingsCard(
            icon: Icons.info_outline,
            title: 'このアプリ',
            subtitle: '接続と端末の状態です。',
            child: Column(
              children: [
                _MetaRow(label: 'コミュニティ', value: 'H-Village'),
                _MetaRow(label: 'ログイン中', value: profile?.name ?? '—'),
                _MetaRow(
                  label: 'データ',
                  value: auth.isSignedIn ? '共有クラウド' : '未ログイン',
                ),
              ],
            ),
          ),
          if (_notice != null) ...[
            const SizedBox(height: 14),
            Text(
              _notice!,
              style: const TextStyle(color: TnTokens.textMuted, fontSize: 13, height: 1.6),
            ),
          ],
        ],
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: TnTokens.bgSurface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: TnTokens.border),
        boxShadow: const [
          BoxShadow(color: Color(0x122B405E), blurRadius: 18, offset: Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: TnTokens.bgTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: TnTokens.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(color: TnTokens.textMuted, fontSize: 12, height: 1.55),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: TnTokens.textMuted, fontSize: 13)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
