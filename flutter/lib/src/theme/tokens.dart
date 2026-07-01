import 'package:flutter/material.dart';

/// Semantic colour tokens for the open-mSupply UI, per
/// `spec/ui-standards/theming.md`. Components reference *roles* (surface, text,
/// state…) — never raw hex at call sites. Light values come from the current
/// app's brand palette; dark values are the spec's proposed baseline.
///
/// Exposed as a [ThemeExtension] so widgets read them with
/// `Theme.of(context).extension<OmsColors>()!` (see [OmsColorsX]).
@immutable
class OmsColors extends ThemeExtension<OmsColors> {
  const OmsColors({
    required this.brandPrimary,
    required this.brandPrimaryHover,
    required this.brandPrimarySubtle,
    required this.onBrandPrimary,
    required this.brandSecondary,
    required this.brandSecondaryHover,
    required this.brandSecondarySubtle,
    required this.surfaceBase,
    required this.surfaceDefault,
    required this.surfaceRaised,
    required this.surfaceSunken,
    required this.surfaceNav,
    required this.surfaceScrim,
    required this.textPrimary,
    required this.textSecondary,
    required this.textDisabled,
    required this.textLink,
    required this.textInverse,
    required this.borderDefault,
    required this.borderStrong,
    required this.divider,
    required this.errorMain,
    required this.errorSubtle,
    required this.warningMain,
    required this.warningSubtle,
    required this.successMain,
    required this.successSubtle,
    required this.infoMain,
    required this.infoSubtle,
    required this.focusRing,
    required this.hoverOverlay,
    required this.selected,
    required this.selectedHover,
  });

  // Brand
  final Color brandPrimary;
  final Color brandPrimaryHover;
  final Color brandPrimarySubtle;
  final Color onBrandPrimary;
  final Color brandSecondary;
  final Color brandSecondaryHover;
  final Color brandSecondarySubtle;

  // Surfaces
  final Color surfaceBase;
  final Color surfaceDefault;
  final Color surfaceRaised;
  final Color surfaceSunken;
  final Color surfaceNav;
  final Color surfaceScrim;

  // Text
  final Color textPrimary;
  final Color textSecondary;
  final Color textDisabled;
  final Color textLink;
  final Color textInverse;

  // Borders & dividers
  final Color borderDefault;
  final Color borderStrong;
  final Color divider;

  // State (main + subtle)
  final Color errorMain;
  final Color errorSubtle;
  final Color warningMain;
  final Color warningSubtle;
  final Color successMain;
  final Color successSubtle;
  final Color infoMain;
  final Color infoSubtle;

  // Interaction
  final Color focusRing;
  final Color hoverOverlay;
  final Color selected;
  final Color selectedHover;

  static const light = OmsColors(
    brandPrimary: Color(0xFFE95C30),
    brandPrimaryHover: Color(0xFFC43C11),
    brandPrimarySubtle: Color(0xFFFCEAE3),
    onBrandPrimary: Color(0xFFFFFFFF),
    brandSecondary: Color(0xFF3E7BFA),
    brandSecondaryHover: Color(0xFF3568D4),
    brandSecondarySubtle: Color(0xFFE8F1FE),
    surfaceBase: Color(0xFFF2F2F5),
    surfaceDefault: Color(0xFFFFFFFF),
    surfaceRaised: Color(0xFFFFFFFF),
    surfaceSunken: Color(0xFFFAFAFC),
    surfaceNav: Color(0xFFF2F2F5),
    surfaceScrim: Color(0x80000000),
    textPrimary: Color(0xFF1C1C28),
    textSecondary: Color(0xFF555770),
    textDisabled: Color(0xFF8F90A6),
    textLink: Color(0xFF3568D4),
    textInverse: Color(0xFFFFFFFF),
    borderDefault: Color(0xFFE4E4EB),
    borderStrong: Color(0xFFCBCED4),
    divider: Color(0xFFEAEAEA),
    errorMain: Color(0xFFE63535),
    errorSubtle: Color(0xFFFFCDCE),
    warningMain: Color(0xFFE1A200),
    warningSubtle: Color(0xFFFCF1D4),
    successMain: Color(0xFF69A607),
    successSubtle: Color(0xFFEDF7ED),
    infoMain: Color(0xFF3E7BFA),
    infoSubtle: Color(0xFFE8F1FE),
    focusRing: Color(0xFFE95C30),
    hoverOverlay: Color(0x0A000000),
    selected: Color(0xFFE8F1FE),
    selectedHover: Color(0xFFD2DFFF),
  );

