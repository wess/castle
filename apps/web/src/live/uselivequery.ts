import { type QueryKey, type UseQueryOptions, type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { isConnected, onStatus, subscribe, unsubscribe } from "./socket.ts";
import type { Topic } from "./topics.ts";

const useConnected = (): boolean => useSyncExternalStore(onStatus, isConnected, () => false);

// Subscribe to a topic for the component's lifetime (refcounted in socket.ts).
export const useLiveTopic = (topic: Topic): void => {
  useEffect(() => {
    subscribe(topic);
    return () => unsubscribe(topic);
  }, [topic]);
};

// Drop-in replacement for useQuery on pushable resources: same initial fetch,
// but updates arrive over the websocket instead of a timer. If the socket is
// down it falls back to a slow refetch so data never goes fully stale.
export const useLiveQuery = <TQueryFnData, TError = Error, TData = TQueryFnData>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, QueryKey>, "refetchInterval"> & { topic: Topic },
): UseQueryResult<TData, TError> => {
  const { topic, ...rest } = options;
  useLiveTopic(topic);
  const connected = useConnected();
  return useQuery({ ...rest, refetchInterval: connected ? false : 15_000 });
};
