import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/tokens.dart';

class TeamNoteHeader extends StatelessWidget {
  const TeamNoteHeader({
    super.key,
    required this.name,
    this.avatar,
    required this.onProfile,
  });
  final String name;
  final String? avatar;
  final VoidCallback onProfile;
  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).height < 500;
    return Padding(
      padding: EdgeInsets.fromLTRB(22, compact ? 4 : 16, 22, compact ? 4 : 20),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'チームノート',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 23,
                fontWeight: FontWeight.w700,
                letterSpacing: .4,
                color: TnTokens.textMain,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Semantics(
            button: true,
            label: 'プロフィール',
            child: ExcludeSemantics(
              child: Material(
                color: Colors.white,
                shape: const CircleBorder(
                  side: BorderSide(color: Color(0xFFDCE5F7)),
                ),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onProfile,
                  child: SizedBox(
                    width: 44,
                    height: 44,
                    child: ClipOval(
                      child: avatar != null && avatar!.isNotEmpty
                          ? Image.network(
                              avatar!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => _initial,
                            )
                          : _initial,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget get _initial => Center(
    child: Text(
      name.isEmpty ? '?' : name.characters.first,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: TnTokens.primary,
      ),
    ),
  );
}

class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.radius = 26,
    this.padding = EdgeInsets.zero,
  });
  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      boxShadow: [
        BoxShadow(
          color: TnTokens.primary.withValues(alpha: .065),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ],
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ui.ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xECFFFFFF), Color(0xBDFFFFFF)],
            ),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: Colors.white, width: 1.2),
          ),
          child: Padding(padding: padding, child: child),
        ),
      ),
    ),
  );
}

class GlassBackdrop extends StatefulWidget {
  const GlassBackdrop({super.key, required this.child, this.animate = true});
  final Widget child;
  final bool animate;
  @override
  State<GlassBackdrop> createState() => _GlassBackdropState();
}

class _GlassBackdropState extends State<GlassBackdrop>
    with SingleTickerProviderStateMixin {
  late final _motion = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 24),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sync();
  }

  @override
  void didUpdateWidget(covariant GlassBackdrop oldWidget) {
    super.didUpdateWidget(oldWidget);
    _sync();
  }

  void _sync() {
    if (widget.animate &&
        !MediaQuery.disableAnimationsOf(context) &&
        TickerMode.valuesOf(context).enabled) {
      if (!_motion.isAnimating) _motion.repeat(reverse: true);
    } else {
      _motion.stop();
    }
  }

  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: const Color(0xFFFBFDFF),
    child: Stack(
      children: [
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _motion,
              builder: (context, _) => Stack(
                fit: StackFit.expand,
                children: [
                  CustomPaint(painter: _AtmospherePainter(_motion.value)),
                ],
              ),
            ),
          ),
        ),
        widget.child,
      ],
    ),
  );
}

class _AtmospherePainter extends CustomPainter {
  _AtmospherePainter(this.phase);
  final double phase;
  @override
  void paint(Canvas canvas, Size size) {
    for (final (point, color, radius) in <(Offset, Color, double)>[
      (
        Offset(size.width * (.05 + phase * .08), size.height * .08),
        const Color(0xAADCEAFF),
        size.width * .85,
      ),
      (
        Offset(size.width * (1 - phase * .06), size.height * .48),
        const Color(0x70E9EFFF),
        size.width * .8,
      ),
      (
        Offset(size.width * .45, size.height * (1 - phase * .04)),
        const Color(0x90F8FAFF),
        size.width * .9,
      ),
    ]) {
      canvas.drawCircle(
        point,
        radius,
        Paint()
          ..shader = RadialGradient(
            colors: [color, color.withValues(alpha: 0)],
          ).createShader(Rect.fromCircle(center: point, radius: radius)),
      );
    }
  }

  @override
  bool shouldRepaint(_AtmospherePainter oldDelegate) =>
      phase != oldDelegate.phase;
}

/// Full history, reversed for a natural latest-at-bottom conversation.
class IdeaTimeline extends StatefulWidget {
  const IdeaTimeline({
    super.key,
    required this.ideas,
    required this.userId,
    required this.onOpen,
    this.loading = false,
  });
  final List<IdeaItem> ideas;
  final String userId;
  final ValueChanged<IdeaItem> onOpen;
  final bool loading;
  @override
  State<IdeaTimeline> createState() => _IdeaTimelineState();
}

