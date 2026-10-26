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
  final _focus = FocusNode();
  Timer? _draftTimer;
  bool _posting = false, _refreshing = false, _previewOpen = false;
  String? _error;
  String get _draftKey =>
      'tn_draft:${Environment.communityId}:${widget.userId}';
  @override
  void initState() {
    super.initState();
    _controller.addListener(_edited);
    _focus.addListener(_focusChanged);
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

  void _focusChanged() {
    if (mounted) setState(() {});
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
    _focus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_posting) return;
    final text = _controller.text.trim(),
        error = validateIdeaText(_controller.text);
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    setState(() {
      _posting = true;
      _error = null;
    });
    try {
      await widget.onPost(text);
      if (!mounted) return;
      _controller.clear();
      _draftTimer?.cancel();
      await _saveDraft(_draftKey, '');
      _focus.unfocus();
    } catch (_) {
      if (mounted) {
        setState(() => _error = '保存できませんでした。入力内容は残っています。もう一度お試しください。');
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      await widget.onRefresh();
    } catch (_) {
      if (mounted) setState(() => _error = '更新できませんでした。接続を確認してください。');
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  Future<void> _open(IdeaItem idea) async {
    _focus.unfocus();
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

  void _dismissKeyboard() {
    FocusManager.instance.primaryFocus?.unfocus();
    _focus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final length = _controller.text.runes.length;
    final keyboard =
        widget.keyboardVisible || MediaQuery.viewInsetsOf(context).bottom > 0;
    final focused = _focus.hasFocus || keyboard;
    final shown = widget.ideas.length.clamp(0, 12);
    return GestureDetector(
      onTap: _dismissKeyboard,
      behavior: HitTestBehavior.translucent,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 2, 8, 0),
        child: Column(
          children: [
            Expanded(
              child: focused
                  ? GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: _dismissKeyboard,
                      child: Center(
                        child: Text(
                          'タップして閉じる',
                          style: TextStyle(
                            fontSize: 13,
                            color: TnTokens.textMuted.withValues(alpha: .85),
                          ),
                        ),
                      ),
                    )
                  : IdeaCloudBoard(
                      ideas: widget.ideas,
                      loading: widget.loading && widget.ideas.isEmpty,
                      paused:
                          widget.motionPaused || !widget.active || _previewOpen,
                      onCreate: () => widget.onCreate(''),
                      onOpen: _open,
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Semantics(
                    label: 'いま表示中のアイデア $shown件、上限は12件',
                    child: Text(
                      '表示中 $shown / 上限12',
                      style: const TextStyle(
                        fontSize: 11,
                        color: TnTokens.textMuted,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _refreshing ? null : _refresh,
                    icon: _refreshing
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 1.5),
                          )
                        : const Icon(Icons.sync, size: 14),
                    label: Text(
                      widget.loading ? '更新中' : '更新',
                      style: const TextStyle(fontSize: 11),
                    ),
                    style: TextButton.styleFrom(
                      minimumSize: const Size(64, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      tapTargetSize: MaterialTapTargetSize.padded,
                    ),
                  ),
                ],
              ),
            ),
            GlassSurface(
              radius: 24,
              padding: const EdgeInsets.fromLTRB(14, 3, 4, 3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focus,
                      readOnly: _posting,
                      minLines: 1,
                      maxLines: 2,
                      textInputAction: TextInputAction.done,
                      onTapOutside: (_) => _dismissKeyboard(),
                      onSubmitted: (_) => _dismissKeyboard(),
                      decoration: const InputDecoration(
                        hintText: 'アイデアを入力',
                        labelText: null,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                        filled: false,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                      ),
                      style: const TextStyle(fontSize: 15, height: 1.4),
                    ),
                  ),
                  if (focused)
                    Semantics(
                      label: 'キーボードを閉じる',
                      button: true,
                      child: IconButton(
                        tooltip: '閉じる',
                        onPressed: _dismissKeyboard,
                        style: IconButton.styleFrom(
                          foregroundColor: TnTokens.textMuted,
                          minimumSize: const Size(44, 44),
                        ),
                        icon: const Icon(Icons.keyboard_hide_rounded, size: 20),
                      ),
                    ),
                  Semantics(
                    label: 'アイデアを投稿',
                    button: true,
                    child: IconButton.filled(
                      tooltip: 'アイデアを投稿',
                      onPressed:
                          !_posting &&
                              _controller.text.trim().isNotEmpty &&
                              length <= 140
                          ? _submit
                          : null,
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: .75),
                        foregroundColor: TnTokens.primary,
                        minimumSize: const Size(46, 46),
                      ),
                      icon: _posting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded, size: 19),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 5, 6, 4),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      '7日間反応がないと表示終了',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: TnTokens.textMuted),
                    ),
                  ),
                  Text(
                    '$length / 140',
                    style: TextStyle(
                      fontSize: 10,
                      color: length > 140
                          ? TnTokens.errorText
                          : TnTokens.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null || widget.error != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 4, 6, 4),
                child: Semantics(
                  liveRegion: true,
                  child: Text(
                    _error ?? '共有データを更新できませんでした。もう一度お試しください。',
                    style: const TextStyle(
                      fontSize: 12,
                      color: TnTokens.errorText,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
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
