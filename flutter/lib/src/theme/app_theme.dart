import 'package:flutter/material.dart';

import 'tokens.dart';
import 'typography.dart';

/// Builds a [ThemeData] from the semantic [OmsColors] token set. All Material
/// component defaults are mapped onto tokens here so call sites never reach for
/// raw hex (see `spec/ui-standards/theming.md`).
ThemeData buildTheme(Brightness brightness) {
  final bool isDark = brightness == Brightness.dark;
  final OmsColors t = isDark ? OmsColors.dark : OmsColors.light;

  final ColorScheme scheme = ColorScheme(
    brightness: brightness,
    primary: t.brandPrimary,
    onPrimary: t.onBrandPrimary,
    primaryContainer: t.brandPrimarySubtle,
    onPrimaryContainer: t.textPrimary,
    secondary: t.brandSecondary,
    onSecondary: t.onBrandPrimary,
    secondaryContainer: t.brandSecondarySubtle,
    onSecondaryContainer: t.textPrimary,
    error: t.errorMain,
    onError: t.onBrandPrimary,
    errorContainer: t.errorSubtle,
    onErrorContainer: t.textPrimary,
    surface: t.surfaceDefault,
    onSurface: t.textPrimary,
    surfaceContainerHighest: t.surfaceSunken,
    surfaceContainerHigh: t.surfaceRaised,
    surfaceContainerLow: t.surfaceBase,
    onSurfaceVariant: t.textSecondary,
    outline: t.borderDefault,
    outlineVariant: t.divider,
    scrim: t.surfaceScrim,
  );

  final textTheme = buildTextTheme(t.textPrimary, t.textSecondary);

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: t.surfaceBase,
    textTheme: textTheme,
    extensions: [t],
    dividerTheme: DividerThemeData(color: t.divider, thickness: 1, space: 1),
    iconTheme: IconThemeData(color: t.textSecondary),
    focusColor: t.focusRing,
    hoverColor: t.hoverOverlay,
    cardTheme: CardThemeData(
      color: t.surfaceDefault,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: t.borderDefault),
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: t.surfaceDefault,
      foregroundColor: t.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: Colors.transparent,
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: t.surfaceRaised,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: t.borderDefault),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: t.surfaceRaised,
      surfaceTintColor: Colors.transparent,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: t.surfaceSunken,
      hintStyle: TextStyle(color: t.textDisabled),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: BorderSide(color: t.borderDefault),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: BorderSide(color: t.borderDefault),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: BorderSide(color: t.focusRing, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(6),
        borderSide: BorderSide(color: t.errorMain),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: t.brandPrimary,
        foregroundColor: t.onBrandPrimary,
        textStyle: textTheme.labelLarge,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: t.brandPrimary,
        side: BorderSide(color: t.borderStrong),
        textStyle: textTheme.labelLarge,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: t.brandPrimary),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: t.surfaceSunken,
      side: BorderSide(color: t.borderDefault),
    ),
  );
}
