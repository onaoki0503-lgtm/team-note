import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../config/environment.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

class AppHeader extends StatelessWidget {
  const AppHeader({super.key, this.showBack = false});

  final bool showBack;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final initial = auth.profile.name.isNotEmpty
        ? auth.profile.name.characters.first
        : 'T';

    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: TnTokens.bgSurface.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: TnTokens.border),
        boxShadow: TnTokens.cardShadow,
      ),
      child: Row(
        children: [
          if (showBack)
            IconButton(
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/');
                }
              },
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
              visualDensity: VisualDensity.compact,
            ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [Color(0xFFFFFFFF), Color(0xFFE5EEF8)],
              ),
              border: Border.all(color: Colors.white),
            ),
            child: const Icon(Icons.lightbulb_outline, color: TnTokens.primary),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'チームノート',
                  style: TextStyle(
                    fontSize: TnTokens.typeBrand,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.4,
                  ),
                ),
                Text(
                  Environment.demoMode
                      ? '${Environment.orgLabel} · デモ'
                      : Environment.orgLabel,
                  style: const TextStyle(
                    fontSize: 10,
                    color: TnTokens.textMuted,
                    letterSpacing: 0.04,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () => context.push('/profile'),
            customBorder: const CircleBorder(),
            child: CircleAvatar(
              radius: 20,
              backgroundColor: TnTokens.bgTint,
              foregroundColor: TnTokens.primary,
              backgroundImage: auth.profile.avatarUrl != null
                  ? NetworkImage(auth.profile.avatarUrl!)
                  : null,
              child: auth.profile.avatarUrl == null
                  ? Text(initial, style: const TextStyle(fontWeight: FontWeight.w700))
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}