  static const dark = OmsColors(
    brandPrimary: Color(0xFFF2774B),
    brandPrimaryHover: Color(0xFFE95C30),
    brandPrimarySubtle: Color(0x29E95C30),
    onBrandPrimary: Color(0xFFFFFFFF),
    brandSecondary: Color(0xFF6B9BFF),
    brandSecondaryHover: Color(0xFF3E7BFA),
    brandSecondarySubtle: Color(0x2E3E7BFA),
    surfaceBase: Color(0xFF16161D),
    surfaceDefault: Color(0xFF1F2029),
    surfaceRaised: Color(0xFF262732),
    surfaceSunken: Color(0xFF14141A),
    surfaceNav: Color(0xFF1A1B23),
    surfaceScrim: Color(0x99000000),
    textPrimary: Color(0xFFF2F2F5),
    textSecondary: Color(0xFFA4A7B5),
    textDisabled: Color(0xFF6A6D7E),
    textLink: Color(0xFF6B9BFF),
    textInverse: Color(0xFF16161D),
    borderDefault: Color(0xFF33343F),
    borderStrong: Color(0xFF454654),
    divider: Color(0xFF2A2B36),
    errorMain: Color(0xFFFF6B6B),
    errorSubtle: Color(0x2EE63535),
    warningMain: Color(0xFFF2B43C),
    warningSubtle: Color(0x2EE1A200),
    successMain: Color(0xFF8FCB3A),
    successSubtle: Color(0x2E69A607),
    infoMain: Color(0xFF6B9BFF),
    infoSubtle: Color(0x2E3E7BFA),
    focusRing: Color(0xFFF2774B),
    hoverOverlay: Color(0x0FFFFFFF),
    selected: Color(0x3D3E7BFA),
    selectedHover: Color(0x523E7BFA),
  );

  @override
  OmsColors copyWith({
    Color? brandPrimary,
    Color? brandPrimaryHover,
    Color? brandPrimarySubtle,
    Color? onBrandPrimary,
    Color? brandSecondary,
    Color? brandSecondaryHover,
    Color? brandSecondarySubtle,
    Color? surfaceBase,
    Color? surfaceDefault,
    Color? surfaceRaised,
    Color? surfaceSunken,
    Color? surfaceNav,
    Color? surfaceScrim,
    Color? textPrimary,
    Color? textSecondary,
    Color? textDisabled,
    Color? textLink,
    Color? textInverse,
    Color? borderDefault,
    Color? borderStrong,
    Color? divider,
    Color? errorMain,
    Color? errorSubtle,
    Color? warningMain,
    Color? warningSubtle,
    Color? successMain,
    Color? successSubtle,
    Color? infoMain,
    Color? infoSubtle,
    Color? focusRing,
    Color? hoverOverlay,
    Color? selected,
    Color? selectedHover,
  }) {
    return OmsColors(
      brandPrimary: brandPrimary ?? this.brandPrimary,
      brandPrimaryHover: brandPrimaryHover ?? this.brandPrimaryHover,
      brandPrimarySubtle: brandPrimarySubtle ?? this.brandPrimarySubtle,
      onBrandPrimary: onBrandPrimary ?? this.onBrandPrimary,
      brandSecondary: brandSecondary ?? this.brandSecondary,
      brandSecondaryHover: brandSecondaryHover ?? this.brandSecondaryHover,
      brandSecondarySubtle: brandSecondarySubtle ?? this.brandSecondarySubtle,
      surfaceBase: surfaceBase ?? this.surfaceBase,
      surfaceDefault: surfaceDefault ?? this.surfaceDefault,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
      surfaceSunken: surfaceSunken ?? this.surfaceSunken,
      surfaceNav: surfaceNav ?? this.surfaceNav,
      surfaceScrim: surfaceScrim ?? this.surfaceScrim,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textDisabled: textDisabled ?? this.textDisabled,
      textLink: textLink ?? this.textLink,
      textInverse: textInverse ?? this.textInverse,
      borderDefault: borderDefault ?? this.borderDefault,
      borderStrong: borderStrong ?? this.borderStrong,
      divider: divider ?? this.divider,
      errorMain: errorMain ?? this.errorMain,
      errorSubtle: errorSubtle ?? this.errorSubtle,
      warningMain: warningMain ?? this.warningMain,
      warningSubtle: warningSubtle ?? this.warningSubtle,
      successMain: successMain ?? this.successMain,
      successSubtle: successSubtle ?? this.successSubtle,
      infoMain: infoMain ?? this.infoMain,
      infoSubtle: infoSubtle ?? this.infoSubtle,
      focusRing: focusRing ?? this.focusRing,
      hoverOverlay: hoverOverlay ?? this.hoverOverlay,
      selected: selected ?? this.selected,
      selectedHover: selectedHover ?? this.selectedHover,
    );
  }

