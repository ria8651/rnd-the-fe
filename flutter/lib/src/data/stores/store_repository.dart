import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql/client.dart' hide Store;

import '../graphql/client.dart';
import 'store.dart';

/// Thin adapter over the GraphQL `stores` query. Keeping the network shape
/// behind a repository keeps widgets/providers testable and decoupled from the
/// transport.
class StoreRepository {
  StoreRepository(this._client);

  final GraphQLClient _client;

  static const _storesQuery = r'''
    query stores($first: Int!) {
      stores(page: { first: $first }, sort: { key: name }) {
        ... on StoreConnector {
          totalCount
          nodes { id code storeName isDisabled }
        }
      }
    }
  ''';

  Future<List<Store>> fetchStores({int first = 200}) async {
    final result = await _client.query(QueryOptions(
      document: gql(_storesQuery),
      variables: {'first': first},
    ));
    if (result.hasException) {
      throw result.exception!;
    }
    final nodes = (result.data?['stores']?['nodes'] as List?) ?? const [];
    return nodes
        .cast<Map<String, dynamic>>()
        .map(Store.fromJson)
        .where((s) => !s.isDisabled)
        .toList();
  }

  /// Quick store-scoped probe used by the Stage 0 connectivity screen.
  Future<int> stocktakeCount(String storeId) async {
    final result = await _client.query(QueryOptions(
      document: gql(r'''
        query stocktakeCount($storeId: String!) {
          stocktakes(storeId: $storeId, page: { first: 1 }) {
            ... on StocktakeConnector { totalCount }
          }
        }
      '''),
      variables: {'storeId': storeId},
    ));
    if (result.hasException) {
      throw result.exception!;
    }
    return (result.data?['stocktakes']?['totalCount'] as int?) ?? 0;
  }
}

final storeRepositoryProvider = Provider<StoreRepository>(
  (ref) => StoreRepository(ref.watch(graphQLClientProvider)),
);

final storesProvider = FutureProvider<List<Store>>(
  (ref) => ref.watch(storeRepositoryProvider).fetchStores(),
);
