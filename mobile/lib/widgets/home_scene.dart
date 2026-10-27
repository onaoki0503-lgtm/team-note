import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/tokens.dart';

/// Non-overlapping slots adapt to the submitted card count, like the web home.
class CloudLayout {
  CloudLayout(Size size, [int count = 12]) {
    count = count.clamp(1, 12);
    final wide = size.width > size.height * 1.65;
    if (count <= 2 && !wide) {
      slots = [
        Rect.fromLTWH(0, 0, size.width * .64, size.height * .52),
        Rect.fromLTWH(
          size.width * .36,
          size.height * .48,
          size.width * .64,
          size.height * .52,
        ),
      ];
      return;
    }
    final columns = wide
        ? math.min(6, count)
        : size.width >= 700 && count > 6
        ? 4
        : count > 6
        ? 3
        : 2;
    final rows = (count / columns).ceil();
    final cw = size.width / columns, ch = size.height / rows;
    slots = [
      for (var i = 0; i < count; i++)
        Rect.fromLTWH(
          i % columns * cw + 2,
          i ~/ columns * ch + 3,
          math.max(0, cw - 4),
          math.max(0, ch - 6),
        ),
    ];
  }
  late final List<Rect> slots;
}

int cloudHash(String id) =>
    id.codeUnits.fold(7, (h, c) => (h * 31 + c) & 0x7fffffff);

/// Soft, slightly asymmetric glass cards from the approved reference.
Path cloudPath(int shape, Size size) {
  final r = math.min(30.0, size.shortestSide * .26);
  return Path()..addRRect(
    RRect.fromRectAndCorners(
      Offset.zero & size,
      topLeft: Radius.circular(r * .95),
      topRight: Radius.circular(r * (1 + shape % 3 * .08)),
      bottomLeft: Radius.circular(r * 1.08),
      bottomRight: Radius.circular(r),
    ),
  );
}

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

class IdeaCloudBoard extends StatefulWidget {
  const IdeaCloudBoard({
    super.key,
    required this.ideas,
    required this.onOpen,
    required this.onCreate,
    this.paused = false,
    this.loading = false,
  });
  final List<IdeaItem> ideas;
  final ValueChanged<IdeaItem> onOpen;
  final VoidCallback onCreate;
  final bool paused, loading;
  @override
  State<IdeaCloudBoard> createState() => _IdeaCloudBoardState();
}

