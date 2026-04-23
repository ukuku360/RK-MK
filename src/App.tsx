import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ADMIN_PATH,
  BUILDING_CONFIGS,
  MAX_PLAYERS,
  ROOT_PATH,
} from './constants';
import { AdminGateModal } from './components/AdminGateModal';
import { AdminOverview } from './components/AdminOverview';
import { BuildingEventView } from './components/BuildingEventView';
import { BuildingSelectionModal } from './components/BuildingSelectionModal';
import { RoomingKosMotionPreview } from './components/RoomingKosMotionPreview';
import { SpireEventView } from './components/spire/SpireEventView';
import { isSeededTestPlayer, loadPersistedEventState, persistEventState } from './hooks/tournament/state';
import { useAdminSession } from './hooks/useAdminSession';
import { isLocalDevelopmentMode } from './lib/adminAccess';
import { signInAdminWithPin, signOutAdmin } from './lib/adminSession';
import type { BuildingConfig, BuildingKey, PersistedEventState, PlayerRecord, ViewMode } from './types';
import { createEmptyStageResults } from './utils/bracket';
import { getEventRegistrationStatus } from './utils/registration';

const SWANSTON_TEST_NAMES = [
  'Alex',
  'Ben',
  'Chloe',
  'Daniel',
  'Emma',
  'Finn',
  'Grace',
  'Harry',
  'Isla',
  'Jack',
  'Katie',
  'Leo',
  'Mia',
  'Noah',
  'Olivia',
  'Sam',
] as const;

function createSeedPlayers(
  buildingKey: BuildingKey,
  names: readonly string[],
) {
  return names.map((name, index) => ({
    id: `seed-${buildingKey}-${index + 1}`,
    name,
    nickname: '',
    teamTag: '',
    createdAt: Date.now() + index,
    updatedAt: Date.now() + index,
    lastUpdatedBy: 'local-dev-seed',
    checkedIn: false,
  })) satisfies PlayerRecord[];
}

function createSeededEventState(players: PlayerRecord[]): PersistedEventState {
  return {
    players,
    waitingPlayers: [],
    rosterOrder: [],
    isRosterFinalized: false,
    stageResults: createEmptyStageResults(),
    raceHistory: [],
    registrationStatus: getEventRegistrationStatus(players.length, MAX_PLAYERS, false),
    lockedAt: null,
    updatedAt: Date.now(),
  };
}

function canReplaceWithSeed(state: PersistedEventState | null) {
  if (!state) {
    return true;
  }

  const hasRealPlayers = state.players.some((player) => !isSeededTestPlayer(player));
  const hasRealWaitingPlayers = state.waitingPlayers.some((player) => !isSeededTestPlayer(player));

  if (hasRealPlayers || hasRealWaitingPlayers) {
    return false;
  }

  return !state.isRosterFinalized && state.rosterOrder.length === 0 && state.raceHistory.length === 0;
}

type AppRoute =
  | { kind: 'root' }
  | { kind: 'admin' }
  | { kind: 'building'; building: BuildingConfig }
  | { kind: 'unknown' };

type AdminGateTarget = 'building-admin' | 'route-admin';

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || ROOT_PATH;
}

function isBuildingKey(value: string): value is BuildingKey {
  return value in BUILDING_CONFIGS;
}

