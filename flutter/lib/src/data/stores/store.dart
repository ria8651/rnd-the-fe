/// A store the user can operate within. Operations are scoped to a store id.
class Store {
  const Store({
    required this.id,
    required this.code,
    required this.name,
    required this.isDisabled,
  });

  final String id;
  final String code;
  final String name;
  final bool isDisabled;

  factory Store.fromJson(Map<String, dynamic> json) => Store(
        id: json['id'] as String,
        code: (json['code'] as String?) ?? '',
        name: (json['storeName'] as String?) ?? '',
        isDisabled: (json['isDisabled'] as bool?) ?? false,
      );
}
