import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Provides the loaded [SharedPreferences]. Overridden in `main()` after the
/// instance is available, so the rest of the app can read it synchronously.
/// On web this is backed by `localStorage`.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('sharedPreferencesProvider not overridden'),
);
