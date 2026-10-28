import 'dart:async';
import 'dart:math' as math;
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

/// Original floating bubbles with a scrollable, retained history.
class IdeaTimeline extends StatefulWidget {
  const IdeaTimeline({
    super.key,
    required this.ideas,
    required this.userId,
    required this.onOpen,
    this.loading = false,
    this.paused = false,
  });
  final List<IdeaItem> ideas;
  final String userId;
  final ValueChanged<IdeaItem> onOpen;
  final bool loading, paused;
  @override
  State<IdeaTimeline> createState() => _IdeaTimelineState();
}

class _IdeaTimelineState extends State<IdeaTimeline>
    with WidgetsBindingObserver {
  Timer? _popTimer, _resetPop;
  String? _popping, _lastPopped;
  bool _foreground = true;
  bool get _paused =>
      widget.paused ||
      !_foreground ||
      MediaQuery.disableAnimationsOf(context) ||
      !TickerMode.valuesOf(context).enabled;
  List<IdeaItem> _ordered() {
    final indexed = widget.ideas.indexed.toList()
      ..sort((a, b) {
        final order = a.$2.createdAt.compareTo(b.$2.createdAt);
        return order == 0 ? a.$1.compareTo(b.$1) : order;
      });
    return indexed.map((e) => e.$2).toList();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncPop();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _syncPop();
  }

  void _syncPop() {
    if (_paused || widget.ideas.isEmpty) {
      _popTimer?.cancel();
      _popTimer = null;
      _resetPop?.cancel();
      _popping = null;
      return;
    }
    _popTimer ??= Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || _paused || !_scroll.hasClients) return;
      final latest = _ordered().reversed.toList();
      final start = (_scroll.offset / 216).floor() * 2;
      final count = (_scroll.position.viewportDimension / 216).ceil() * 2;
      final visible = latest.skip(start).take(count).toList();
      final different = visible.where((i) => i.id != _lastPopped).toList();
      final choices = different.isEmpty ? visible : different;
      if (choices.isEmpty) return;
      setState(
        () => _popping = _lastPopped =
            choices[math.Random().nextInt(choices.length)].id,
      );
      _resetPop?.cancel();
      _resetPop = Timer(const Duration(milliseconds: 800), () {
        if (mounted) setState(() => _popping = null);
      });
    });
  }

  final _scroll = ScrollController();
  int _unread = 0;
  Set<String> _ids = {};
  bool _initialized = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
    _syncPop();
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
    WidgetsBinding.instance.removeObserver(this);
    _popTimer?.cancel();
    _resetPop?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading && widget.ideas.isEmpty) {
      return const IdeaTimelineSkeleton();
    }
    final ordered = _ordered();
    final rows = <List<IdeaItem>>[
      for (var i = 0; i < ordered.length; i += 2)
        ordered.sublist(i, math.min(i + 2, ordered.length)),
    ].reversed.toList();
    return Stack(
      children: [
        if (ordered.isEmpty)
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
            padding: const EdgeInsets.fromLTRB(0, 12, 0, 20),
            itemCount: rows.length,
            itemExtent: 216,
            itemBuilder: (context, index) {
              return Row(
                key: ValueKey('row-${rows[index].first.id}'),
                children: [
                  for (var column = 0; column < 2; column++)
                    Expanded(
                      child: column >= rows[index].length
                          ? const SizedBox()
                          : Padding(
                              padding: EdgeInsets.only(
                                top: (index + column).isOdd ? 28 : 0,
                              ),
                              child: Center(
                                child: FractionallySizedBox(
                                  widthFactor: .85,
                                  child: SizedBox(
                                    height: 150,
                                    child: _FloatingIdea(
                                      idea: rows[index][column],
                                      paused: _paused,
                                      popping:
                                          !_paused &&
                                          _popping == rows[index][column].id,
                                      onOpen: () =>
                                          widget.onOpen(rows[index][column]),
                                    ),
                                  ),
                                ),
                              ),
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

class _FloatingIdea extends StatefulWidget {
  const _FloatingIdea({
    required this.idea,
    required this.paused,
    required this.popping,
    required this.onOpen,
  });
  final IdeaItem idea;
  final bool paused, popping;
  final VoidCallback onOpen;
  @override
  State<_FloatingIdea> createState() => _FloatingIdeaState();
}

class _FloatingIdeaState extends State<_FloatingIdea>
    with TickerProviderStateMixin {
  late final _float = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 360),
  );
  late final _pop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  );
  @override
  void initState() {
    super.initState();
    _sync();
  }

  void _sync() {
    if (widget.paused) {
      _float.stop();
      _pop.stop();
    } else {
      if (!_float.isAnimating) _float.repeat();
    }
  }

  @override
  void didUpdateWidget(covariant _FloatingIdea old) {
    super.didUpdateWidget(old);
    _sync();
    if (widget.popping && !old.popping && !widget.paused) _pop.forward(from: 0);
  }

  @override
  void dispose() {
    _float.dispose();
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hash = widget.idea.id.codeUnits.fold(
      7,
      (h, c) => (h * 31 + c) & 0x7fffffff,
    );
    final radii = [
      const BorderRadius.only(
        topLeft: Radius.circular(32),
        topRight: Radius.circular(42),
        bottomLeft: Radius.circular(24),
        bottomRight: Radius.circular(34),
      ),
      BorderRadius.circular(45),
      const BorderRadius.only(
        topLeft: Radius.circular(45),
        topRight: Radius.circular(28),
        bottomLeft: Radius.circular(38),
        bottomRight: Radius.circular(46),
      ),
    ];
    final radius = radii[hash % radii.length];
    return AnimatedBuilder(
      animation: Listenable.merge([_float, _pop]),
      builder: (context, child) {
        final phase =
            _float.value * 360 / (9 + hash % 5) * math.pi * 2 + hash % 100 / 10;
        final drift = widget.paused
            ? Offset.zero
            : Offset(math.sin(phase) * 5, math.cos(phase) * 8);
        var opacity = 1.0, scale = 1.0;
        if (widget.popping && !widget.paused) {
          final t = _pop.value;
          if (t < .10) {
            opacity = 1 - t / .10;
            scale = 1 - t / .10 * .10;
          } else if (t < .22) {
            opacity = 0;
            scale = .72;
          } else if (t < .42) {
            final v = (t - .22) / .20;
            opacity = v;
            scale = .72 + .36 * Curves.easeOutCubic.transform(v);
          } else if (t < .72) {
            scale = 1.08 + (.985 - 1.08) * (t - .42) / .30;
          } else {
            scale = .985 + .015 * (t - .72) / .28;
          }
        }
        return Transform.translate(
          offset: drift,
          child: Transform.rotate(
            angle: widget.paused ? 0 : (hash % 5 - 2) * .01,
            child: Transform.scale(
              scale: scale,
              child: Opacity(opacity: opacity, child: child),
            ),
          ),
        );
      },
      child: Semantics(
        button: true,
        label: widget.idea.body,
        child: ExcludeSemantics(
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: radius,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x12183181),
                  blurRadius: 22,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Material(
              key: ValueKey('message-${widget.idea.id}'),
              color: const Color(0xEEFFFFFF),
              borderRadius: radius,
              child: InkWell(
                borderRadius: radius,
                onTap: widget.onOpen,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: Text(
                      widget.idea.body,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.7,
                        color: TnTokens.textMain,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
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
