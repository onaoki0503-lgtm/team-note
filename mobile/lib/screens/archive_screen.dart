import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import '../widgets/tn_card.dart';

class ArchiveScreen extends StatelessWidget {
  const ArchiveScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.people_outline, TnTokens.accentBlue, '寮生名簿', '名簿を管理'),
      (Icons.inventory_2_outlined, TnTokens.accentGold, '備品在庫', '台帳・CSV'),
      (Icons.folder_open_outlined, TnTokens.accentPurple, '年度別資料', '過去資料'),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        Text('保管する', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TnCard(
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${item.$3} — 次フェーズで接続')),
                );
              },
              child: Row(
                children: [
                  Icon(item.$1, color: item.$2, size: 28),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.$3, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 2),
                        Text(item.$4, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: TnTokens.textMuted),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
