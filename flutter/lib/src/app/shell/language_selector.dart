import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../i18n/languages.dart';
import '../../i18n/locale_controller.dart';
import '../../theme/tokens.dart';

/// Opens the language selector (`chrome` AC-CH10..AC-CH12). The current language
/// is not selectable; choosing one persists it and re-renders the app (Flutter
/// rebuilds from root rather than a full page reload). RTL languages flip the
/// layout direction via the root [Directionality].
Future<void> showLanguageSelector(BuildContext context) {
  return showDialog(
    context: context,
    builder: (_) => const _LanguageDialog(),
  );
}

class _LanguageDialog extends ConsumerWidget {
  const _LanguageDialog();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(localeProvider);
    final oms = context.oms;
    return Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final lang in supportedLanguages)
              ListTile(
                title: Text(lang.name),
                trailing: lang.code == current.code
                    ? Icon(Icons.check, color: oms.brandPrimary)
                    : (lang.isRtl
                        ? Text('RTL', style: TextStyle(color: oms.textDisabled))
                        : null),
                enabled: lang.code != current.code,
                onTap: lang.code == current.code
                    ? null
                    : () {
                        ref.read(localeProvider.notifier).set(lang);
                        Navigator.of(context).pop();
                      },
              ),
          ],
        ),
      ),
    );
  }
}