function resolveRoute(pathname: string): AppRoute {
  if (pathname === ROOT_PATH) {
    return { kind: 'root' };
  }

  if (pathname === ADMIN_PATH) {
    return { kind: 'admin' };
  }

  const maybeBuildingKey = pathname.replace(/^\//, '');

  if (isBuildingKey(maybeBuildingKey)) {
    return {
      kind: 'building',
      building: BUILDING_CONFIGS[maybeBuildingKey],
    };
  }

  return { kind: 'unknown' };
}

function AdminAccessSplash({ isLoading }: { isLoading?: boolean }) {
  return (
    <main className="page admin-overview-page">
      <section className="panel admin-overview-hero admin-overview-locked">
        <RoomingKosMotionPreview />
        <p className="admin-overview-kicker">Race Control</p>
        <h1>{isLoading ? 'Checking Access' : 'Monitor Locked'}</h1>
        <p className="admin-overview-subtitle">
          {isLoading
            ? 'Verifying your existing race control session.'
            : 'Enter the admin password to access the cross-building overview for Swanston, Dudley, and Spire.'}
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [currentView, setCurrentView] = useState<ViewMode>('public');
  const [adminGateTarget, setAdminGateTarget] = useState<AdminGateTarget | null>(null);
  const pendingBuildingViewRef = useRef<ViewMode | null>(null);
  const adminSession = useAdminSession();
  const isAdminMode = adminSession.isAdmin;

  const route = useMemo(() => resolveRoute(pathname), [pathname]);

  useEffect(() => {
    if (!isLocalDevelopmentMode()) {
      return;
    }

    const swanstonEventId = BUILDING_CONFIGS.swanston.eventId;
    const existingState = loadPersistedEventState(swanstonEventId);

    if (!canReplaceWithSeed(existingState)) {
      return;
    }

    persistEventState(
      swanstonEventId,
      createSeededEventState(createSeedPlayers('swanston', SWANSTON_TEST_NAMES)),
    );
  }, []);

  const navigateToPath = useCallback(
    (
      path: string,
      historyMode: 'push' | 'replace' = 'push',
      nextBuildingView: ViewMode | null = null,
    ) => {
      pendingBuildingViewRef.current = nextBuildingView;

      const nextUrl = new URL(window.location.href);
      nextUrl.pathname = path;
      nextUrl.search = '';
      nextUrl.hash = '';
      window.history[historyMode === 'replace' ? 'replaceState' : 'pushState']({}, '', nextUrl);
      setPathname(normalizePathname(nextUrl.pathname));
    },
    [],
  );

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const normalizedPath = normalizePathname(pathname);

    if (normalizedPath !== pathname) {
      navigateToPath(normalizedPath, 'replace');
      return;
    }

    if (route.kind === 'unknown') {
      navigateToPath(ROOT_PATH, 'replace');
    }
  }, [navigateToPath, pathname, route.kind]);

  useEffect(() => {
    if (route.kind === 'admin' && !adminSession.isLoading && !isAdminMode) {
      setAdminGateTarget((current) => current ?? 'route-admin');
    }
  }, [adminSession.isLoading, isAdminMode, route.kind]);

  useEffect(() => {
    if (route.kind !== 'building') {
      setCurrentView('public');
      pendingBuildingViewRef.current = null;
      return;
    }

    const nextView =
      pendingBuildingViewRef.current === 'admin' && isAdminMode ? 'admin' : 'public';

    pendingBuildingViewRef.current = null;
    setCurrentView(nextView);
  }, [isAdminMode, route.kind === 'building' ? route.building.key : 'none']);

  useEffect(() => {
    if (route.kind === 'building') {
      document.title = route.building.headline;
      return;
    }

    if (route.kind === 'admin') {
      document.title = 'RoomingKos Race Control Overview';
      return;
    }

    document.title = 'RoomingKos Mario Kart Cup';
  }, [route]);

  useEffect(() => {
    const isSpireRoute =
      route.kind === 'building' && route.building.brandVariant === 'spire';

    document.body.classList.toggle('spire-route', isSpireRoute);

    return () => {
      document.body.classList.remove('spire-route');
    };
  }, [route]);

  function handleAdminGateClose() {
    const currentTarget = adminGateTarget;
    setAdminGateTarget(null);

    if (route.kind === 'admin' && !isAdminMode && currentTarget === 'route-admin') {
      navigateToPath(ROOT_PATH, 'replace');
    }
  }

  async function handleAdminLogin(pin: string) {
    const target = adminGateTarget;

    await signInAdminWithPin(pin);
    setAdminGateTarget(null);

    if (target === 'route-admin') {
      navigateToPath(ADMIN_PATH);
      return;
    }

    setCurrentView('admin');
  }

  async function handleAdminLogout() {
    await signOutAdmin();
    setCurrentView('public');

    if (route.kind === 'admin') {
      navigateToPath(ROOT_PATH, 'replace');
    }
  }

  return (
    <>
      <AdminGateModal
        visible={adminGateTarget !== null}
        onClose={handleAdminGateClose}
        onSubmitPin={handleAdminLogin}
      />

      {route.kind === 'building' ? (
        route.building.brandVariant === 'spire' ? (
          <SpireEventView
            key={route.building.key}
            building={route.building}
            currentView={currentView}
            isAdminMode={isAdminMode}
            onRequestAdminLogin={() => setAdminGateTarget('building-admin')}
            onViewChange={setCurrentView}
            onLogout={handleAdminLogout}
          />
        ) : (
          <BuildingEventView
            key={route.building.key}
            building={route.building}
            currentView={currentView}
            isAdminMode={isAdminMode}
            onRequestAdminLogin={() => setAdminGateTarget('building-admin')}
            onViewChange={setCurrentView}
            onLogout={handleAdminLogout}
          />
        )
      ) : null}

      {route.kind === 'root' ? (
        <BuildingSelectionModal
          onSelectBuilding={(building) => navigateToPath(building.path)}
          onOpenAdmin={() => {
            if (isAdminMode) {
              navigateToPath(ADMIN_PATH);
              return;
            }

            setAdminGateTarget('route-admin');
          }}
        />
      ) : null}

      {route.kind === 'admin' ? (
        isAdminMode ? (
          <AdminOverview
            onOpenBuilding={(building) => navigateToPath(building.path, 'push', 'admin')}
            onLogout={handleAdminLogout}
          />
        ) : (
          <AdminAccessSplash isLoading={adminSession.isLoading} />
        )
      ) : null}
    </>
  );
}
