import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../i18n/strings.dart';
import 'placeholder_page.dart';
import 'shell/app_shell.dart';

/// The root landing path used after a store switch (`chrome` AC-CH8).
const String kRootPath = '/dashboard';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: kRootPath,
    routes: [
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          _page('/dashboard', (s) => s.dashboard),
          _page('/replenishment', (s) => s.replenishment),
          _page('/inventory/stocktakes', (s) => s.stocktakes,
              note: 'List screen (S1) — Stage 2'),
          _page('/distribution', (s) => s.distribution),
          _page('/dispensary', (s) => s.dispensary),
          _page('/cold-chain', (s) => s.coldChain),
          _page('/programs', (s) => s.programs),
          _page('/reports', (s) => s.reports),
          _page('/catalogue', (s) => s.catalogue),
          _page('/manage', (s) => s.manage),
          _page('/settings', (s) => s.settings),
          _page('/sync', (s) => s.syncStatus),
          _page('/help', (s) => s.help),
        ],
      ),
    ],
  );
});

GoRoute _page(String path, String Function(AppStrings) title, {String? note}) {
  return GoRoute(
    path: path,
    pageBuilder: (context, state) {
      return NoTransitionPage(
        child: Consumer(
          builder: (context, ref, _) => PlaceholderPage(
            title: title(ref.watch(stringsProvider)),
            note: note,
          ),
        ),
      );
    },
  );
}
