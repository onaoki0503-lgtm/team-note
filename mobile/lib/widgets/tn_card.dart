import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class TnCard extends StatelessWidget {
  const TnCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(TnTokens.spaceLg),
    this.margin = EdgeInsets.zero,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final EdgeInsets margin;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: TnTokens.bgSurface,
        borderRadius: BorderRadius.circular(TnTokens.radiusLg),
        border: Border.all(color: TnTokens.border),
        boxShadow: TnTokens.cardShadow,
      ),
      child: child,
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(TnTokens.radiusLg),
        child: body,
      ),
    );
  }
}
