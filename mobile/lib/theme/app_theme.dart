import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'tokens.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final base = ColorScheme.fromSeed(
      seedColor: TnTokens.primary,
      brightness: Brightness.light,
      primary: TnTokens.primary,
      onPrimary: TnTokens.onPrimary,
      surface: TnTokens.bgSurface,
      onSurface: TnTokens.textMain,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: base,
      scaffoldBackgroundColor: TnTokens.bgMain,
      fontFamily: null,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        foregroundColor: TnTokens.textMain,
      ),
      cardTheme: CardThemeData(
        color: TnTokens.bgSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(TnTokens.radiusLg),
          side: const BorderSide(color: TnTokens.border),
        ),
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: TnTokens.primary,
          foregroundColor: TnTokens.onPrimary,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: TnTokens.primary,
          minimumSize: const Size.fromHeight(48),
          side: const BorderSide(color: TnTokens.border),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: TnTokens.bgSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: TnTokens.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: TnTokens.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: TnTokens.primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: TnTokens.textMuted, fontSize: 15),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: TnTokens.bgSurface,
        selectedColor: TnTokens.primary,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        secondaryLabelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: TnTokens.onPrimary,
        ),
        side: const BorderSide(color: TnTokens.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(TnTokens.radiusXl),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      ),
      dividerTheme: const DividerThemeData(color: TnTokens.border, thickness: 1),
      textTheme: const TextTheme(
        titleLarge: TextStyle(
          fontSize: TnTokens.typeTitle,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.6,
          color: TnTokens.textMain,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: TnTokens.textMain,
        ),
        bodyMedium: TextStyle(fontSize: TnTokens.typeBody, color: TnTokens.textMain, height: 1.45),
        bodySmall: TextStyle(fontSize: TnTokens.typeCaption, color: TnTokens.textMuted),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    );
  }
}
