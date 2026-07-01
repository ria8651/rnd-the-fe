import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/session/session.dart';
import '../../data/stores/store.dart';
import '../../data/stores/store_repository.dart';
import '../../i18n/strings.dart';
import '../../theme/tokens.dart';
import 'bottom_bar.dart';
import 'nav.dart';
import 'sidebar.dart';
import 'sidebar_controller.dart';

/// The persistent application frame that wraps routed page content
/// (`chrome/00-overview.md`): primary nav (sidebar on desktop, drawer on
/// mobile/tablet), the bottom bar, and the page area.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, required this.child});
  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    // Adopt a default active store once the list loads.
    ref.listen<AsyncValue<List<Store>>>(storesProvider, (_, next) {
      final stores = next.valueOrNull;
      if (stores != null) {
        ref.read(storeSelectionProvider.notifier).ensureDefault(stores);
      }
    });

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final isMobile = width < kMobileBreakpoint;
        return isMobile ? _mobile(context) : _desktop(context, width);
      },
    );
  }

  Widget _desktop(BuildContext context, double width) {
    final expanded = ref.watch(sidebarProvider.notifier).isExpanded(width);
    // Watch raw state so toggles rebuild.
    ref.watch(sidebarProvider);
    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Sidebar(
                  expanded: expanded,
                  onToggle: () =>
                      ref.read(sidebarProvider.notifier).toggle(width),
                ),
                Expanded(child: _pageArea(context)),
              ],
            ),
          ),
          const BottomBar(compact: false),
        ],
      ),
    );
  }

  Widget _mobile(BuildContext context) {
    final s = ref.watch(stringsProvider);
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: const Text('open mSupply'),
      ),
      drawer: Drawer(
        backgroundColor: context.oms.surfaceNav,
        child: SafeArea(
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              NavList(
                  expanded: true,
                  items: upperNav,
                  onTapItem: () => Navigator.of(context).pop()),
              const Divider(height: 1),
              NavList(
                  expanded: true,
                  items: lowerNav,
                  onTapItem: () => Navigator.of(context).pop()),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.menu_book_outlined),
                title: Text(s.help),
                onTap: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ),
      body: _pageArea(context),
      bottomNavigationBar: const BottomBar(compact: true),
    );
  }

  Widget _pageArea(BuildContext context) {
    return Container(
      color: context.oms.surfaceBase,
      padding: const EdgeInsets.all(16),
      child: widget.child,
    );
  }
}