class _IdeaTimelineState extends State<IdeaTimeline> {
  final _scroll = ScrollController();
  int _unread = 0;
  Set<String> _ids = {};
  bool _initialized = false;
  @override
  void initState() {
    super.initState();
    _ids = widget.ideas.map((idea) => idea.id).toSet();
    _initialized = _ids.isNotEmpty;
    _scroll.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scroll.hasClients && _scroll.offset < 64 && _unread > 0) {
      setState(() => _unread = 0);
    }
  }

  @override
  void didUpdateWidget(covariant IdeaTimeline oldWidget) {
    super.didUpdateWidget(oldWidget);
    final added = widget.ideas
        .where((idea) => !_ids.contains(idea.id))
        .toList();
    final wasPinned = !_scroll.hasClients || _scroll.offset < 64;
    final oldOffset = _scroll.hasClients ? _scroll.offset : 0.0;
    final oldMax = _scroll.hasClients ? _scroll.position.maxScrollExtent : 0.0;
    if (added.isNotEmpty) {
      final follow =
          !_initialized ||
          wasPinned ||
          added.any((idea) => idea.isMine(widget.userId));
      if (!follow) _unread += added.length;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_scroll.hasClients) return;
        if (follow) {
          _scroll.jumpTo(0);
          if (_unread > 0) setState(() => _unread = 0);
        } else {
          _scroll.jumpTo(
            (oldOffset + _scroll.position.maxScrollExtent - oldMax).clamp(
              0.0,
              _scroll.position.maxScrollExtent,
            ),
          );
        }
      });
    }
    _ids = widget.ideas.map((idea) => idea.id).toSet();
    _initialized = _initialized || _ids.isNotEmpty;
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading && widget.ideas.isEmpty) {
      return const IdeaTimelineSkeleton();
    }
    final indexed = widget.ideas.indexed.toList()
      ..sort((a, b) {
        final order = a.$2.createdAt.compareTo(b.$2.createdAt);
        return order == 0 ? a.$1.compareTo(b.$1) : order;
      });
    final ideas = indexed.map((e) => e.$2).toList().reversed.toList();
    String day(IdeaItem idea) {
      final d = idea.createdAt.toLocal();
      return '${d.year}年${d.month}月${d.day}日';
    }

    return Stack(
      children: [
        if (ideas.isEmpty)
          const Center(
            child: Text(
              'まだアイデアはありません',
              style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
            ),
          ),
        Scrollbar(
          controller: _scroll,
          child: ListView.builder(
            key: const PageStorageKey('idea-history'),
            controller: _scroll,
            reverse: true,
            padding: const EdgeInsets.fromLTRB(0, 8, 0, 16),
            itemCount: ideas.length,
            findChildIndexCallback: (key) {
              final index = ideas.indexWhere(
                (idea) => ValueKey(idea.id) == key,
              );
              return index < 0 ? null : index;
            },
            itemBuilder: (context, index) {
              final idea = ideas[index],
                  own = ideas[index].isMine(widget.userId);
              final date = idea.createdAt.toLocal();
              final time =
                  '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
              final divider =
                  index == ideas.length - 1 ||
                  day(idea) != day(ideas[index + 1]);
              final radius = BorderRadius.only(
                topLeft: Radius.circular(own ? 21 : 4),
                topRight: Radius.circular(own ? 4 : 21),
                bottomLeft: const Radius.circular(21),
                bottomRight: const Radius.circular(21),
              );
              return Column(
                key: ValueKey(idea.id),
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (divider)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: const Color(0xB8E7EDFA),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 5,
                            ),
                            child: Text(
                              day(idea),
                              style: const TextStyle(
                                fontSize: 10,
                                color: TnTokens.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: own
                          ? MainAxisAlignment.end
                          : MainAxisAlignment.start,
                      children: [
                        if (!own) ...[
                          Padding(
                            padding: const EdgeInsets.only(top: 20),
                            child: CircleAvatar(
                              radius: 15,
                              backgroundColor: Colors.white,
                              child: Text(
                                idea.authorName.isEmpty
                                    ? '寮'
                                    : idea.authorName.characters.first,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: TnTokens.textMuted,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Flexible(
                          child: FractionallySizedBox(
                            widthFactor: .88,
                            alignment: own
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Column(
                              crossAxisAlignment: own
                                  ? CrossAxisAlignment.end
                                  : CrossAxisAlignment.start,
                              children: [
                                if (!own)
                                  Padding(
                                    padding: const EdgeInsets.only(
                                      left: 4,
                                      bottom: 5,
                                    ),
                                    child: Text(
                                      idea.authorName.isEmpty
                                          ? '寮生'
                                          : idea.authorName,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: TnTokens.textMuted,
                                      ),
                                    ),
                                  ),
                                Material(
                                  key: ValueKey('message-${idea.id}'),
                                  color: own
                                      ? TnTokens.primary
                                      : const Color(0xF2FFFFFF),
                                  borderRadius: radius,
                                  child: InkWell(
                                    borderRadius: radius,
                                    onTap: () => widget.onOpen(idea),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 16,
                                        vertical: 13,
                                      ),
                                      child: Text(
                                        idea.body,
                                        style: TextStyle(
                                          fontSize: 15,
                                          height: 1.7,
                                          color: own
                                              ? Colors.white
                                              : TnTokens.textMain,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.only(
                                    top: 5,
                                    left: 4,
                                    right: 4,
                                  ),
                                  child: Text(
                                    '$time${idea.likes > 0 ? '  ♡ ${idea.likes}' : ''}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: TnTokens.textMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        if (_unread > 0)
          Positioned(
            left: 0,
            right: 0,
            bottom: 8,
            child: Center(
              child: FilledButton.tonalIcon(
                onPressed: () {
                  _scroll.jumpTo(0);
                  setState(() => _unread = 0);
                },
                icon: const Icon(Icons.arrow_downward, size: 15),
                label: Text('新しい投稿 $_unread件'),
              ),
            ),
          ),
      ],
    );
  }
}

class IdeaTimelineSkeleton extends StatelessWidget {
  const IdeaTimelineSkeleton({super.key});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < 3; i++)
          Expanded(
            child: Align(
              alignment: i.isOdd ? Alignment.centerRight : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(top: 12),
                width: 220,
                height: 90,
                decoration: BoxDecoration(
                  color: TnTokens.bgTint,
                  borderRadius: BorderRadius.circular(22),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

class GlassBottomNav extends StatelessWidget {
  const GlassBottomNav({
    super.key,
    required this.index,
    required this.onSelected,
  });
  final int index;
  final ValueChanged<int> onSelected;
  @override
  Widget build(BuildContext context) {
    final compact = MediaQuery.sizeOf(context).height < 500;
    return SafeArea(
      top: false,
      minimum: EdgeInsets.fromLTRB(18, compact ? 3 : 8, 18, compact ? 5 : 18),
      child: Center(
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 660),
          child: GlassSurface(
            radius: 38,
            padding: const EdgeInsets.all(8),
            child: LayoutBuilder(
              builder: (context, c) => SizedBox(
                height: compact ? 44 : 56,
                child: Stack(
                  children: [
                    AnimatedAlign(
                      duration: MediaQuery.disableAnimationsOf(context)
                          ? Duration.zero
                          : const Duration(milliseconds: 350),
                      curve: Curves.easeOutCubic,
                      alignment: Alignment(-1 + index * 2 / 3, 0),
                      child: Container(
                        width: c.maxWidth / 4,
                        decoration: BoxDecoration(
                          color: TnTokens.primary,
                          borderRadius: BorderRadius.circular(27),
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        for (var i = 0; i < 4; i++)
                          Expanded(
                            child: Semantics(
                              selected: i == index,
                              button: true,
                              label: ['アイデア', '進行中', 'はたらく', '保管する'][i],
                              child: ExcludeSemantics(
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(27),
                                    onTap: () => onSelected(i),
                                    child: Center(
                                      child: Padding(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 5,
                                        ),
                                        child: FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text(
                                            ['アイデア', '進行中', 'はたらく', '保管する'][i],
                                            maxLines: 1,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w500,
                                              color: i == index
                                                  ? Colors.white
                                                  : TnTokens.textMuted,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomeLoadingScaffold extends StatelessWidget {
  const HomeLoadingScaffold({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: GlassBackdrop(
      animate: false,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              GlassSurface(
                child: SizedBox(
                  height: 68,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: TnTokens.bgTint,
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          width: 110,
                          height: 12,
                          color: TnTokens.bgTint,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: Semantics(
                  label: 'ホームを読み込み中',
                  child: ExcludeSemantics(child: const IdeaTimelineSkeleton()),
                ),
              ),
              const GlassSurface(
                child: SizedBox(height: 52, width: double.infinity),
              ),
              const SizedBox(height: 12),
              const GlassSurface(
                child: SizedBox(height: 64, width: double.infinity),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
