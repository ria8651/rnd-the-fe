import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../i18n/locale_controller.dart';
import '../theme/app_theme.dart';
import '../theme/theme_controller.dart';
import 'router.dart';

/// Root application widget. Wires theming (light/dark + mode), routing, and the
/// active locale (including RTL direction flipping per `chrome` AC-CH12).
class OmsApp extends ConsumerWidget {
  const OmsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final mode = ref.watch(themeModeProvider);
    final lang = ref.watch(localeProvider);

    return MaterialApp.router(
      title: 'open mSupply',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: mode,
      locale: lang.locale,
      routerConfig: router,
      builder: (context, child) {
        // Apply the language's text direction app-wide.
        return Directionality(
          textDirection: lang.isRtl ? TextDirection.rtl : TextDirection.ltr,
          child: child!,
        );
      },
    );
  }
}
