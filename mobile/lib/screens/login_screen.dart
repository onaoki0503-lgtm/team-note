import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../config/environment.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signup = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
          children: [
            const Icon(Icons.lightbulb, size: 44, color: TnTokens.primary),
            const SizedBox(height: 12),
            Text(
              _signup ? 'アカウント作成' : 'ログイン',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(Environment.orgLabel, style: Theme.of(context).textTheme.bodySmall),
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
              obscureText: true,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(labelText: 'パスワード'),
              onSubmitted: (_) => _submit(auth),
            ),
            if (auth.error != null) ...[
              const SizedBox(height: 12),
              Text(auth.error!, style: const TextStyle(color: TnTokens.errorText)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: auth.busy ? null : () => _submit(auth),
              child: Text(auth.busy ? '確認中…' : (_signup ? 'アカウントを作成' : 'ログイン')),
            ),
            TextButton(
              onPressed: auth.busy
                  ? null
                  : () => setState(() {
                        _signup = !_signup;
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
            OutlinedButton(
              onPressed: auth.busy ? null : () => auth.signInWithGoogle(),
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
              '同じメールなら、メール登録後にGoogleでも入れます（確認メール完了後）。',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: TnTokens.textMuted),
            ),
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
    if (_signup) {
      await auth.signUpEmail(_email.text, _password.text);
    } else {
      await auth.signInEmail(_email.text, _password.text);
    }
  }
}
