import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../config/environment.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import '../widgets/tn_card.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _register = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    if (_register) {
      await auth.signUp(_email.text, _password.text);
    } else {
      await auth.signIn(_email.text, _password.text);
    }
    if (!mounted) return;
    if (auth.isSignedIn && auth.error == null) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: TnTokens.maxContent),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const SizedBox(height: 40),
                const Icon(Icons.lightbulb_outline, size: 48, color: TnTokens.primary),
                const SizedBox(height: 12),
                Text(
                  'チームノート',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  Environment.demoMode ? 'デモで続行可' : Environment.orgLabel,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 28),
                TnCard(
                  child: Column(
                    children: [
                      TextField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: const InputDecoration(labelText: 'メール'),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _password,
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'パスワード'),
                      ),
                      if (auth.error != null) ...[
                        const SizedBox(height: 12),
                        Text(auth.error!, style: const TextStyle(color: TnTokens.errorText)),
                      ],
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: auth.busy ? null : _submit,
                        child: Text(auth.busy ? '…' : (_register ? '登録' : 'ログイン')),
                      ),
                      TextButton(
                        onPressed: () => setState(() => _register = !_register),
                        child: Text(_register ? 'ログインへ' : '新規登録'),
                      ),
                      if (Environment.demoMode)
                        TextButton(
                          onPressed: () async {
                            await auth.signIn('', '');
                            if (context.mounted) context.go('/');
                          },
                          child: const Text('デモで入る'),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
