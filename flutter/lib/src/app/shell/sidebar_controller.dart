import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/prefs.dart';

/// Viewport width at/below which the sidebar auto-collapses until the user
/// overrides (`chrome` AC-CH2). Below [kMobileBreakpoint] the shell switches to
/// the mobile top-bar + drawer layout entirely.
const double kMediumBreakpoint = 1024;
const double kMobileBreakpoint = 720;

/// Holds the user's explicit sidebar preference (null = "not set", follow the
/// responsive default). Persisted so the choice survives navigation/reload
/// (`chrome` AC-CH1).
class SidebarController extends StateNotifier<bool?> {
  SidebarController(this._prefs) : super(_read(_prefs));

  static const _key = 'oms.sidebarExpanded';
  final SharedPreferences _prefs;

  static bool? _read(SharedPreferences prefs) {
    if (!prefs.containsKey(_key)) return null;
    return prefs.getBool(_key);
  }

  /// Effective expansion given the current viewport width and any user override.
  bool isExpanded(double width) => state ?? (width > kMediumBreakpoint);

  /// Toggle relative to what's currently shown, recording an explicit choice.
  void toggle(double width) {
    final next = !isExpanded(width);
    state = next;
    _prefs.setBool(_key, next);
  }
}

final sidebarProvider =
    StateNotifierProvider<SidebarController, bool?>((ref) {
  return SidebarController(ref.watch(sharedPreferencesProvider));
});