class _IdeaCloudBoardState extends State<IdeaCloudBoard>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  late final _float = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 360),
  );
  late final _pop = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  );
  Timer? _timer;
  final _random = math.Random();
  String? _popping, _lastPopped;
  bool _foreground = true;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _pop.addStatusListener((status) {
      if (status == AnimationStatus.completed && mounted) {
        setState(() => _popping = null);
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncMotion();
  }

  @override
  void didUpdateWidget(covariant IdeaCloudBoard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncMotion();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _syncMotion();
  }

  bool get _paused =>
      widget.paused ||
      !_foreground ||
      MediaQuery.disableAnimationsOf(context) ||
      !TickerMode.valuesOf(context).enabled;
  void _syncMotion() {
    if (_paused) {
      _float.stop();
      _pop.stop();
      _timer?.cancel();
      _timer = null;
      _popping = null;
      return;
    }
    if (!_float.isAnimating) _float.repeat();
    if (widget.ideas.isEmpty || widget.loading) {
      _timer?.cancel();
      _timer = null;
      return;
    }
    _timer ??= Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted || _paused) return;
      final visible = widget.ideas.take(12).toList();
      var choices = visible.where((i) => i.id != _lastPopped).toList();
      if (choices.isEmpty) choices = visible;
      if (choices.isEmpty) return;
      setState(
        () => _popping = _lastPopped =
            choices[_random.nextInt(choices.length)].id,
      );
      _pop.forward(from: 0);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _float.dispose();
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final layout = CloudLayout(
        constraints.biggest,
        widget.loading ? 12 : widget.ideas.length,
      );
      final count = widget.loading ? 12 : math.min(12, widget.ideas.length);
      return AnimatedBuilder(
        animation: Listenable.merge([_float, _pop]),
        builder: (context, _) => Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            for (var i = 0; i < count; i++) _slot(layout.slots[i], i),
            if (!widget.loading && widget.ideas.isEmpty)
              const Center(
                child: Text(
                  'まだアイデアはありません',
                  style: TextStyle(fontSize: 13, color: TnTokens.textMuted),
                ),
              ),
          ],
        ),
      );
    },
  );
  Widget _slot(Rect slot, int i) {
    final idea = widget.loading ? null : widget.ideas[i];
    final hash = cloudHash(idea?.id ?? 'skeleton-$i');
    final width = slot.width * (.88 + hash % 4 / 100);
    var height = math.min(
      slot.height,
      math.max(44.0, slot.height * (.84 + (hash >> 4) % 6 / 100)),
    );
    if (!widget.loading && widget.ideas.length <= 2) {
      height = math.min(height, i == 0 ? 150 : 130);
    }
    final amplitudeX = math.min(
      7.0,
      math.max(0.0, (slot.width - width * 1.08) / 2 - 1),
    );
    final amplitudeY = math.min(
      9.0,
      math.max(0.0, (slot.height - height * 1.08) / 2 - 1),
    );
    final phase =
        _float.value * 360 / [9, 10, 12, 15][hash % 4] * math.pi * 2 +
        (hash % 110) / 10;
    final drift = _paused
        ? Offset.zero
        : Offset(math.sin(phase) * amplitudeX, math.cos(phase) * amplitudeY);
    final peak = math.max(
      1.0,
      math.min(
        1.08,
        math.min(
          (slot.width - amplitudeX * 2) / width,
          (slot.height - amplitudeY * 2) / height,
        ),
      ),
    );
    var opacity = 1.0, scale = 1.0;
    final popping = idea != null && _popping == idea.id && !_paused;
    if (popping) {
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
        scale = .72 + (peak - .72) * Curves.easeOutCubic.transform(v);
      } else if (t < .72) {
        scale = peak + (.985 - peak) * (t - .42) / .30;
      } else {
        scale = .985 + .015 * (t - .72) / .28;
      }
    }
    return Positioned.fromRect(
      rect: slot,
      child: Center(
        child: Transform.translate(
          offset: drift,
          child: Transform.scale(
            scale: scale,
            child: Opacity(
              opacity: opacity,
              child: SizedBox(
                width: width,
                height: height,
                child: RepaintBoundary(
                  child: idea == null
                      ? ExcludeSemantics(
                          child: CustomPaint(
                            painter: _CloudPainter(hash % 6, skeleton: true),
                          ),
                        )
                      : Semantics(
                          button: true,
                          label: '${idea.body}、いいね${idea.likes}件',
                          child: ExcludeSemantics(
                            child: CustomPaint(
                              key: ValueKey('cloud-${idea.id}'),
                              painter: _CloudPainter(hash % 6),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  customBorder: _CloudBorder(hash % 6),
                                  onTap: () => widget.onOpen(idea),
                                  child: Stack(
                                    children: [
                                      Positioned.fill(
                                        child: Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: width < 110 ? 10 : 18,
                                            vertical: height < 75 ? 7 : 16,
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  idea.body,
                                                  maxLines: height < 65
                                                      ? 1
                                                      : height < 110
                                                      ? 2
                                                      : 3,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                  style: TextStyle(
                                                    fontSize: width < 110
                                                        ? 11
                                                        : width < 160
                                                        ? 13
                                                        : 16,
                                                    height: 1.6,
                                                    color: TnTokens.textMain,
                                                  ),
                                                ),
                                              ),
                                              if (height > 75 &&
                                                  width > 95) ...[
                                                const SizedBox(height: 12),
                                                Row(
                                                  children: [
                                                    const Expanded(
                                                      child: Text(
                                                        'アイデア',
                                                        maxLines: 1,
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        style: TextStyle(
                                                          fontSize: 11,
                                                          color: TnTokens
                                                              .textMuted,
                                                        ),
                                                      ),
                                                    ),
                                                    if (idea.likes > 0) ...[
                                                      const Icon(
                                                        Icons.favorite_border,
                                                        size: 10,
                                                        color:
                                                            TnTokens.textMuted,
                                                      ),
                                                      Text(
                                                        ' ${idea.likes}',
                                                        style: const TextStyle(
                                                          fontSize: 9,
                                                          color: TnTokens
                                                              .textMuted,
                                                        ),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
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
        ),
      ),
    );
  }
}

class _CloudPainter extends CustomPainter {
  _CloudPainter(this.shape, {this.skeleton = false});
  final int shape;
  final bool skeleton;
  @override
  void paint(Canvas canvas, Size size) {
    final path = cloudPath(shape, size);
    const fill = Color(0xEFFFFFFF);
    const stroke = Color(0xFFFFFFFF);
    canvas.drawShadow(path, const Color(0x183C5089), 10, false);
    canvas.drawPath(
      path,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: skeleton
              ? const [Color(0xBDECF2F8), Color(0x90F5F8FC)]
              : [fill, const Color(0xB8FFFFFF)],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      path,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.1
        ..color = skeleton ? const Color(0x99B8C8DB) : stroke,
    );
  }

  @override
  bool shouldRepaint(_CloudPainter oldDelegate) =>
      shape != oldDelegate.shape || skeleton != oldDelegate.skeleton;
}

class _CloudBorder extends ShapeBorder {
  const _CloudBorder(this.shape);
  final int shape;
  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;
  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) =>
      cloudPath(shape, rect.size).shift(rect.topLeft);
  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) =>
      getOuterPath(rect, textDirection: textDirection);
  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {}
  @override
  ShapeBorder scale(double t) => this;
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
                  child: ExcludeSemantics(
                    child: IdeaCloudBoard(
                      ideas: const [],
                      loading: true,
                      paused: true,
                      onOpen: (_) {},
                      onCreate: () {},
                    ),
                  ),
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
