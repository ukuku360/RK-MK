import { MAX_PLAYERS } from '../constants';
import type {
  BuildingMonitorConnectionState,
  BuildingMonitorSnapshot,
} from '../types';

export type BuildingOperationalStatus =
  | 'connecting'
  | 'open'
  | 'nearly-full'
  | 'full'
  | 'locked'
  | 'sync-issue'
  | 'offline';

export function getConnectionLabel(connectionState: BuildingMonitorConnectionState) {
  if (connectionState === 'live') {
    return 'Live sync';
  }

  if (connectionState === 'offline') {
    return 'Offline mode';
  }

  if (connectionState === 'error') {
    return 'Sync issue';
  }

  return 'Connecting';
}

export function getBuildingOperationalStatus(
  snapshot: Pick<
    BuildingMonitorSnapshot,
    'connectionState' | 'playersCount' | 'isRosterFinalized'
  >,
): BuildingOperationalStatus {
  if (snapshot.connectionState === 'error') {
    return 'sync-issue';
  }

  if (snapshot.connectionState === 'offline') {
    return 'offline';
  }

  if (snapshot.connectionState === 'loading') {
    return 'connecting';
  }

  if (snapshot.isRosterFinalized) {
    return 'locked';
  }

  if (snapshot.playersCount >= MAX_PLAYERS) {
    return 'full';
  }

  if (snapshot.playersCount >= Math.max(1, MAX_PLAYERS - 2)) {
    return 'nearly-full';
  }

  return 'open';
}

export function getBuildingOperationalLabel(status: BuildingOperationalStatus) {
  if (status === 'locked') {
    return 'Locked';
  }

  if (status === 'full') {
    return 'Full';
  }

  if (status === 'nearly-full') {
    return 'Nearly full';
  }

  if (status === 'sync-issue') {
    return 'Sync issue';
  }

  if (status === 'offline') {
    return 'Offline';
  }

  if (status === 'connecting') {
    return 'Connecting';
  }

  return 'Open';
}
