import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:graphql/client.dart';

/// Base URL of the open-mSupply GraphQL API.
///
/// The dev server requires no auth (see project notes). Overridable at build
/// time with `--dart-define=OMS_GRAPHQL_URL=...` so the same build can target a
/// different server without code changes.
const String kGraphQLEndpoint = String.fromEnvironment(
  'OMS_GRAPHQL_URL',
  defaultValue: 'http://localhost:8000/graphql',
);

/// Single shared GraphQL client. Cache is intentionally minimal for now; the
/// normalized cache is wired so later stages can opt into it per-query.
final graphQLClientProvider = Provider<GraphQLClient>((ref) {
  final link = HttpLink(kGraphQLEndpoint);
  return GraphQLClient(
    link: link,
    cache: GraphQLCache(),
    defaultPolicies: DefaultPolicies(
      query: Policies(fetch: FetchPolicy.networkOnly),
    ),
  );
});
