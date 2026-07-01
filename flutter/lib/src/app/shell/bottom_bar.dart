import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/session/session.dart';
import '../../data/stores/store_repository.dart';
import '../../i18n/locale_controller.dart';
import '../../i18n/strings.dart';
import '../../theme/theme_controller.dart';
import '../../theme/tokens.dart';
import 'language_selector.dart';
import 'store_selector.dart';

/// Persistent footer (`chrome/01-behaviours.md` › Bottom bar): store selector,
/// user/logout, language selector, and a theme toggle. Condenses on
/// extra-small screens (icon-over-label).
class BottomBar extends ConsumerWidget {
  const BottomBar({super.key, required this.compact});

  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final oms = context.oms;
    final s = ref.watch(stringsProvider);
    final store = ref.watch(currentStoreProvider);
    final storeCount = ref.watch(storesProvider).valueOrNull?.length ?? 0;
    final user = ref.watch(currentUserProvider);
    final lang = ref.watch(localeProvider);
    final mode = ref.watch(themeModeProvider);

    return Container(
      decoration: BoxDecoration(
        color: oms.surfaceNav,
        border: Border(top: BorderSide(color: oms.divider)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: [
          _BarButton(
            icon: Icons.home_outlined,
            label: store?.name ?? '—',
            compact: compact,
            // Selector hidden when fewer than 2 stores (AC-CH5).
            onTap: storeCount < 2 ? null : () => showStoreSelector(context),
          ),
          const Spacer(),
          _BarButton(
            icon: Icons.person_outline,
            label: user.username,
            compact: compact,
            onTap: () => _showUserMenu(context, ref, user, s),
          ),
          _BarButton(
            icon: Icons.translate,
            label: lang.name,
            compact: compact,
            onTap: () => showLanguageSelector(context),
          ),
          _BarButton(
            icon: switch (mode) {
              ThemeMode.system => Icons.brightness_auto_outlined,
              ThemeMode.light => Icons.light_mode_outlined,
              ThemeMode.dark => Icons.dark_mode_outlined,
            },
            label: mode.name,
            compact: compact,
            onTap: () => ref.read(themeModeProvider.notifier).cycle(),
          ),
        ],
      ),
    );
  }

  void _showUserMenu(
      BuildContext context, WidgetRef ref, AppUser user, AppStrings s) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 320),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user.username,
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(user.email,
                    style: Theme.of(context).textTheme.bodySmall),
                Text(user.jobTitle,
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 16),
                Align(
                  alignment: AlignmentDirectional.centerEnd,
                  child: FilledButton.icon(
                    icon: const Icon(Icons.logout, size: 18),
                    label: Text(s.logout),
                    onPressed: () {
                      Navigator.of(context).pop();
                      _confirmLogout(context, ref, s);
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref, AppStrings s) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(s.logoutConfirmTitle),
        content: Text(s.logoutConfirmBody),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(s.cancel)),
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              // No auth in dev — surface the intent honestly.
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content:
                    Text('Logout confirmed (dev server has no auth/login).'),
              ));
            },
            child: Text(s.confirm),
          ),
        ],
      ),
    );
  }
}

class _BarButton extends StatelessWidget {
  const _BarButton({
    required this.icon,
    required this.label,
    required this.compact,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final bool compact;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final oms = context.oms;
    final disabled = onTap == null;
    final color = disabled ? oms.textDisabled : oms.textSecondary;
    final content = compact
        ? Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 2),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context)
                    .textTheme
                    .labelSmall
                    ?.copyWith(color: color)),
          ])
        : Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 8),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 180),
              child: Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodyMedium
                      ?.copyWith(color: color)),
            ),
          ]);

    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.symmetric(
            horizontal: 12, vertical: compact ? 4 : 10),
        child: content,
      ),
    );
  }
}
