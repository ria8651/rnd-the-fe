import 'package:flutter/material.dart';

/// Typography per `spec/ui-standards/typography.md`. Base body/cell text is
/// 14px/400 with 20px line-height; headers are distinguished by **weight (600)**,
/// not colour or size. Numeric values use tabular figures so digits align in
/// table columns (applied at the table layer in later stages).
///
/// `onSurface` colours the text; structure (size/weight/height) is theme-neutral.
TextTheme buildTextTheme(Color onSurface, Color secondary) {
  TextStyle s(double size, FontWeight weight, double height,
          {Color? color}) =>
      TextStyle(
        fontSize: size,
        fontWeight: weight,
        height: height / size,
        color: color ?? onSurface,
        fontFeatures: const [FontFeature.tabularFigures()],
      );

  return TextTheme(
    // Display / headlines
    headlineMedium: s(24, FontWeight.w600, 32),
    headlineSmall: s(20, FontWeight.w600, 28),
    titleLarge: s(18, FontWeight.w600, 24),
    titleMedium: s(16, FontWeight.w600, 24),
    titleSmall: s(14, FontWeight.w600, 20),
    // Body / cell — 14px/400/20px is the desktop cell standard
    bodyLarge: s(16, FontWeight.w400, 24),
    bodyMedium: s(14, FontWeight.w400, 20),
    bodySmall: s(12, FontWeight.w400, 16, color: secondary),
    // Labels (header weight 600)
    labelLarge: s(14, FontWeight.w600, 20),
    labelMedium: s(12, FontWeight.w600, 16, color: secondary),
    labelSmall: s(11, FontWeight.w600, 16, color: secondary),
  );
}
