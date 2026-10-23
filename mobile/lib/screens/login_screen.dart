import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

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
            const Row(
              children: [
                Expanded(child: Divider()),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('または', style: TextStyle(color: TnTokens.textMuted, fontSize: 12)),
                ),
                Expanded(child: Divider()),
              ],
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: auth.busy ? null : () => auth.signInWithGoogle(),
              icon: const Icon(Icons.g_mobiledata, size: 28),
              label: const Text('Googleで続ける'),
            ),
            if (Platform.isIOS) ...[
              const SizedBox(height: 10),
              SignInWithAppleButton(
                onPressed: auth.busy ? () {} : () => auth.signInWithApple(),
                style: SignInWithAppleButtonStyle.black,
                borderRadius: BorderRadius.circular(12),
              ),
            ],
            if (Environment.demoMode) ...[
              const SizedBox(height: 24),
              Text(
                'Supabase未設定のためデモのみ',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
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
