import { BUILDINGS } from '../constants';
import spireLogo from '../assets/branding/spire/logos/spire-logo.svg';
import type { BuildingConfig } from '../types';

interface BuildingSelectionModalProps {
  onSelectBuilding: (building: BuildingConfig) => void;
  onOpenAdmin: () => void;
}

export function BuildingSelectionModal({
  onSelectBuilding,
  onOpenAdmin,
}: BuildingSelectionModalProps) {
  return (
    <main className="page route-selector-page">
      <section className="panel route-selector-modal" role="dialog" aria-modal="true">
        <h1>Pick the building you live in</h1>
        <p className="route-selector-copy">Tap your building below.</p>

        <div className="route-selector-grid">
          {BUILDINGS.map((building) => (
            building.brandVariant === 'spire' ? (
              <button
                key={building.key}
                type="button"
                className="route-selector-button route-selector-button-spire"
                onClick={() => onSelectBuilding(building)}
              >
                <span className="route-selector-spire-mark" aria-hidden="true">
                  <img src={spireLogo} alt="" />
                </span>
                <span className="route-selector-button-label route-selector-button-label-spire">
                  {building.label}
                </span>
                <span className="route-selector-button-meta route-selector-button-meta-spire">
                  Enter the Spire experience
                </span>
              </button>
            ) : (
              <button
                key={building.key}
                type="button"
                className="route-selector-button"
                onClick={() => onSelectBuilding(building)}
              >
                <span className="route-selector-button-label">{building.label}</span>
                <span className="route-selector-button-meta">Enter this building</span>
              </button>
            )
          ))}
          <button
            type="button"
            className="route-selector-button route-selector-button-admin"
            onClick={onOpenAdmin}
          >
            <span className="route-selector-button-label">Admin</span>
            <span className="route-selector-button-meta">Open building monitor</span>
          </button>
        </div>
      </section>
    </main>
  );
}
