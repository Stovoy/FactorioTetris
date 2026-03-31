import type { AutoOptimizeSettings } from '../types';

interface OptimizerPanelProps {
  settings: AutoOptimizeSettings;
  onChange: (settings: AutoOptimizeSettings) => void;
  onRun: () => void;
}

export function OptimizerPanel({
  settings,
  onChange,
  onRun,
}: OptimizerPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Auto optimizer</h2>
        <p>Greedy first-fit optimizer tuned for energy-aware combat and mobility layouts.</p>
      </div>
      <div className="field-grid">
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
            <option value="minimum-power-deficit">Minimum power deficit</option>
            <option value="max-exoskeletons">Max exoskeletons</option>
            <option value="max-lasers">Max lasers</option>
            <option value="max-shields">Max shields</option>
            <option value="max-battery">Max battery</option>
          </select>
        </label>
        <label>
          <span>Max exoskeletons</span>
          <input
            min={0}
            onChange={(event) =>
              onChange({ ...settings, maxExoskeletons: Number(event.target.value) })
            }
            type="number"
            value={settings.maxExoskeletons}
          />
        </label>
        <label>
          <span>Max laser defenses</span>
          <input
            min={0}
            onChange={(event) =>
              onChange({ ...settings, maxLaserDefenses: Number(event.target.value) })
            }
            type="number"
            value={settings.maxLaserDefenses}
          />
        </label>
        <label>
          <span>Min fission reactors</span>
          <input
            min={0}
            onChange={(event) =>
              onChange({ ...settings, minReactors: Number(event.target.value) })
            }
            type="number"
            value={settings.minReactors}
          />
        </label>
        <label>
          <span>Reserve MK3 batteries</span>
          <input
            min={0}
            onChange={(event) =>
              onChange({ ...settings, reserveBatteries: Number(event.target.value) })
            }
            type="number"
            value={settings.reserveBatteries}
          />
        </label>
      </div>
      <button className="primary-button" onClick={onRun} type="button">
        Fill grid
      </button>
    </section>
  );
}
