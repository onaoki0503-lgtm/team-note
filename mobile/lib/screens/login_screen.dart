import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/environment.dart';
import '../providers/auth_provider.dart';
import '../services/biometric_auth_service.dart';
import '../theme/tokens.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _biometrics = BiometricAuthService();

  bool _signup = false;
  bool _obscurePassword = true;
  bool _biometricAvailable = false;
  bool _appleAvailable = false;
  bool _attemptingBiometric = false;
  bool _canBiometricUnlock = false;
  String _biometricLabel = '生体認証';
  String? _notice;
  bool _bootstrapped = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    if (_bootstrapped) return;
    _bootstrapped = true;

    final auth = context.read<AuthProvider>();
    final available = await _biometrics.isAvailable();
    final label = await _biometrics.methodLabel();
    final appleOk = defaultTargetPlatform == TargetPlatform.iOS &&
        await SignInWithApple.isAvailable();
    final enabled = await auth.credentials.isEnabled();
    final savedEmail = await auth.credentials.peekEmail();
    final session = Environment.isConfigured
        ? Supabase.instance.client.auth.currentSession
        : null;
    final locked = auth.gate == AuthGate.locked ||
        (session != null && enabled) ||
        auth.biometricLocked;
    final passwordFallback = await auth.credentials.getPasswordCredentials();

    if (!mounted) return;
    setState(() {
      _biometricAvailable = available;
      _appleAvailable = appleOk;
      _biometricLabel = label;
      _canBiometricUnlock =
          available && enabled && (locked || session != null || passwordFallback != null);
      if (savedEmail != null && savedEmail.isNotEmpty) {
        _email.text = savedEmail;
      } else if (session?.user.email != null) {
        _email.text = session!.user.email!;
      }
    });

    if (_canBiometricUnlock && !_signup) {
      await Future<void>.delayed(const Duration(milliseconds: 450));
      if (mounted) await _authenticateWithBiometric();
    }
  }

  Future<void> _authenticateWithBiometric() async {
    if (_attemptingBiometric || _signup) return;
    final auth = context.read<AuthProvider>();
    if (auth.busy) return;

    setState(() {
      _attemptingBiometric = true;
      _notice = null;
    });
    try {
      final ok = await _biometrics.authenticate(
        reason: '$_biometricLabel でチームノートを開きます',
      );
      if (!ok || !mounted) {
        setState(() {
          _notice = '$_biometricLabel をキャンセルしました。パスワードでログインできます。';
        });
        return;
      }

      final session = Environment.isConfigured
          ? Supabase.instance.client.auth.currentSession
          : null;

      if (session != null) {
        await auth.unlockWithBiometric();
        return;
      }

      // Legacy / full sign-out fallback: replay stored email password.
      if (await auth.credentials.hasStoredPassword()) {
        await auth.signInWithStoredPassword();
        if (auth.error != null && mounted) {
          setState(() {
            _canBiometricUnlock = false;
            _notice = '保存したパスワードでは入れませんでした。パスワードを入力してください。';
          });
        }
        return;
      }

      if (mounted) {
        setState(() {
          _canBiometricUnlock = false;
          _notice = 'セッションが切れています。パスワード・Google・Appleでログインしてください。';
        });
      }
    } finally {
      if (mounted) setState(() => _attemptingBiometric = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final unlockMode = auth.gate == AuthGate.locked || auth.biometricLocked;
    final showBiometric = !_signup && _canBiometricUnlock && _biometricAvailable;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          children: [
            const Icon(Icons.lightbulb, size: 44, color: TnTokens.primary),
            const SizedBox(height: 12),
            Text(
              unlockMode
                  ? 'ロック中'
                  : (_signup ? 'アカウント作成' : 'ログイン'),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              unlockMode
                  ? '$_biometricLabel で本人確認すると続けられます。'
                  : Environment.orgLabel,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (showBiometric) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: TnTokens.bgTint,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: TnTokens.border),
                ),
                child: Row(
                  children: [
                    Icon(
                      _biometricLabel == 'Face ID'
                          ? Icons.face_retouching_natural
                          : Icons.fingerprint,
                      color: TnTokens.primary,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        unlockMode
                            ? 'おかえりなさい。$_biometricLabel でロックを解除できます。'
                            : 'おかえりなさい。$_biometricLabel で素早くログインできます。',
                        style: const TextStyle(fontSize: 13, height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (!unlockMode) ...[
              const SizedBox(height: 28),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'メールアドレス'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                decoration: InputDecoration(
                  labelText: 'パスワード',
                  suffixIcon: IconButton(
                    tooltip: _obscurePassword ? '表示' : '隠す',
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  ),
                ),
                onSubmitted: (_) => _submit(auth),
              ),
            ],
            if (auth.error != null) ...[
              const SizedBox(height: 12),
              Text(auth.error!, style: const TextStyle(color: TnTokens.errorText)),
            ],
            if (_notice != null) ...[
              const SizedBox(height: 12),
              Text(_notice!, style: const TextStyle(color: TnTokens.textMuted, height: 1.5)),
            ],
            const SizedBox(height: 20),
            if (showBiometric)
              FilledButton.icon(
                onPressed: (auth.busy || _attemptingBiometric)
                    ? null
                    : _authenticateWithBiometric,
                icon: Icon(
                  _biometricLabel == 'Face ID'
                      ? Icons.face_retouching_natural
                      : Icons.fingerprint,
                ),
                label: Text(
                  (auth.busy || _attemptingBiometric)
                      ? '確認中…'
                      : (unlockMode ? '$_biometricLabel で解除' : '$_biometricLabel でログイン'),
                ),
              ),
            if (!unlockMode) ...[
              if (showBiometric) const SizedBox(height: 10),
              FilledButton(
                onPressed: (auth.busy || _attemptingBiometric) ? null : () => _submit(auth),
                style: showBiometric
                    ? FilledButton.styleFrom(
                        backgroundColor: TnTokens.bgTint,
                        foregroundColor: TnTokens.textMain,
                      )
                    : null,
                child: Text(
                  (auth.busy || _attemptingBiometric)
                      ? '確認中…'
                      : (_signup ? 'アカウントを作成' : (showBiometric ? 'パスワードでログイン' : 'ログイン')),
                ),
              ),
              TextButton(
                onPressed: (auth.busy || _attemptingBiometric)
                    ? null
                    : () => setState(() {
                          _signup = !_signup;
                          _notice = null;
                        }),
                child: Text(_signup ? 'ログインに戻る' : '初めての方はアカウントを作成'),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('または', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                ],
              ),
              const SizedBox(height: 16),
              if (_appleAvailable) ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: Opacity(
                    opacity: (auth.busy || _attemptingBiometric) ? 0.5 : 1,
                    child: IgnorePointer(
                      ignoring: auth.busy || _attemptingBiometric,
                      child: SignInWithAppleButton(
                        onPressed: () => auth.signInWithApple(),
                        text: 'Appleで続ける',
                        height: 48,
                        borderRadius: const BorderRadius.all(Radius.circular(12)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              OutlinedButton(
                onPressed: (auth.busy || _attemptingBiometric) ? null : () => auth.signInWithGoogle(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.network(
                      'https://developers.google.com/identity/images/g-logo.png',
                      height: 20,
                      width: 20,
                      errorBuilder: (_, _, _) => const Icon(Icons.g_mobiledata, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Googleで続ける',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.grey.shade800),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '同じメールなら、確認メール完了後にGoogleやAppleでも入れます。',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: TnTokens.textMuted),
              ),
            ] else ...[
              const SizedBox(height: 12),
              TextButton(
                onPressed: (auth.busy || _attemptingBiometric)
                    ? null
                    : () async {
                        await auth.signOut(fullSignOut: true);
                      },
                child: const Text('別のアカウントでログイン'),
              ),
            ],
            if (!Environment.isConfigured) ...[
              const SizedBox(height: 24),
              Text(
                '接続設定がありません。ビルドに SUPABASE_URL / ANON_KEY が必要です。',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: TnTokens.errorText),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _submit(AuthProvider auth) async {
    setState(() => _notice = null);
    if (_signup) {
      await auth.signUpEmail(_email.text, _password.text);
    } else {
      final enableBio = await auth.credentials.isEnabled();
      await auth.signInEmail(
        _email.text,
        _password.text,
        enableBiometricAfter: enableBio,
      );
      if (mounted && auth.error == null && auth.isSignedIn) {
        setState(() => _canBiometricUnlock = _biometricAvailable);
      }
    }
  }
}
