import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class BottomNav extends StatelessWidget {
  const BottomNav({
    super.key,
    required this.index,
    required this.onChanged,
  });

  final int index;
  final ValueChanged<int> onChanged;

  static const _items = [
    (Icons.lightbulb_outline, 'アイデア'),
    (Icons.play_circle_outline, '進行中'),
    (Icons.work_outline, 'はたらく'),
    (Icons.inventory_2_outlined, '保管する'),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
        child: Container(
          height: TnTokens.navHeight,
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: TnTokens.bgSurface.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(TnTokens.radiusXl),
            border: Border.all(color: TnTokens.border),
            boxShadow: TnTokens.cardShadow,
          ),
          child: Row(
            children: [
              for (var i = 0; i < _items.length; i++)
                Expanded(
                  child: _NavButton(
                    icon: _items[i].$1,
                    label: _items[i].$2,
                    selected: index == i,
                    onTap: () => onChanged(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? TnTokens.bgTint : Colors.transparent,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: selected ? TnTokens.navActive : TnTokens.navInactive,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: TnTokens.typeNav,
                fontWeight: FontWeight.w600,
                color: selected ? TnTokens.navActive : TnTokens.navInactive,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
