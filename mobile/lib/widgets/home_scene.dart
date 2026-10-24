import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme/tokens.dart';

/// The same twelve perimeter slots and reserved centre as the web home.
class CloudLayout {
  CloudLayout(Size size) {
    final wide = size.width > size.height * 1.65;
    final compact = !wide && size.height < 280;
    final columns = wide
        ? 7
        : compact || size.width >= 700
        ? 4
        : 3;
    final rows = wide
        ? 2
        : columns == 4
        ? 4
        : 5;
    final positions = wide
        ? <(int, int)>[
            (0, 0),
            (0, 6),
            (1, 0),
            (1, 6),
            (0, 1),
            (1, 5),
            (0, 5),
            (1, 1),
            (0, 2),
            (1, 4),
            (0, 4),
            (1, 2),
          ]
        : columns == 4
        ? <(int, int)>[
            (0, 0),
            (0, 3),
            (3, 0),
            (3, 3),
            (0, 1),
            (3, 2),
            (1, 0),
            (2, 3),
            (0, 2),
            (3, 1),
            (2, 0),
            (1, 3),
          ]
        : <(int, int)>[
            (0, 0),
            (0, 2),
            (2, 0),
            (2, 2),
            (4, 0),
            (4, 2),
            (0, 1),
            (4, 1),
            (1, 0),
            (3, 2),
            (1, 2),
            (3, 0),
          ];
    final cw = size.width / columns;
    final ch = size.height / rows;
    slots = positions
        .map(
          (p) => Rect.fromLTWH(
            p.$2 * cw + 3,
            p.$1 * ch + 3,
            math.max(0, cw - 6),
            math.max(0, ch - 6),
          ),
        )
        .toList();
    final diameter = math.min(
      wide ? 64.0 : 104.0,
      math.min(
        columns == 3 || wide ? cw - 10 : cw * 2 - 16,
        columns == 3 ? ch * 3 - 16 : ch * 2 - 12,
      ),
    );
    centre = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: math.max(44, diameter),
      height: math.max(44, diameter),
    );
  }
  late final List<Rect> slots;
  late final Rect centre;
}

Color cloudInk(int shape) => const [
  Color(0xFF9A4E1F),
  Color(0xFF2A5688),
  Color(0xFF785C20),
  Color(0xFF1F6E4B),
  Color(0xFF5F458F),
  Color(0xFF276270),
][shape % 6];

int cloudHash(String id) =>
    id.codeUnits.fold(7, (h, c) => (h * 31 + c) & 0x7fffffff);

