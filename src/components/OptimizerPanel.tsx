import type { AutoOptimizeSettings, PowerLocation } from '../types';

interface OptimizerPanelProps {
  powerLocationId: string;
  powerLocations: PowerLocation[];
  settings: AutoOptimizeSettings;
  onChange: (settings: AutoOptimizeSettings) => void;
  onSelectLocation: (locationId: string) => void;
  onRun: () => void;
}

export function OptimizerPanel({
  powerLocationId,
  powerLocations,
  settings,
  onChange,
  onSelectLocation,
  onRun,
}: OptimizerPanelProps) {
  const setInclude = (
    key:
      | 'includeEnergyShield'
      | 'includeRoboport'
      | 'includeNightvision'
      | 'includeBeltImmunity',
    checked: boolean,
  ) => {
    onChange({
      ...settings,
      [key]: checked,
    });
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Auto optimizer</h2>
      </div>
      <div className="field-grid">
        <label>
          <span>Solar location</span>
          <select
            onChange={(event) => onSelectLocation(event.target.value)}
            value={powerLocationId}
          >
            {powerLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Objective</span>
          <select
            onChange={(event) =>
              onChange({
                ...settings,
                objective: event.target.value as AutoOptimizeSettings['objective'],
              })
            }
            value={settings.objective}
          >
            <option value="balanced">Balanced</option>
            <option value="max-exoskeletons">Max exoskeletons</option>
            <option value="max-lasers">Max lasers</option>
            <option value="max-shields">Max shields</option>
          </select>
        </label>
      </div>
      <div className="optimizer-includes">
        <span>Include essentials</span>
        <label className="optimizer-toggle">
          <input
            checked={settings.includeEnergyShield}
            onChange={(event) => setInclude('includeEnergyShield', event.target.checked)}
            type="checkbox"
          />
          <span>Energy shield</span>
        </label>
        <label className="optimizer-toggle">
          <input
            checked={settings.includeRoboport}
            onChange={(event) => setInclude('includeRoboport', event.target.checked)}
            type="checkbox"
          />
          <span>Roboport</span>
        </label>
        <label className="optimizer-toggle">
          <input
            checked={settings.includeNightvision}
            onChange={(event) => setInclude('includeNightvision', event.target.checked)}
            type="checkbox"
          />
          <span>Night vision</span>
        </label>
        <label className="optimizer-toggle">
          <input
            checked={settings.includeBeltImmunity}
            onChange={(event) => setInclude('includeBeltImmunity', event.target.checked)}
            type="checkbox"
          />
          <span>Belt immunity</span>
        </label>
      </div>
      <button className="primary-button" onClick={onRun} type="button">
        Fill grid
      </button>
    </section>
  );
}
