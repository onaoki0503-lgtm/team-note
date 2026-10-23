import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/app_data_provider.dart';
import '../theme/tokens.dart';
import '../widgets/tn_card.dart';

class IdeasScreen extends StatefulWidget {
  const IdeasScreen({super.key});

  @override
  State<IdeasScreen> createState() => _IdeasScreenState();
}

class _IdeasScreenState extends State<IdeasScreen> {
  final _controller = TextEditingController();
  bool _posting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppDataProvider>().loadIdeas();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    setState(() => _posting = true);
    try {
      await context.read<AppDataProvider>().postIdea(text);
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
    final count = data.ideas.length;

    return Column(
      children: [
        Expanded(
          child: Stack(
            children: [
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        TnTokens.bgMain,
                        TnTokens.bgTint.withValues(alpha: 0.35),
                        TnTokens.bgMain,
                      ],
                    ),
                  ),
                ),
              ),
              if (data.ideas.isEmpty)
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FilledButton.icon(
                        onPressed: () => context.push('/proposal'),
                        icon: const Icon(Icons.add),
                        label: const Text('企画を作成'),
                      ),
                      const SizedBox(height: 12),
                      Text('$count / 12件', style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                )
              else
                ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: data.ideas.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    if (i == 0) {
                      return Row(
                        children: [
                          Text('$count / 12', style: Theme.of(context).textTheme.bodySmall),
                          const Spacer(),
                          TextButton.icon(
                            onPressed: () => context.push('/proposal'),
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('企画'),
                          ),
                        ],
                      );
                    }
                    final idea = data.ideas[i - 1];
                    return TnCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(idea.body, maxLines: 4, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              IconButton(
                                onPressed: () => data.toggleLike(idea),
                                icon: Icon(
                                  idea.likedByMe ? Icons.favorite : Icons.favorite_border,
                                  color: idea.likedByMe ? TnTokens.accentOrange : TnTokens.textMuted,
                                  size: 20,
                                ),
                                visualDensity: VisualDensity.compact,
                              ),
                              Text('${idea.likes}', style: Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  maxLength: 140,
                  decoration: const InputDecoration(
                    hintText: 'アイデアを入力',
                    counterText: '',
                  ),
                  onSubmitted: (_) => _submit(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _posting ? null : _submit,
                style: FilledButton.styleFrom(
                  shape: const CircleBorder(),
                  minimumSize: const Size(48, 48),
                  padding: EdgeInsets.zero,
                ),
                child: _posting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send_rounded, size: 20),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Row(
            children: [
              Text('7日無反応で非表示', style: Theme.of(context).textTheme.bodySmall),
              const Spacer(),
              ValueListenableBuilder(
                valueListenable: _controller,
                builder: (_, value, _) => Text(
                  '${value.text.characters.length} / 140',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
