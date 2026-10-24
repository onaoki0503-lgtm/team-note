import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';

/// Ideas board — mirrors web IdeaBubbleLayer (short free-text notes, not 企画書).
class IdeasScreen extends StatefulWidget {
  const IdeasScreen({super.key});

  @override
  State<IdeasScreen> createState() => _IdeasScreenState();
}

class _IdeasScreenState extends State<IdeasScreen> {
  final _controller = TextEditingController();
  bool _posting = false;
  String? _composeError;
  String? _draftKey;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (_composeError != null) setState(() => _composeError = null);
      setState(() {});
      _persistDraft();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _restoreDraft());
  }

  Future<void> _restoreDraft() async {
    final uid = context.read<AuthProvider>().user?.id;
    if (uid == null) return;
    _draftKey = 'tn_draft:${Environment.communityId}:$uid';
    final prefs = await SharedPreferences.getInstance();
    final draft = prefs.getString(_draftKey!);
    if (draft != null && draft.isNotEmpty && mounted && _controller.text.isEmpty) {
      _controller.text = draft;
      setState(() {});
    }
  }

  Future<void> _persistDraft() async {
    final key = _draftKey;
    if (key == null) return;
    final prefs = await SharedPreferences.getInstance();
    final t = _controller.text;
    if (t.isEmpty) {
      await prefs.remove(key);
    } else {
      await prefs.setString(key, t);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  int get _length => _controller.text.trim().runes.length;

  Future<void> _submit() async {
    final text = _controller.text.trim();
    final err = validateIdeaText(text);
    if (err != null) {
      setState(() => _composeError = err);
      return;
    }
    setState(() {
      _posting = true;
      _composeError = null;
    });
    try {
      final auth = context.read<AuthProvider>();
      await context.read<AppDataProvider>().postIdea(text, auth);
      _controller.clear();
      await _persistDraft();
    } catch (e) {
      if (mounted) {
        setState(() => _composeError = '$e'.replaceFirst(RegExp(r'^Bad state: '), ''));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _openIdea(IdeaItem idea) async {
    final auth = context.read<AuthProvider>();
    final data = context.read<AppDataProvider>();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 8,
            bottom: MediaQuery.paddingOf(ctx).bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                idea.authorName.isEmpty ? 'アイデア' : idea.authorName,
                style: Theme.of(ctx).textTheme.titleSmall?.copyWith(color: TnTokens.textMuted),
              ),
              const SizedBox(height: 10),
              Text(idea.body, style: const TextStyle(fontSize: 17, height: 1.45)),
              const SizedBox(height: 20),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: () async {
                      await data.toggleLike(idea, auth);
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    icon: Icon(
                      idea.likedByMe ? Icons.favorite : Icons.favorite_border,
                      color: idea.likedByMe ? TnTokens.accentOrange : null,
                      size: 18,
                    ),
                    label: Text('${idea.likes}'),
                  ),
                  const SizedBox(width: 8),
                  if (idea.isMine(auth.user?.id))
                    OutlinedButton.icon(
                      onPressed: () async {
                        final ok = await showDialog<bool>(
                          context: ctx,
                          builder: (d) => AlertDialog(
                            title: const Text('このアイデアを削除しますか'),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(d, false), child: const Text('閉じる')),
                              FilledButton(
                                onPressed: () => Navigator.pop(d, true),
                                child: const Text('削除する'),
                              ),
                            ],
                          ),
                        );
                        if (ok == true) {
                          await data.deleteIdea(idea, auth);
                          if (ctx.mounted) Navigator.pop(ctx);
                        }
                      },
                      icon: const Icon(Icons.delete_outline, size: 18),
                      label: const Text('削除'),
                    ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      final q = Uri.encodeQueryComponent(idea.body);
                      context.push('/proposal?fromIdea=$q');
                    },
                    icon: const Icon(Icons.arrow_forward, size: 18),
                    label: const Text('企画にする'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final auth = context.watch<AuthProvider>();
    final canSend = !_posting && validateIdeaText(_controller.text) == null;

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => data.refreshIdeas(auth),
            child: data.ideas.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
                    children: [
                      const Icon(Icons.chat_bubble_outline, size: 44, color: TnTokens.textMuted),
                      const SizedBox(height: 12),
                      Text(
                        'みんなの短いアイデア',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'ここはWebと同じ「つぶやきボード」です。4〜140文字の一文を投稿します。'
                        '企画書（タイトル・目的・予算など）は下の「企画にする」や企画タブから作ります。',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: TnTokens.textMuted, height: 1.45),
                      ),
                    ],
                  )
                : GridView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                    gridDelegate: const SpacedBubbleDelegate(),
                    itemCount: data.ideas.length.clamp(0, 12),
                    itemBuilder: (context, i) {
                      final idea = data.ideas[i];
                      return _IdeaChip(
                        idea: idea,
                        onTap: () => _openIdea(idea),
                        onLike: () => data.toggleLike(idea, auth),
                      );
                    },
                  ),
          ),
        ),
        Material(
          elevation: 6,
          color: TnTokens.bgSurface,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          minLines: 1,
                          maxLines: 4,
                          maxLength: 140,
                          textInputAction: TextInputAction.newline,
                          decoration: InputDecoration(
                            hintText: 'アイデアを入力',
                            counterText: '',
                            errorText: _composeError,
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: canSend ? _submit : null,
                        tooltip: 'アイデアを投稿',
                        icon: _posting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.send_rounded, size: 20),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Flexible(
                        child: Text(
                          '7日間反応がないと表示終了',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: TnTokens.textMuted, height: 1.2),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '$_length / 140',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.2,
                          color: _length > 140 ? TnTokens.errorText : TnTokens.textMuted,
                        ),
                      ),
                    ],
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

class _IdeaChip extends StatelessWidget {
  const _IdeaChip({required this.idea, required this.onTap, required this.onLike});

  final IdeaItem idea;
  final VoidCallback onTap;
  final VoidCallback onLike;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TnTokens.bgTint,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 10, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  idea.body,
                  maxLines: 5,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(height: 1.35, fontSize: 14),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      idea.authorName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: onLike,
                    icon: Icon(
                      idea.likedByMe ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: idea.likedByMe ? TnTokens.accentOrange : TnTokens.textMuted,
                    ),
                  ),
                  Text('${idea.likes}', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 2-column bubble-ish grid (native stand-in for web IdeaBubbleLayer).
class SpacedBubbleDelegate extends SliverGridDelegateWithFixedCrossAxisCount {
  const SpacedBubbleDelegate()
      : super(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 0.95,
        );
}
