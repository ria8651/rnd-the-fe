import 'package:flutter/material.dart';

import '../../i18n/strings.dart';

/// One navigation destination. The nav is a data-driven list of
/// (icon, label, route, visible?) entries in two groups (upper/lower) with
/// optional nested children — per `chrome/01-behaviours.md`, not a hard-coded
/// tree. `gated` lets a section be hidden by store-type/permission later.
class NavItem {
  const NavItem({
    required this.icon,
    required this.label,
    this.route,
    this.children = const [],
    this.gated = false,
  });

  final IconData icon;

  /// Resolves the display label against the active language.
  final String Function(AppStrings) label;

  /// Target route. Null for a pure parent (navigates to its first child).
  final String? route;
  final List<NavItem> children;
  final bool gated;

  String? get effectiveRoute => route ?? (children.isNotEmpty ? children.first.route : null);
}

/// Upper nav group (domain areas). Only Inventory → Stocktakes is wired to a
/// real page in this build; the rest are placeholders pending their verticals.
final upperNav = <NavItem>[
  NavItem(icon: Icons.dashboard_outlined, label: (s) => s.dashboard, route: '/dashboard'),
  NavItem(icon: Icons.sync_alt, label: (s) => s.replenishment, route: '/replenishment'),
  NavItem(
    icon: Icons.inventory_2_outlined,
    label: (s) => s.inventory,
    children: [
      NavItem(icon: Icons.fact_check_outlined, label: (s) => s.stocktakes, route: '/inventory/stocktakes'),
    ],
  ),
  NavItem(icon: Icons.local_shipping_outlined, label: (s) => s.distribution, route: '/distribution'),
  NavItem(icon: Icons.medication_outlined, label: (s) => s.dispensary, route: '/dispensary'),
  NavItem(icon: Icons.ac_unit, label: (s) => s.coldChain, route: '/cold-chain'),
  NavItem(icon: Icons.assignment_outlined, label: (s) => s.programs, route: '/programs'),
  NavItem(icon: Icons.summarize_outlined, label: (s) => s.reports, route: '/reports'),
];

/// Lower nav group (catalogue/manage/settings/sync/help).
final lowerNav = <NavItem>[
  NavItem(icon: Icons.menu_book_outlined, label: (s) => s.catalogue, route: '/catalogue'),
  NavItem(icon: Icons.tune, label: (s) => s.manage, route: '/manage'),
  NavItem(icon: Icons.settings_outlined, label: (s) => s.settings, route: '/settings'),
  NavItem(icon: Icons.cloud_sync_outlined, label: (s) => s.syncStatus, route: '/sync'),
  NavItem(icon: Icons.help_outline, label: (s) => s.help, route: '/help'),
];
