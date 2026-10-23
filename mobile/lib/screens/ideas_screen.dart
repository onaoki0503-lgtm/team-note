import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

class IdeasScreen extends StatefulWidget {
  const IdeasScreen({super.key});

  @override
  State<IdeasScreen> createState() => _IdeasScreenState();
}

class _IdeasScreenState extends State<IdeasScreen> {
  final _controller = TextEditingController();
  bool _posting = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.length < 4) return;
    setState(() => _posting = true);
    try {
      final auth = context.read<AuthProvider>();
      await context.read<AppDataProvider>().postIdea(text, auth);
      _controller.clear();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              final auth = context.read<AuthProvider>();
              await data.refreshIdeas(auth);
            },
            child: data.ideas.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 80),
                      const Icon(Icons.lightbulb_outline, size: 48, color: TnTokens.textMuted),
                      const SizedBox(height: 12),
                      const Center(child: Text('アイデアを投稿', style: TextStyle(color: TnTokens.textMuted))),
                      const SizedBox(height: 20),
                      Center(
                        child: FilledButton.tonalIcon(
                          onPressed: () => context.push('/proposal'),
                          icon: const Icon(Icons.add),
                          label: const Text('企画を作成'),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: data.ideas.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final idea = data.ideas[i];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 12, 8, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(idea.body, style: const TextStyle(height: 1.4)),
                              Row(
                                children: [
                                  if (idea.authorName.isNotEmpty)
                                    Text(idea.authorName, style: Theme.of(context).textTheme.bodySmall),
                                  const Spacer(),
                                  IconButton(
                                    onPressed: () => data.toggleLike(idea, context.read<AuthProvider>()),
                                    icon: Icon(
                                      idea.likedByMe ? Icons.favorite : Icons.favorite_border,
                                      color: idea.likedByMe ? TnTokens.accentOrange : TnTokens.textMuted,
                                      size: 20,
                                    ),
                                  ),
                                  Text('${idea.likes}', style: Theme.of(context).textTheme.bodySmall),
                                  const SizedBox(width: 8),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
        Material(
          elevation: 4,
          color: TnTokens.bgSurface,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      maxLength: 140,
                      decoration: const InputDecoration(
                        hintText: 'アイデアを入力',
                        counterText: '',
                        isDense: true,
                      ),
                      onSubmitted: (_) => _submit(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _posting ? null : _submit,
                    icon: _posting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
