import 'package:flutter/material.dart';

/// Mirrors `shared/design-tokens.json` and `shared/team-note-theme.css`.
abstract final class TnTokens {
  static const Color bgMain = Color(0xFFF7FAFC);
  static const Color bgSurface = Color(0xFFFFFFFF);
  static const Color bgTint = Color(0xFFE6EFFA);
  static const Color textMain = Color(0xFF202734);
  static const Color textMuted = Color(0xFF626E80);
  static const Color border = Color(0x52AABBD0);
  static const Color primary = Color(0xFF285782);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color accentGold = Color(0xFFC9A227);
  static const Color accentPurple = Color(0xFF7C6BCF);
  static const Color accentOrange = Color(0xFFE67E22);
  static const Color accentGreen = Color(0xFF2F9E6B);
  static const Color errorBg = Color(0xFFFFF5F5);
  static const Color errorText = Color(0xFF92364B);
  static const Color navInactive = Color(0xFF687180);
  static const Color navActive = Color(0xFF244F78);

  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 24;
  static const double radiusXl = 30;

  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 12;
  static const double spaceLg = 16;
  static const double spaceXl = 20;
  static const double spaceXxl = 28;

  static const double typeBrand = 15;
  static const double typeTitle = 22;
  static const double typeBody = 15;
  static const double typeCaption = 12;
  static const double typeNav = 11;

  static const double maxContent = 440;
  static const double navHeight = 64;

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: const Color(0xFF2B405E).withValues(alpha: 0.07),
          blurRadius: 38,
          offset: const Offset(0, 12),
        ),
        BoxShadow(
          color: const Color(0xFF2B405E).withValues(alpha: 0.035),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ];
}
