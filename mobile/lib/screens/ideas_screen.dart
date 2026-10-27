import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/environment.dart';
import '../models/models.dart';
import '../providers/app_data_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/tokens.dart';
import '../widgets/home_scene.dart';

class IdeasScreen extends StatelessWidget {
  const IdeasScreen({
    super.key,
    this.motionPaused = false,
    this.active = true,
    this.keyboardVisible = false,
  });
  final bool motionPaused, active, keyboardVisible;
  @override
  Widget build(BuildContext context) {
    final data = context.watch<AppDataProvider>();
    final auth = context.watch<AuthProvider>();
    return IdeaHome(
      userId: auth.user?.id ?? auth.profile?.id ?? '',
      ideas: data.ideas,
      loading: data.loading,
      error: data.error,
      motionPaused: motionPaused,
      active: active,
      keyboardVisible: keyboardVisible,
      onPost: (text) => data.postIdea(text, auth),
      onLike: (idea) => data.toggleLike(idea, auth),
      onDelete: (idea) => data.deleteIdea(idea, auth),
      onRefresh: () => data.refreshIdeas(auth),
      onCreate: (seed) => context.push(
        seed.isEmpty
            ? '/proposal'
            : '/proposal?fromIdea=${Uri.encodeQueryComponent(seed)}',
      ),
    );
  }
}

/// Pure home UI: production supplies authenticated operations; tests use fixtures.
class IdeaHome extends StatefulWidget {
  const IdeaHome({
    super.key,
    required this.userId,
    required this.ideas,
    required this.onPost,
    required this.onLike,
    required this.onDelete,
    required this.onRefresh,
    required this.onCreate,
    this.loading = false,
    this.error,
    this.motionPaused = false,
    this.active = true,
    this.keyboardVisible = false,
  });
  final String userId;
  final List<IdeaItem> ideas;
  final Future<void> Function(String) onPost;
  final Future<void> Function(IdeaItem) onLike, onDelete;
  final Future<void> Function() onRefresh;
  final ValueChanged<String> onCreate;
  final bool loading, motionPaused, active, keyboardVisible;
  final String? error;
  @override
  State<IdeaHome> createState() => _IdeaHomeState();
}

class _IdeaHomeState extends State<IdeaHome> {
  final _controller = TextEditingController();
  Timer? _draftTimer;
  bool _previewOpen = false, _composerOpen = false;
  String? _error;
  String get _draftKey =>
      'tn_draft:${Environment.communityId}:${widget.userId}';
  @override
  void initState() {
    super.initState();
    _controller.addListener(_edited);
    _restore();
  }

  Future<void> _restore() async {
    final key = _draftKey;
    final prefs = await SharedPreferences.getInstance();
    if (!mounted || key != _draftKey || _controller.text.isNotEmpty) return;
    final draft = prefs.getString(key);
    if (draft != null) _controller.text = draft;
  }

  void _edited() {
    if (!mounted) return;
    setState(() => _error = null);
    _draftTimer?.cancel();
    final text = _controller.text, key = _draftKey;
    _draftTimer = Timer(
      const Duration(milliseconds: 400),
      () => _saveDraft(key, text),
    );
  }

  Future<void> _saveDraft(String key, String text) async {
    final p = await SharedPreferences.getInstance();
    if (text.isEmpty) {
      await p.remove(key);
    } else {
      await p.setString(key, text);
    }
  }

  @override
  void dispose() {
    _draftTimer?.cancel();
    unawaited(_saveDraft(_draftKey, _controller.text));
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit(String text) async {
    await widget.onPost(text);
    if (!mounted) return;
    _controller.clear();
    _draftTimer?.cancel();
    await _saveDraft(_draftKey, '');
  }

  Future<void> _compose() async {
    setState(() => _composerOpen = true);
    final action = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _IdeaComposer(
        initialText: _controller.text,
        onEdited: (text) {
          if (mounted) _controller.text = text;
        },
        onPost: _submit,
        onCreate: () => Navigator.pop(ctx, 'proposal'),
      ),
    );
    if (!mounted) return;
    setState(() => _composerOpen = false);
    if (action == 'proposal') widget.onCreate('');
  }

