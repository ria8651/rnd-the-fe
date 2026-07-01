import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Stand-in for routes whose vertical isn't built yet. Keeps the shell
/// navigable so the foundations (theme, nav, selectors) can be reviewed.
class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({super.key, required this.title, this.note});

  final String title;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.construction, size: 40, color: context.oms.textDisabled),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 6),
          Text(note ?? 'Coming in a later stage',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: context.oms.textSecondary)),
        ],
      ),
    );
  }
}