  @override
  OmsColors lerp(covariant OmsColors? other, double t) {
    if (other == null) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return OmsColors(
      brandPrimary: c(brandPrimary, other.brandPrimary),
      brandPrimaryHover: c(brandPrimaryHover, other.brandPrimaryHover),
      brandPrimarySubtle: c(brandPrimarySubtle, other.brandPrimarySubtle),
      onBrandPrimary: c(onBrandPrimary, other.onBrandPrimary),
      brandSecondary: c(brandSecondary, other.brandSecondary),
      brandSecondaryHover: c(brandSecondaryHover, other.brandSecondaryHover),
      brandSecondarySubtle: c(brandSecondarySubtle, other.brandSecondarySubtle),
      surfaceBase: c(surfaceBase, other.surfaceBase),
      surfaceDefault: c(surfaceDefault, other.surfaceDefault),
      surfaceRaised: c(surfaceRaised, other.surfaceRaised),
      surfaceSunken: c(surfaceSunken, other.surfaceSunken),
      surfaceNav: c(surfaceNav, other.surfaceNav),
      surfaceScrim: c(surfaceScrim, other.surfaceScrim),
      textPrimary: c(textPrimary, other.textPrimary),
      textSecondary: c(textSecondary, other.textSecondary),
      textDisabled: c(textDisabled, other.textDisabled),
      textLink: c(textLink, other.textLink),
      textInverse: c(textInverse, other.textInverse),
      borderDefault: c(borderDefault, other.borderDefault),
      borderStrong: c(borderStrong, other.borderStrong),
      divider: c(divider, other.divider),
      errorMain: c(errorMain, other.errorMain),
      errorSubtle: c(errorSubtle, other.errorSubtle),
      warningMain: c(warningMain, other.warningMain),
      warningSubtle: c(warningSubtle, other.warningSubtle),
      successMain: c(successMain, other.successMain),
      successSubtle: c(successSubtle, other.successSubtle),
      infoMain: c(infoMain, other.infoMain),
      infoSubtle: c(infoSubtle, other.infoSubtle),
      focusRing: c(focusRing, other.focusRing),
      hoverOverlay: c(hoverOverlay, other.hoverOverlay),
      selected: c(selected, other.selected),
      selectedHover: c(selectedHover, other.selectedHover),
    );
  }
}

/// Convenience accessor: `context.oms.brandPrimary`.
extension OmsColorsX on BuildContext {
  OmsColors get oms => Theme.of(this).extension<OmsColors>()!;
}