  Future<void> _open(IdeaItem idea) async {
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _previewOpen = true);
    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) => _IdeaDetail(
          idea: idea,
          own: idea.isMine(widget.userId),
          onLike: () => widget.onLike(idea),
          onDelete: () => widget.onDelete(idea),
          onCreate: () {
            Navigator.pop(ctx);
            widget.onCreate(idea.body);
          },
        ),
      );
    } finally {
      if (mounted) setState(() => _previewOpen = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).height < 500;
    final keyboard =
        widget.keyboardVisible || MediaQuery.viewInsetsOf(context).bottom > 0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!compact)
            const Padding(
              padding: EdgeInsets.only(top: 8, left: 2, bottom: 18),
              child: Text(
                'アイデア',
                style: TextStyle(fontSize: 16, color: TnTokens.textMuted),
              ),
            ),
          Expanded(
            child: keyboard
                ? const SizedBox.shrink()
                : IdeaCloudBoard(
                    ideas: widget.ideas,
                    loading: widget.loading && widget.ideas.isEmpty,
                    paused:
                        widget.motionPaused ||
                        !widget.active ||
                        _previewOpen ||
                        _composerOpen,
                    onCreate: () => widget.onCreate(''),
                    onOpen: _open,
                  ),
          ),
          Padding(
            padding: EdgeInsets.only(
              top: compact ? 6 : 22,
              bottom: compact ? 4 : 28,
            ),
            child: FilledButton(
              key: const ValueKey('idea-post-trigger'),
              onPressed: _compose,
              style: FilledButton.styleFrom(
                backgroundColor: TnTokens.primary,
                foregroundColor: Colors.white,
                minimumSize: Size(double.infinity, compact ? 44 : 58),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(27),
                ),
              ),
              child: const Text(
                'アイデアを投稿',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w500),
              ),
            ),
          ),
          if (_error != null || widget.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  _error ?? '共有データを更新できませんでした。',
                  style: const TextStyle(
                    fontSize: 12,
                    color: TnTokens.errorText,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _IdeaComposer extends StatefulWidget {
  const _IdeaComposer({
    required this.initialText,
    required this.onEdited,
    required this.onPost,
    required this.onCreate,
  });
  final String initialText;
  final ValueChanged<String> onEdited;
  final Future<void> Function(String) onPost;
  final VoidCallback onCreate;
  @override
  State<_IdeaComposer> createState() => _IdeaComposerState();
}

class _IdeaComposerState extends State<_IdeaComposer> {
  late final _controller = TextEditingController(text: widget.initialText);
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  bool _sending = false;
  String? _error;
  Future<void> _post() async {
    if (_sending) return;
    final error = validateIdeaText(_controller.text);
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.onPost(_controller.text.trim());
      if (mounted) Navigator.pop(context, 'posted');
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = '保存できませんでした。入力内容は残っています。もう一度お試しください。';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_sending,
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        12,
        12,
        12,
        MediaQuery.viewInsetsOf(context).bottom + 12,
      ),
      child: GlassSurface(
        radius: 30,
        padding: const EdgeInsets.all(22),
        child: SingleChildScrollView(
          child: ValueListenableBuilder(
            valueListenable: _controller,
            builder: (context, value, _) => Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'アイデアを投稿',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: '投稿欄を閉じる',
                      onPressed: _sending ? null : () => Navigator.pop(context),
                      icon: const Icon(Icons.close, size: 21),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _controller,
                  onChanged: widget.onEdited,
                  autofocus: true,
                  readOnly: _sending,
                  minLines: 3,
                  maxLines: 5,
                  decoration: const InputDecoration(hintText: 'アイデアを入力'),
                  style: const TextStyle(fontSize: 16, height: 1.7),
                ),
                const SizedBox(height: 8),
                Text(
                  '${value.text.runes.length} / 140',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontSize: 11,
                    color: TnTokens.textMuted,
                  ),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: TnTokens.errorText,
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed:
                      _sending ||
                          value.text.trim().isEmpty ||
                          value.text.runes.length > 140
                      ? null
                      : _post,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(27),
                    ),
                  ),
                  child: Text(_sending ? '投稿中…' : '投稿する'),
                ),
                TextButton(
                  onPressed: _sending ? null : widget.onCreate,
                  child: const Text('企画を作成'),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class _IdeaDetail extends StatefulWidget {
  const _IdeaDetail({
    required this.idea,
    required this.own,
    required this.onLike,
    required this.onDelete,
    required this.onCreate,
  });
  final IdeaItem idea;
  final bool own;
  final Future<void> Function() onLike, onDelete;
  final VoidCallback onCreate;
  @override
  State<_IdeaDetail> createState() => _IdeaDetailState();
}

class _IdeaDetailState extends State<_IdeaDetail> {
  bool _busy = false;
  String? _error;
  Future<void> _perform(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '反映できませんでした。もう一度お試しください。';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      child: GlassSurface(
        radius: 28,
        padding: const EdgeInsets.all(20),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .72,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.idea.authorName.isEmpty
                            ? 'アイデア'
                            : widget.idea.authorName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: TnTokens.textMuted,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'アイデアの詳細を閉じる',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, size: 20),
                    ),
                  ],
                ),
                Text(
                  widget.idea.body,
                  style: const TextStyle(fontSize: 18, height: 1.6),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(100, 48),
                      ),
                      onPressed: _busy ? null : () => _perform(widget.onLike),
                      icon: Icon(
                        widget.idea.likedByMe
                            ? Icons.favorite
                            : Icons.favorite_border,
                        size: 18,
                      ),
                      label: Text('いいね ${widget.idea.likes}件'),
                    ),
                    const Spacer(),
                    if (widget.own)
                      IconButton(
                        tooltip: 'アイデアを削除',
                        onPressed: _busy
                            ? null
                            : () async {
                                final ok = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('このアイデアを削除しますか'),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, false),
                                        child: const Text('閉じる'),
                                      ),
                                      FilledButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, true),
                                        child: const Text('削除する'),
                                      ),
                                    ],
                                  ),
                                );
                                if (ok == true) await _perform(widget.onDelete);
                              },
                        icon: const Icon(Icons.delete_outline, size: 20),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _busy ? null : widget.onCreate,
                  icon: const Icon(Icons.arrow_forward, size: 18),
                  label: const Text('企画にする'),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: TnTokens.errorText),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
