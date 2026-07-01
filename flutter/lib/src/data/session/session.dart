import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../prefs.dart';
import '../stores/store.dart';
import '../stores/store_repository.dart';

/// The signed-in user, as consumed by the chrome (`chrome/00-overview.md`).
/// The dev server has auth disabled and `me()` returns no account, so we supply
/// a development stub. When auth is implemented this comes from `me()`.
class AppUser {
  const AppUser({
    required this.username,
    required this.email,
    required this.jobTitle,
  });

  final String username;
  final String email;
  final String jobTitle;
}

final currentUserProvider = Provider<AppUser>((ref) => const AppUser(
      username: 'admin',
      email: 'admin@msupply.foundation',
      jobTitle: 'Store manager (dev)',
    ));

/// The active store id, persisted across sessions. Defaults to the first
/// available store once the store list loads.
class StoreSelectionController extends StateNotifier<String?> {
  StoreSelectionController(this._prefs) : super(_prefs.getString(_key));

  static const _key = 'oms.storeId';
  final dynamic _prefs; // SharedPreferences

  void select(String id) {
    state = id;
    _prefs.setString(_key, id);
  }

  /// Adopt a default (first store) only if nothing is selected yet.
  void ensureDefault(List<Store> stores) {
    if (state == null && stores.isNotEmpty) {
      select(stores.first.id);
    }
  }
}

final storeSelectionProvider =
    StateNotifierProvider<StoreSelectionController, String?>((ref) {
  return StoreSelectionController(ref.watch(sharedPreferencesProvider));
});

/// The resolved active [Store], or null while the store list is still loading
/// or if the persisted id no longer exists.
final currentStoreProvider = Provider<Store?>((ref) {
  final id = ref.watch(storeSelectionProvider);
  final stores = ref.watch(storesProvider).valueOrNull;
  if (id == null || stores == null) return null;
  for (final s in stores) {
    if (s.id == id) return s;
  }
  return null;
});
