import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../i18n/strings.dart';
import '../../theme/tokens.dart';
import 'nav.dart';

/// Desktop primary nav: a collapsible left rail (icon-only ↔ expanded with
/// labels). Active route highlighted with the brand accent. The mobile/tablet
/// variant lives in the drawer (see [NavList]).
class Sidebar extends ConsumerWidget {
  const Sidebar({super.key, required this.expanded, required this.onToggle});

  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final oms = context.oms;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: expanded ? 232 : 64,
      decoration: BoxDecoration(
        color: oms.surfaceNav,
        border: Border(right: BorderSide(color: oms.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Header(expanded: expanded, onToggle: onToggle),
          Expanded(
            child: SingleChildScrollView(
              child: NavList(expanded: expanded, items: upperNav),
            ),
          ),
          Divider(height: 1, color: oms.divider),
          NavList(expanded: expanded, items: lowerNav),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.expanded, required this.onToggle});
  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: Row(
        children: [
          const SizedBox(width: 12),
          if (expanded) ...[
            Icon(Icons.medical_services, color: context.oms.brandPrimary),
            const SizedBox(width: 8),
            Expanded(
              child: Text('open mSupply',
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(color: context.oms.textPrimary),
                  overflow: TextOverflow.ellipsis),
            ),
          ] else
            const Spacer(),
          IconButton(
            tooltip: expanded ? 'Collapse' : 'Expand',
            onPressed: onToggle,
            icon: Icon(expanded ? Icons.menu_open : Icons.menu),
          ),
          const SizedBox(width: 4),
        ],
      ),
    );
  }
}

/// Renders a group of [NavItem]s (with one level of children), shared by the
/// desktop rail and the mobile drawer.
class NavList extends ConsumerWidget {
  const NavList(
      {super.key,
      required this.expanded,
      required this.items,
      this.onTapItem});

  final bool expanded;
  final List<NavItem> items;
  final VoidCallback? onTapItem;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(stringsProvider);
    final location = GoRouterState.of(context).matchedLocation;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final item in items.where((i) => !i.gated))
          ..._buildItem(context, ref, s, item, location),
      ],
    );
  }

  List<Widget> _buildItem(BuildContext context, WidgetRef ref, AppStrings s,
      NavItem item, String location) {
    final hasChildren = item.children.isNotEmpty;
    final selfActive = item.route != null && location == item.route;
    final childActive =
        hasChildren && item.children.any((c) => c.route == location);

    final tiles = <Widget>[
      _NavTile(
        icon: item.icon,
        label: item.label(s),
        expanded: expanded,
        active: selfActive || (childActive && !expanded),
        onTap: () {
          final route = item.effectiveRoute;
          if (route != null) context.go(route);
          onTapItem?.call();
        },
      ),
    ];

    if (hasChildren && expanded) {
      for (final child in item.children.where((c) => !c.gated)) {
        tiles.add(_NavTile(
          icon: child.icon,
          label: child.label(s),
          expanded: expanded,
          active: location == child.route,
          indent: true,
          onTap: () {
            if (child.route != null) context.go(child.route!);
            onTapItem?.call();
          },
        ));
      }
    }
    return tiles;
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.expanded,
    required this.active,
    required this.onTap,
    this.indent = false,
  });

  final IconData icon;
  final String label;
  final bool expanded;
  final bool active;
  final bool indent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final oms = context.oms;
    final fg = active ? oms.brandPrimary : oms.textSecondary;
    final tile = Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: active ? oms.brandPrimarySubtle : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(
              horizontal: 12, vertical: expanded ? 10 : 12),
          child: Row(
            mainAxisAlignment:
                expanded ? MainAxisAlignment.start : MainAxisAlignment.center,
            children: [
              if (indent && expanded) const SizedBox(width: 16),
              Icon(icon, size: 20, color: fg),
              if (expanded) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(label,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: active ? oms.brandPrimary : oms.textPrimary,
                            fontWeight:
                                active ? FontWeight.w600 : FontWeight.w400,
                          )),
                ),
              ],
            ],
          ),
        ),
      ),
    );
    if (expanded) return tile;
    return Tooltip(message: label, child: tile);
  }
}
