import 'dart:ui';

/// A selectable UI language. `isRtl` drives layout-direction flipping
/// (`chrome` AC-CH12).
class AppLanguage {
  const AppLanguage(this.code, this.name, {this.isRtl = false});
  final String code;
  final String name;
  final bool isRtl;

  Locale get locale => Locale(code);
}

/// The languages the shell offers. A representative subset of open-mSupply's
/// catalogue, including one RTL language (Arabic) to exercise direction flips.
/// Full translation catalogues are introduced with the real i18n toolchain in a
/// later pass; for now each language maps a handful of shell strings.
const supportedLanguages = <AppLanguage>[
  AppLanguage('en', 'English'),
  AppLanguage('fr', 'Français'),
  AppLanguage('es', 'Español'),
  AppLanguage('pt', 'Português'),
  AppLanguage('ar', 'العربية', isRtl: true),
];

AppLanguage languageByCode(String code) =>
    supportedLanguages.firstWhere((l) => l.code == code,
        orElse: () => supportedLanguages.first);
