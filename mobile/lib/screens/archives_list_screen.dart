import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';

class ArchivesListScreen extends StatelessWidget {
  const ArchivesListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final docs = context.watch<AppDataProvider>().archives;

    return Scaffold(
      appBar: AppBar(
        title: const Text('年度別資料'),
        actions: [
          IconButton(
            onPressed: () => context.read<AppDataProvider>().refreshArchives(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: docs.isEmpty
          ? const Center(child: Text('資料がありません', style: TextStyle(color: TnTokens.textMuted)))
          : ListView.separated(
              itemCount: docs.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final d = docs[i];
                return ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: Text(d.title),
                  subtitle: Text(d.category),
                );
              },
            ),
    );
  }
}
