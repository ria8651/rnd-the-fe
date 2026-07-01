import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/prefs.dart';
import 'languages.dart';

/// Active UI language, persisted per user (`chrome` AC-CH11). The spec calls for
/// a reload on change so all content re-renders; in a single-page Flutter app we
/// rebuild from the root instead (equivalent effect, no full page reload needed).
class LocaleController extends StateNotifier<AppLanguage> {
  LocaleController(this._prefs)
      : super(languageByCode(_prefs.getString(_key) ?? 'en'));

  static const _key = 'oms.language';
  final dynamic _prefs; // SharedPreferences

  void set(AppLanguage lang) {
    state = lang;
    _prefs.setString(_key, lang.code);
  }
}

final localeProvider =
    StateNotifierProvider<LocaleController, AppLanguage>((ref) {
  return LocaleController(ref.watch(sharedPreferencesProvider));
});
