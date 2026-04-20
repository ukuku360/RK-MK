import { useEffect, useState } from 'react';
import { onValue, ref, type DataSnapshot } from 'firebase/database';
import { BUILDINGS, MAX_PLAYERS } from '../constants';
import { getFirebaseDatabase, isFirebaseConfigured } from '../lib/firebase';
import type { BuildingConfig, BuildingMonitorSnapshot, BuildingKey } from '../types';
import { getEventRegistrationStatus } from '../utils/registration';

function getSnapshotChildCount(snapshot: DataSnapshot | null) {
  if (!snapshot?.exists()) {
    return 0;
  }

  if (typeof snapshot.size === 'number') {
    return snapshot.size;
  }

  let childCount = 0;
  snapshot.forEach(() => {
    childCount += 1;
  });

  return childCount;
}

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

function updateSnapshot(
  current: BuildingMonitorSnapshot[],
  key: BuildingKey,
  patch: Partial<BuildingMonitorSnapshot>,
) {
  return current.map((snapshot) =>
    snapshot.building.key === key ? { ...snapshot, ...patch } : snapshot,
  );
}

export function useBuildingMonitor(buildings: readonly BuildingConfig[] = BUILDINGS) {
  const [snapshots, setSnapshots] = useState<BuildingMonitorSnapshot[]>(() =>
    buildings.map(createSnapshot),
  );

  useEffect(() => {
    setSnapshots(buildings.map(createSnapshot));

    if (!isFirebaseConfigured()) {
      setSnapshots(
        buildings.map((building) => ({
          ...createSnapshot(building),
          connectionState: 'offline',
        })),
      );
      return;
    }

    const db = getFirebaseDatabase();
    const unsubscribers: Array<() => void> = [];

    buildings.forEach((building) => {
      const basePath = `events/${building.eventId}`;

      unsubscribers.push(
        onValue(
          ref(db, `${basePath}/participants`),
          (snapshot) => {
            setSnapshots((current) =>
              current.map((entry) =>
                entry.building.key === building.key
                  ? {
                      ...entry,
                      playersCount: getSnapshotChildCount(snapshot),
                      registrationStatus: getEventRegistrationStatus(
                        getSnapshotChildCount(snapshot),
                        MAX_PLAYERS,
                        entry.isRosterFinalized,
                      ),
                      connectionState: 'live',
                    }
                  : entry,
              ),
            );
          },
          () => {
            setSnapshots((current) =>
              updateSnapshot(current, building.key, {
                connectionState: 'error',
              }),
            );
          },
        ),
      );

      unsubscribers.push(
        onValue(
          ref(db, `${basePath}/waitlist`),
          (snapshot) => {
            setSnapshots((current) =>
              updateSnapshot(current, building.key, {
                waitingPlayersCount: getSnapshotChildCount(snapshot),
                connectionState: 'live',
              }),
            );
          },
          () => {
            setSnapshots((current) =>
              updateSnapshot(current, building.key, {
                connectionState: 'error',
              }),
            );
          },
        ),
      );

      unsubscribers.push(
        onValue(
          ref(db, basePath),
          (snapshot) => {
            const isRosterFinalized = Boolean(snapshot.val()?.isRosterFinalized);
            const updatedAt =
              typeof snapshot.val()?.updatedAt === 'number' ? snapshot.val().updatedAt : null;
            const storedRegistrationStatus = snapshot.val()?.registrationStatus;

            setSnapshots((current) =>
              current.map((entry) =>
                entry.building.key === building.key
                  ? {
                      ...entry,
                      isRosterFinalized,
                      updatedAt,
                      registrationStatus:
                        storedRegistrationStatus ||
                        getEventRegistrationStatus(entry.playersCount, MAX_PLAYERS, isRosterFinalized),
                      connectionState: 'live',
                    }
                  : entry,
              ),
            );
          },
          () => {
            setSnapshots((current) =>
              updateSnapshot(current, building.key, {
                connectionState: 'error',
              }),
            );
          },
        ),
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [buildings]);

  return snapshots;
}
