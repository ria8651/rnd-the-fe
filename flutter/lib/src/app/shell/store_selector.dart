import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/session/session.dart';
import '../../data/stores/store.dart';
import '../../data/stores/store_repository.dart';
import '../../i18n/strings.dart';
import '../../theme/tokens.dart';
import '../router.dart';

/// Opens the store selector (`chrome` AC-CH5..AC-CH9). Listed sorted by name
/// (the query sorts) and searchable; the current and disabled stores are not
/// selectable; choosing one switches the active store and navigates to root.
Future<void> showStoreSelector(BuildContext context) {
  return showDialog(
    context: context,
    builder: (_) => const _StoreSelectorDialog(),
  );
}

class _StoreSelectorDialog extends ConsumerStatefulWidget {
  const _StoreSelectorDialog();

  @override
  ConsumerState<_StoreSelectorDialog> createState() => _StoreSelectorState();
}

class _StoreSelectorState extends ConsumerState<_StoreSelectorDialog> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(stringsProvider);
    final oms = context.oms;
    final stores = ref.watch(storesProvider).valueOrNull ?? const <Store>[];
    final currentId = ref.watch(storeSelectionProvider);
    final filtered = stores
        .where((st) => st.name.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420, maxHeight: 540),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                autofocus: true,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: s.searchStores,
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            const Divider(height: 1),
            Flexible(
              child: filtered.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(s.noStores,
                          style: TextStyle(color: oms.textSecondary)),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      itemBuilder: (context, i) {
                        final st = filtered[i];
                        final isCurrent = st.id == currentId;
                        // Disabled stores are filtered out at the repository,
                        // so only "current" is unselectable here.
                        return ListTile(
                          leading: Icon(
                            isCurrent ? Icons.home : Icons.storefront_outlined,
                            color: isCurrent ? oms.brandPrimary : null,
                          ),
                          title: Text(st.name),
                          subtitle: Text(st.code),
                          trailing: isCurrent
                              ? Icon(Icons.check, color: oms.brandPrimary)
                              : null,
                          enabled: !isCurrent,
                          onTap: isCurrent
                              ? null
                              : () {
                                  ref
                                      .read(storeSelectionProvider.notifier)
                                      .select(st.id);
                                  Navigator.of(context).pop();
                                  context.go(kRootPath);
                                },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
