import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';

class InventoryScreen extends StatelessWidget {
  const InventoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = context.watch<AppDataProvider>().inventory;

    return Scaffold(
      appBar: AppBar(
        title: const Text('備品在庫'),
        actions: [
          IconButton(
            onPressed: () => context.read<AppDataProvider>().refreshInventory(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: items.isEmpty
          ? const Center(child: Text('備品がありません', style: TextStyle(color: TnTokens.textMuted)))
          : ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final item = items[i];
                return ListTile(
                  title: Text(item.name),
                  subtitle: Text([
                    if (item.location.isNotEmpty) item.location,
                    if (item.assetCode.isNotEmpty) item.assetCode,
                    item.status,
                  ].join(' · ')),
                  trailing: Text(
                    item.quantity == null ? '—' : '${item.quantity}${item.unit}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                );
              },
            ),
    );
  }
}
