import { useEffect, useState } from 'react';
import { BUILDINGS, EVENT_STATE_STORAGE_PREFIX, MAX_PLAYERS } from '../constants';
import type {
  BuildingConfig,
  BuildingMonitorSnapshot,
  BuildingKey,
  PersistedEventState,
} from '../types';
import { getEventRegistrationStatus } from '../utils/registration';
import {
  loadPersistedEventStateForMonitor,
  PERSISTED_EVENT_STATE_CHANGE_EVENT,
} from './tournament/state';

const MONITOR_POLL_INTERVAL_MS = 4000;

function createSnapshot(building: BuildingConfig): BuildingMonitorSnapshot {
  return {
    building,
    playersCount: 0,
    waitingPlayersCount: 0,
    isRosterFinalized: false,
    registrationStatus: 'open',
    updatedAt: null,
    connectionState: 'loading',
  };
}

function snapshotFromState(
  building: BuildingConfig,
  state: PersistedEventState | null,
  connectionState: BuildingMonitorSnapshot['connectionState'],
): BuildingMonitorSnapshot {
  if (!state) {
    return {
      ...createSnapshot(building),
      connectionState,
    };
  }

  const playersCount = state.players.length;
  const waitingPlayersCount = state.waitingPlayers.length;
  const isRosterFinalized = Boolean(state.isRosterFinalized);

  return {
    ...createSnapshot(building),
    playersCount,
    waitingPlayersCount,
    isRosterFinalized,
    registrationStatus: getEventRegistrationStatus(playersCount, MAX_PLAYERS, isRosterFinalized),
    updatedAt: typeof state.updatedAt === 'number' ? state.updatedAt : null,
    connectionState,
  };
}

export function createLocalMonitorSnapshot(building: BuildingConfig): BuildingMonitorSnapshot {
  return snapshotFromState(building, loadPersistedEventStateForMonitor(building.eventId), 'offline');
}

function updateSnapshot(
  current: BuildingMonitorSnapshot[],
  key: BuildingKey,
  patch: Partial<BuildingMonitorSnapshot>,
) {
  return current.map((snapshot) =>
    snapshot.building.key === key ? { ...snapshot, ...patch } : snapshot,
  );
}

async function fetchBuildingSnapshot(building: BuildingConfig): Promise<BuildingMonitorSnapshot> {
  const response = await fetch(`/api/events/state?eventId=${encodeURIComponent(building.eventId)}`);
  const payload = (await response.json().catch(() => ({}))) as {
    state?: PersistedEventState;
  };

  if (!response.ok || !payload.state) {
    throw new Error('Unable to load building state.');
  }

  return snapshotFromState(building, payload.state, 'live');
}

export function useBuildingMonitor(buildings: readonly BuildingConfig[] = BUILDINGS) {
  const [snapshots, setSnapshots] = useState<BuildingMonitorSnapshot[]>(() =>
    buildings.map(createSnapshot),
  );

  useEffect(() => {
    let isActive = true;
    let pollTimeoutId: number | null = null;

    setSnapshots(buildings.map(createSnapshot));

    const syncRemoteSnapshots = async () => {
      try {
        const nextSnapshots = await Promise.all(buildings.map(fetchBuildingSnapshot));

        if (isActive) {
          setSnapshots(nextSnapshots);
        }
      } catch (error) {
        console.error(error);
        if (isActive) {
          setSnapshots((current) =>
            buildings.reduce(
              (next, building) =>
                updateSnapshot(next, building.key, {
                  connectionState: 'error',
                }),
              current,
            ),
          );
        }
      } finally {
        if (isActive) {
          pollTimeoutId = window.setTimeout(syncRemoteSnapshots, MONITOR_POLL_INTERVAL_MS);
        }
      }
    };

    const syncLocalSnapshots = () => {
      setSnapshots(buildings.map(createLocalMonitorSnapshot));
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith(EVENT_STATE_STORAGE_PREFIX)) {
        return;
      }

      syncLocalSnapshots();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(PERSISTED_EVENT_STATE_CHANGE_EVENT, syncLocalSnapshots);
      window.addEventListener('storage', handleStorage);
    }

    void syncRemoteSnapshots();

    return () => {
      isActive = false;

      if (pollTimeoutId) {
        window.clearTimeout(pollTimeoutId);
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener(PERSISTED_EVENT_STATE_CHANGE_EVENT, syncLocalSnapshots);
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [buildings]);

  return snapshots;
}
