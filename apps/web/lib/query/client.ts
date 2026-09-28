import { type RPCJsonSerialization, RPCJsonSerializer } from "@orpc/client";
import { hashKey, QueryClient } from "@tanstack/react-query";
import { cache } from "react";

const serializer = new RPCJsonSerializer();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        queryKeyHashFn: (queryKey) => {
          const { json, meta } = serializer.serialize(queryKey);
          return hashKey([json, meta]);
        },
      },
      dehydrate: {
        serializeData: (data) => serializer.serialize(data),
      },
      hydrate: {
        deserializeData: (data: RPCJsonSerialization) =>
          serializer.deserialize(data),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** One client per request on the server, one for the whole session in the browser. */
export const getQueryClient = cache(() => {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
});
