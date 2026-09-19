import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth, useTenantId } from '@/features/auth/AuthProvider';
import { env } from '@/config/env';
import { authSnapshot } from '@/lib/authSnapshot';
import { tokenStore } from '@/lib/tokenStore';
import { queryKeys } from '@/lib/queryClient';
import {
  applyPositionToBusPosition,
  applyPositionToBusRows,
  parseBusPositionPush,
  transportHubUrl,
  TRANSPORT_HUB_PUSH_EVENT,
} from '@/lib/transportHub';
import type { BusPosition, FleetBus, MyRouteBus } from '@/data/domain';

export function useAssignBusTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, teacherUserId }: { busId: string; teacherUserId: string }) =>
      repos.principal.assignBusTeacher(busId, teacherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.transportBuses(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.bus(tenantId) });
    },
  });
}

export function useUnassignBusTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (busId: string) => repos.principal.unassignBusTeacher(busId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.transportBuses(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.bus(tenantId) });
    },
  });
}

export function useAddTravelingTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, teacherUserId }: { busId: string; teacherUserId: string }) =>
      repos.principal.addTravelingTeacher(busId, teacherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myRouteBuses(tenantId) });
    },
  });
}

export function useRemoveTravelingTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, teacherUserId }: { busId: string; teacherUserId: string }) =>
      repos.principal.removeTravelingTeacher(busId, teacherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myRouteBuses(tenantId) });
    },
  });
}

/** Joins TransportFleetHub for the given buses and merges pushed position updates into the cache. */
export function useTransportFleetPush(busIds: string[]): void {
  const { status } = useAuth();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const busIdsKey = busIds.slice().sort().join(',');
  const wantedRef = useRef<string[]>(busIds);
  const syncRef = useRef<() => void>(() => {});

  wantedRef.current = busIds;

  useEffect(() => {
    if (status !== 'authenticated' || !env.API_BASE_URL) return;

    const connection = new HubConnectionBuilder()
      .withUrl(transportHubUrl(env.API_BASE_URL), {
        accessTokenFactory: async () =>
          authSnapshot.get().accessToken || (await tokenStore.read())?.accessToken || '',
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    const joined = new Set<string>();

    const syncJoins = () => {
      if (connection.state !== HubConnectionState.Connected) return;
      const wanted = new Set(wantedRef.current);
      for (const busId of Array.from(joined)) {
        if (!wanted.has(busId)) {
          joined.delete(busId);
          void connection.invoke('LeaveBus', busId).catch(() => {});
        }
      }
      for (const busId of wanted) {
        if (!joined.has(busId)) {
          joined.add(busId);
          void connection.invoke('JoinBus', busId).catch(() => joined.delete(busId));
        }
      }
    };
    syncRef.current = syncJoins;

    connection.on(TRANSPORT_HUB_PUSH_EVENT, (payload: unknown) => {
      const push = parseBusPositionPush(payload);
      if (!push) return;
      qc.setQueryData<BusPosition | undefined>(
        queryKeys.busPosition(tenantId, push.bus_id),
        (prev) => applyPositionToBusPosition(prev, push)
      );
      qc.setQueryData<FleetBus[] | undefined>(queryKeys.transportFleet(tenantId), (prev) =>
        applyPositionToBusRows(prev, push)
      );
      qc.setQueryData<MyRouteBus[] | undefined>(queryKeys.myRouteBuses(tenantId), (prev) =>
        applyPositionToBusRows(prev, push)
      );
    });
    connection.onreconnected(() => {
      joined.clear();
      syncJoins();
    });

    let cancelled = false;
    void connection
      .start()
      .then(() => {
        if (!cancelled) syncJoins();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      syncRef.current = () => {};
      connection.off(TRANSPORT_HUB_PUSH_EVENT);
      void connection.stop();
    };
  }, [status, tenantId, qc]);

  useEffect(() => {
    syncRef.current();
  }, [busIdsKey]);
}
