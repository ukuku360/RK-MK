import { useBuildingMonitor } from '../hooks/useBuildingMonitor';
import type { BuildingConfig } from '../types';
import {
  getBuildingOperationalLabel,
  getBuildingOperationalStatus,
  getConnectionLabel,
} from '../utils/monitor';
import { RoomingKosMotionPreview } from './RoomingKosMotionPreview';

interface AdminOverviewProps {
  onOpenBuilding: (building: BuildingConfig) => void;
  onLogout: () => void;
}

function formatUpdatedAt(updatedAt: number | null) {
  if (!updatedAt) {
    return 'No recent updates';
  }

  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(updatedAt);
}

function getAdminOverviewBuildingLabel(label: string) {
  return label.replace(/^RoomingKos\s+/i, '');
}

export function AdminOverview({ onOpenBuilding, onLogout }: AdminOverviewProps) {
  const snapshots = useBuildingMonitor();

  return (
    <main className="page admin-overview-page">
      <section className="panel admin-overview-hero">
        <RoomingKosMotionPreview />
        <div className="admin-overview-heading-row">
          <div className="admin-overview-copy">
            <p className="admin-overview-kicker">Race Control</p>
            <h1>Building Monitor</h1>
            <p className="admin-overview-subtitle">
              View participant totals, pit lane counts, draw readiness, and sync health across
              Swanston, Dudley, and Spire.
            </p>
          </div>
          <div className="admin-overview-actions">
            <button type="button" className="button-secondary" onClick={onLogout}>
              Log Out
            </button>
          </div>
        </div>
      </section>

      <section className="admin-monitor-grid" aria-label="Building monitor cards">
        {snapshots.map((snapshot) => {
          const operationalStatus = getBuildingOperationalStatus(snapshot);
          const displayLabel = getAdminOverviewBuildingLabel(snapshot.building.label);

          return (
            <article key={snapshot.building.key} className="panel admin-monitor-card">
              <div className="admin-monitor-card-head">
                <p className="admin-monitor-kicker">Building</p>
                <h2>{displayLabel}</h2>
                <p
                  className={`admin-monitor-status admin-monitor-status-${operationalStatus}`}
                >
                  {getBuildingOperationalLabel(operationalStatus)}
                </p>
              </div>

              <div className="admin-monitor-metrics">
                <div className="admin-monitor-metric">
                  <span className="admin-monitor-metric-label">Drivers</span>
                  <strong>{snapshot.playersCount}</strong>
                </div>
                <div className="admin-monitor-metric">
                  <span className="admin-monitor-metric-label">Pit Lane</span>
                  <strong>{snapshot.waitingPlayersCount}</strong>
                </div>
                <div className="admin-monitor-metric">
                  <span className="admin-monitor-metric-label">Draw</span>
                  <strong>{snapshot.isRosterFinalized ? 'Locked' : 'Open'}</strong>
                </div>
              </div>

              <div className="admin-monitor-meta">
                <p className="admin-monitor-connection">
                  {getConnectionLabel(snapshot.connectionState)}
                </p>
                <p className="admin-monitor-updated">
                  Last update: {formatUpdatedAt(snapshot.updatedAt)}
                </p>
              </div>

              <button type="button" onClick={() => onOpenBuilding(snapshot.building)}>
                Open {displayLabel} Admin
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