/// Six code-native outlines, kept inside the 180 x 120 coordinate space.
Path cloudPath(int shape, Size size) {
  final p = Path();
  switch (shape % 6) {
    case 0:
      p.moveTo(30, 23);
      p.cubicTo(22, 6, 48, 0, 64, 12);
      p.cubicTo(79, 0, 105, 1, 114, 13);
      p.cubicTo(139, 0, 161, 12, 155, 30);
      p.cubicTo(180, 38, 180, 62, 162, 69);
      p.cubicTo(175, 91, 153, 101, 132, 94);
      p.cubicTo(114, 108, 91, 102, 80, 98);
      p.lineTo(59, 116);
      p.lineTo(63, 98);
      p.cubicTo(40, 108, 20, 96, 24, 81);
      p.cubicTo(0, 83, 0, 59, 14, 48);
      p.cubicTo(0, 32, 13, 18, 30, 23);
    case 1:
      p.moveTo(89, 3);
      p.cubicTo(137, 0, 178, 18, 176, 53);
      p.cubicTo(180, 85, 143, 105, 103, 102);
      p.lineTo(76, 117);
      p.lineTo(78, 102);
      p.cubicTo(31, 105, 2, 84, 4, 53);
      p.cubicTo(1, 20, 42, 1, 89, 3);
    case 2:
      p.moveTo(23, 8);
      p.lineTo(149, 3);
      p.quadraticBezierTo(169, 3, 172, 22);
      p.lineTo(178, 75);
      p.quadraticBezierTo(179, 94, 157, 98);
      p.lineTo(116, 101);
      p.lineTo(91, 117);
      p.lineTo(95, 101);
      p.lineTo(24, 106);
      p.quadraticBezierTo(6, 105, 5, 84);
      p.lineTo(2, 31);
      p.quadraticBezierTo(0, 10, 23, 8);
    case 3:
      p.moveTo(17, 28);
      p.cubicTo(21, 3, 48, 0, 71, 12);
      p.cubicTo(95, 0, 128, 1, 137, 18);
      p.cubicTo(165, 13, 180, 34, 171, 55);
      p.cubicTo(180, 76, 167, 96, 142, 93);
      p.cubicTo(127, 109, 96, 104, 83, 98);
      p.lineTo(65, 117);
      p.lineTo(60, 99);
      p.cubicTo(34, 108, 9, 95, 16, 75);
      p.cubicTo(0, 67, 0, 39, 17, 28);
    case 4:
      p.moveTo(22, 15);
      p.quadraticBezierTo(32, 0, 56, 6);
      p.lineTo(151, 10);
      p.quadraticBezierTo(171, 11, 171, 31);
      p.lineTo(177, 75);
      p.quadraticBezierTo(178, 96, 151, 99);
      p.lineTo(133, 99);
      p.lineTo(143, 117);
      p.lineTo(115, 100);
      p.lineTo(28, 105);
      p.quadraticBezierTo(8, 105, 7, 84);
      p.lineTo(3, 38);
      p.quadraticBezierTo(1, 19, 22, 15);
    default:
      p.moveTo(43, 5);
      p.cubicTo(83, 0, 160, 2, 173, 39);
      p.cubicTo(180, 78, 149, 106, 110, 100);
      p.lineTo(87, 118);
      p.lineTo(88, 101);
      p.cubicTo(49, 112, 6, 92, 4, 65);
      p.cubicTo(0, 36, 13, 13, 43, 5);
  }
  p.close();
  return p.transform(
    Matrix4.diagonal3Values(size.width / 180, size.height / 120, 1).storage,
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
                  Opacity(
                    opacity: .075,
                    child: Transform.scale(
                      scale: 1 + _motion.value * .035,
                      child: Image.asset(
                        'assets/banners/courtyard_monochrome.png',
                        fit: BoxFit.cover,
                        excludeFromSemantics: true,
                      ),
                    ),
                  ),
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
        const Color(0x70E7E1FA),
        size.width * .8,
      ),
      (
        Offset(size.width * .45, size.height * (1 - phase * .04)),
        const Color(0x90D9F1F4),
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
      final layout = CloudLayout(constraints.biggest);
      final count = widget.loading ? 12 : math.min(12, widget.ideas.length);
      return AnimatedBuilder(
        animation: Listenable.merge([_float, _pop]),
        builder: (context, _) => Stack(
          clipBehavior: Clip.hardEdge,
          children: [
            for (var i = 0; i < count; i++) _slot(layout.slots[i], i),
            Positioned.fromRect(
              rect: layout.centre,
              child: Semantics(
                button: true,
                label: '企画を作成',
                child: ExcludeSemantics(
                  child: GlassSurface(
                    radius: 100,
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: widget.loading ? null : widget.onCreate,
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.add_rounded,
                                  size: 30,
                                  color: TnTokens.primary,
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  '企画を作成',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: widget.loading
                                        ? TnTokens.textMuted
                                        : TnTokens.primary,
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
          ],
        ),
      );
    },
  );
  Widget _slot(Rect slot, int i) {
    final idea = widget.loading ? null : widget.ideas[i];
    final hash = cloudHash(idea?.id ?? 'skeleton-$i');
    final width = slot.width * (.82 + hash % 10 / 100);
    final height = math.min(
      slot.height,
      math.max(44.0, slot.height * (.80 + (hash >> 4) % 10 / 100)),
    );
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
                                      Positioned(
                                        left: width * .15,
                                        right: width * .15,
                                        top: height * .15,
                                        bottom: height * .31,
                                        child: Center(
                                          child: Text(
                                            idea.body,
                                            maxLines: height < 60 ? 1 : 2,
                                            overflow: TextOverflow.ellipsis,
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: 12,
                                              height: 1.35,
                                              fontWeight: FontWeight.w600,
                                              color: cloudInk(hash % 6),
                                            ),
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        left: 0,
                                        right: 0,
                                        bottom: height * .17,
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              idea.likedByMe
                                                  ? Icons.favorite
                                                  : Icons.favorite_border,
                                              size: 10,
                                              color: TnTokens.textMuted,
                                            ),
                                            if (idea.likes > 0) ...[
                                              const SizedBox(width: 3),
                                              Text(
                                                '${idea.likes}',
                                                style: const TextStyle(
                                                  fontSize: 9,
                                                  color: TnTokens.textMuted,
                                                ),
                                              ),
                                            ],
                                          ],
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
    final fill = const [
      Color(0xF0FFF1EA),
      Color(0xF0EAF4FF),
      Color(0xF0FFF7E6),
      Color(0xF0EAF8F0),
      Color(0xF0F3EDFF),
      Color(0xF0E8F8FB),
    ][shape % 6];
    final stroke = const [
      Color(0xBDEFb089),
      Color(0xBD8FB6E2),
      Color(0xBDDFC06A),
      Color(0xBD7FC4A3),
      Color(0xBDC4ADE6),
      Color(0xBD87CFDB),
    ][shape % 6];
    canvas.drawShadow(path, const Color(0x25506985), 4, false);
    canvas.drawPath(
      path,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: skeleton
              ? const [Color(0xBDECF2F8), Color(0x90F5F8FC)]
              : [fill, const Color(0xEDFFFFFF)],
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
  Widget build(BuildContext context) => SafeArea(
    top: false,
    minimum: const EdgeInsets.fromLTRB(12, 6, 12, 10),
    child: Center(
      heightFactor: 1,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: GlassSurface(
          radius: 30,
          padding: const EdgeInsets.all(6),
          child: LayoutBuilder(
            builder: (context, c) => SizedBox(
              height: 58,
              child: Stack(
                children: [
                  AnimatedAlign(
                    duration: MediaQuery.disableAnimationsOf(context)
                        ? Duration.zero
                        : const Duration(milliseconds: 400),
                    curve: Curves.easeOutCubic,
                    alignment: Alignment(-1 + index * 2 / 3, 0),
                    child: Container(
                      width: c.maxWidth / 4,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        gradient: const LinearGradient(
                          colors: [Color(0xC9E6EFFA), Color(0xE0FFFFFF)],
                        ),
                        border: Border.all(color: Colors.white),
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
                                  borderRadius: BorderRadius.circular(24),
                                  onTap: () => onSelected(i),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        [
                                          Icons.lightbulb_outline,
                                          Icons.play_circle_outline,
                                          Icons.work_outline,
                                          Icons.inventory_2_outlined,
                                        ][i],
                                        size: 22,
                                        color: i == index
                                            ? TnTokens.navActive
                                            : TnTokens.navInactive,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        ['アイデア', '進行中', 'はたらく', '保管する'][i],
                                        maxLines: 1,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: i == index
                                              ? FontWeight.w700
                                              : FontWeight.w500,
                                          color: i == index
                                              ? TnTokens.navActive
                                              : TnTokens.navInactive,
                                        ),
                                      ),
                                    ],
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
