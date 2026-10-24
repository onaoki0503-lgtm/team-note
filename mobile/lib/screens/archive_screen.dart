import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';

class ArchiveScreen extends StatelessWidget {
  const ArchiveScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _tile(
          context,
          icon: Icons.people_outline,
          color: TnTokens.accentBlue,
          title: '寮生名簿',
          subtitle: data.members.isEmpty ? '棟・部屋の一覧' : '${data.members.length}名が参加中',
          onTap: () => context.push('/roster'),
        ),
        _tile(
          context,
          icon: Icons.inventory_2_outlined,
          color: TnTokens.accentGold,
          title: '備品在庫',
          subtitle: data.inventory.isEmpty ? '台帳' : '${data.inventory.length}件',
          onTap: () => context.push('/inventory'),
        ),
        _tile(
          context,
          icon: Icons.folder_open_outlined,
          color: TnTokens.accentPurple,
          title: '年度別資料',
          subtitle: data.archives.isEmpty ? '資料' : '${data.archives.length}件',
          onTap: () => context.push('/archives'),
        ),
      ],
    );
  }

  Widget _tile(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: ListTile(
          leading: Icon(icon, color: color, size: 28),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      ),
    );
  }
}
