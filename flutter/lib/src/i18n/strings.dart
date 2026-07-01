import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'locale_controller.dart';

/// Minimal string catalogue for the app shell. English is complete; other
/// languages override a subset and fall back to English. This is a deliberate
/// placeholder for the full i18n toolchain (gen_l10n/ARB), enough to prove the
/// language switch re-renders content (`chrome` AC-CH11).
class AppStrings {
  AppStrings(this.code);
  final String code;

  String _t(String key) =>
      _catalog[code]?[key] ?? _catalog['en']![key] ?? key;

  // Nav sections
  String get dashboard => _t('dashboard');
  String get replenishment => _t('replenishment');
  String get inventory => _t('inventory');
  String get distribution => _t('distribution');
  String get dispensary => _t('dispensary');
  String get coldChain => _t('coldChain');
  String get programs => _t('programs');
  String get reports => _t('reports');
  String get catalogue => _t('catalogue');
  String get manage => _t('manage');
  String get settings => _t('settings');
  String get syncStatus => _t('syncStatus');
  String get help => _t('help');
  String get stocktakes => _t('stocktakes');

  // Shell / bottom bar
  String get changeStore => _t('changeStore');
  String get changeLanguage => _t('changeLanguage');
  String get theme => _t('theme');
  String get logout => _t('logout');
  String get logoutConfirmTitle => _t('logoutConfirmTitle');
  String get logoutConfirmBody => _t('logoutConfirmBody');
  String get cancel => _t('cancel');
  String get confirm => _t('confirm');
  String get searchStores => _t('searchStores');
  String get rememberChoice => _t('rememberChoice');
  String get noStores => _t('noStores');
}

const _catalog = <String, Map<String, String>>{
  'en': {
    'dashboard': 'Dashboard',
    'replenishment': 'Replenishment',
    'inventory': 'Inventory',
    'distribution': 'Distribution',
    'dispensary': 'Dispensary',
    'coldChain': 'Cold Chain',
    'programs': 'Programs',
    'reports': 'Reports',
    'catalogue': 'Catalogue',
    'manage': 'Manage',
    'settings': 'Settings',
    'syncStatus': 'Sync status',
    'help': 'Help',
    'stocktakes': 'Stocktakes',
    'changeStore': 'Change store',
    'changeLanguage': 'Change language',
    'theme': 'Theme',
    'logout': 'Logout',
    'logoutConfirmTitle': 'Log out?',
    'logoutConfirmBody': 'You will be returned to the login screen.',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'searchStores': 'Search stores',
    'rememberChoice': 'Remember choice',
    'noStores': 'No stores available',
  },
  'fr': {
    'dashboard': 'Tableau de bord',
    'replenishment': 'Réapprovisionnement',
    'inventory': 'Inventaire',
    'distribution': 'Distribution',
    'dispensary': 'Dispensaire',
    'coldChain': 'Chaîne du froid',
    'programs': 'Programmes',
    'reports': 'Rapports',
    'catalogue': 'Catalogue',
    'manage': 'Gérer',
    'settings': 'Paramètres',
    'syncStatus': 'État de synchronisation',
    'help': 'Aide',
    'stocktakes': 'Inventaires',
    'changeStore': 'Changer de magasin',
    'changeLanguage': 'Changer de langue',
    'theme': 'Thème',
    'logout': 'Déconnexion',
    'logoutConfirmTitle': 'Se déconnecter ?',
    'logoutConfirmBody': 'Vous serez renvoyé à l\'écran de connexion.',
    'cancel': 'Annuler',
    'confirm': 'Confirmer',
    'searchStores': 'Rechercher des magasins',
    'rememberChoice': 'Mémoriser le choix',
    'noStores': 'Aucun magasin disponible',
  },
  'es': {
    'dashboard': 'Panel',
    'inventory': 'Inventario',
    'distribution': 'Distribución',
    'dispensary': 'Farmacia',
    'reports': 'Informes',
    'settings': 'Configuración',
    'stocktakes': 'Recuentos',
    'changeStore': 'Cambiar almacén',
    'changeLanguage': 'Cambiar idioma',
    'logout': 'Cerrar sesión',
  },
  'pt': {
    'dashboard': 'Painel',
    'inventory': 'Inventário',
    'stocktakes': 'Contagens',
    'changeStore': 'Mudar de loja',
    'changeLanguage': 'Mudar idioma',
    'logout': 'Sair',
  },
  'ar': {
    'dashboard': 'لوحة القيادة',
    'inventory': 'المخزون',
    'distribution': 'التوزيع',
    'dispensary': 'الصيدلية',
    'reports': 'التقارير',
    'settings': 'الإعدادات',
    'stocktakes': 'الجرد',
    'changeStore': 'تغيير المتجر',
    'changeLanguage': 'تغيير اللغة',
    'logout': 'تسجيل الخروج',
  },
};

final stringsProvider = Provider<AppStrings>((ref) {
  return AppStrings(ref.watch(localeProvider).code);
});
