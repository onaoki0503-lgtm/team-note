import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/app_prefs.dart';
import '../services/biometric_auth_service.dart';
import '../theme/tokens.dart';

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
  final _biometrics = BiometricAuthService();

  bool _motionPaused = false;
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  bool _hasCredentials = false;
  bool _busy = false;
  String _methodLabel = '生体認証';
  String? _notice;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final motion = await AppPrefs.readMotionPaused();
    final available = await _biometrics.isAvailable();
    final label = await _biometrics.methodLabel();
    final enabled = await auth.credentials.isEnabled();
    final hasPassword = await auth.credentials.hasStoredPassword();
    final email = await auth.credentials.peekEmail();

    if (!mounted) return;
    setState(() {
      _motionPaused = motion;
      _biometricAvailable = available;
      _methodLabel = label;
      _biometricEnabled = enabled && hasPassword;
      _hasCredentials = hasPassword && (email?.isNotEmpty ?? false);
    });
  }

  Future<void> _toggleBiometric(bool wantEnabled) async {
    final auth = context.read<AuthProvider>();
    final profileEmail = auth.user?.email?.trim() ?? '';

    setState(() {
      _busy = true;
      _notice = null;
      _error = null;
    });

    try {
      if (!wantEnabled) {
        await auth.credentials.setEnabled(false);
        if (!mounted) return;
        setState(() {
          _biometricEnabled = false;
          _notice = '$_methodLabel ログインをオフにしました。';
        });
        return;
      }

      if (!_biometricAvailable) {
        setState(() {
          _error = 'この端末では Face ID / 指紋認証を使えません。端末の設定を確認してください。';
        });
        return;
      }

      final confirmed = await _biometrics.authenticate(
        reason: '$_methodLabel ログインを有効にするため本人確認をします',
      );
      if (!confirmed) {
        setState(() => _error = '本人確認をキャンセルしました。');
        return;
      }

      if (await auth.credentials.hasStoredPassword()) {
        await auth.credentials.setEnabled(true);
        if (!mounted) return;
        setState(() {
          _biometricEnabled = true;
          _hasCredentials = true;
          _notice = '$_methodLabel ログインをオンにしました。';
        });
        return;
      }

      if (profileEmail.isEmpty) {
        setState(() {
          _error = '生体認証ログインはメールとパスワードで入ったアカウント向けです。一度メールでログインしてください。';
        });
        return;
      }

      final password = await _askPassword(profileEmail);
      if (password == null) {
        setState(() => _error = 'パスワードの入力をキャンセルしました。');
        return;
      }
      if (password.isEmpty) {
        setState(() => _error = 'パスワードを入力してください。');
        return;
      }

      // Verify password against Supabase before storing.
      await auth.signInEmail(profileEmail, password, saveCredentials: true);
      if (!mounted) return;
      if (auth.error != null) {
        setState(() => _error = auth.error);
        return;
      }

      setState(() {
        _biometricEnabled = true;
        _hasCredentials = true;
        _notice = '$_methodLabel ログインを登録しました。次回からログイン画面で使えます。';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _askPassword(String email) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('パスワードを確認'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '$email のパスワードを入力すると、端末の安全な領域に保存し、$_methodLabel でログインできます。顔写真は撮りません。',
              style: const TextStyle(fontSize: 13, height: 1.55, color: TnTokens.textMuted),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              obscureText: true,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'パスワード'),
              onSubmitted: (value) => Navigator.of(context).pop(value),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('キャンセル'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('保存する'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  Future<void> _clearCredentials() async {
    final auth = context.read<AuthProvider>();
    await auth.credentials.clearCredentials();
    if (!mounted) return;
    setState(() {
      _biometricEnabled = false;
      _hasCredentials = false;
      _notice = '保存したログイン情報を削除しました。';
      _error = null;
    });
  }

  Future<void> _toggleMotion(bool paused) async {
    await AppPrefs.writeMotionPaused(paused);
    if (!mounted) return;
    setState(() => _motionPaused = paused);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.profile;

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
            icon: Icons.fingerprint,
            title: 'ログイン用の生体認証',
            subtitle:
                '端末の $_methodLabel で本人確認し、保存したメールとパスワードでログインします。顔写真は撮りません。パスワードの代わりにはなりません。',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!_biometricAvailable)
                  const Text(
                    'この端末では Face ID / 指紋認証を使えません。端末の設定で有効にしてください。',
                    style: TextStyle(color: TnTokens.textMuted, fontSize: 13, height: 1.55),
                  )
                else ...[
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('$_methodLabel でログインを使う'),
                    subtitle: Text(
                      _hasCredentials
                          ? 'ログイン情報がこの端末に保存されています'
                          : 'オンにするとパスワードを一度確認して保存します',
                      style: const TextStyle(fontSize: 12, height: 1.4),
                    ),
                    value: _biometricEnabled,
                    onChanged: _busy ? null : _toggleBiometric,
                  ),
                  if (_hasCredentials)
                    OutlinedButton(
                      onPressed: _busy ? null : _clearCredentials,
                      child: const Text('保存したログイン情報を削除'),
                    ),
                ],
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
                const _MetaRow(label: 'コミュニティ', value: 'H-Village'),
                _MetaRow(label: 'ログイン中', value: profile?.name ?? '—'),
                _MetaRow(
                  label: 'データ',
                  value: auth.isSignedIn ? '共有クラウド' : '未ログイン',
                ),
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(
              _error!,
              style: const TextStyle(color: TnTokens.errorText, fontSize: 13, height: 1.6),
            ),
          ],
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
