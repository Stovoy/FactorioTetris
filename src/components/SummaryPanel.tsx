import { formatEnergy, formatPower } from '../lib/stats';
import type { BuildSummary, PowerLocation } from '../types';

interface SummaryPanelProps {
  location: PowerLocation;
  summary: BuildSummary;
}

const formatMinutes = (minutes: number | null) => {
  if (minutes === null) {
    return 'Stable';
  }

  if (!Number.isFinite(minutes)) {
    return 'Unlimited';
  }

  if (minutes >= 60) {
    return `${(minutes / 60).toFixed(1)} h`;
  }

  return `${minutes.toFixed(1)} min`;
};

const formatRechargeMinutes = (minutes: number | null) => {
  if (minutes === null) {
    return 'Never';
  }

  return formatMinutes(minutes);
};

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) {
    return 'Stable';
  }

  if (!Number.isFinite(seconds)) {
    return 'Unlimited';
  }

  if (seconds >= 60) {
    return `${(seconds / 60).toFixed(1)} min`;
  }

  return `${seconds.toFixed(1)} s`;
};

export function SummaryPanel({
  location,
  summary,
}: SummaryPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Build summary</h2>
        <span className="panel-header__meta">{location.label}</span>
      </div>
      <div className="stat-grid">
        <div>
          <span>Used cells</span>
          <strong>
            {summary.usedCells} / {summary.totalCells}
          </strong>
        </div>
        <div>
          <span>Inventory</span>
          <strong>{summary.inventorySlots} slots</strong>
        </div>
        <div>
          <span>Day generation</span>
          <strong>{formatPower(summary.dayGenerationKw)}</strong>
        </div>
        <div>
          <span>Night generation</span>
          <strong>{formatPower(summary.nightGenerationKw)}</strong>
        </div>
        <div>
          <span>Peak draw</span>
          <strong>{formatPower(summary.drawKw)}</strong>
        </div>
        <div>
          <span>Peak net</span>
          <strong className={summary.peakSustainable ? 'good' : 'bad'}>
            {formatPower(summary.netPeakKw)}
          </strong>
        </div>
        <div>
          <span>Sustained draw</span>
          <strong>{formatPower(summary.sustainedDrawKw)}</strong>
        </div>
        <div>
          <span>Day net</span>
          <strong className={summary.dayNetKw >= 0 ? 'good' : 'bad'}>
            {formatPower(summary.dayNetKw)}
          </strong>
        </div>
        <div>
          <span>Night net</span>
          <strong className={summary.nightNetKw >= 0 ? 'good' : 'bad'}>
            {formatPower(summary.nightNetKw)}
          </strong>
        </div>
        <div>
          <span>Average net</span>
          <strong className={summary.netAverageKw >= 0 ? 'good' : 'bad'}>
            {formatPower(summary.netAverageKw)}
          </strong>
        </div>
        <div>
          <span>Peak burst support</span>
          <strong className={summary.peakSustainable ? 'good' : 'bad'}>
            {formatSeconds(summary.peakBurstSeconds)}
          </strong>
        </div>
        <div>
          <span>Cycle stable</span>
          <strong className={summary.cycleSustainable ? 'good' : 'bad'}>
            {summary.cycleSustainable ? 'Yes' : 'No'}
          </strong>
        </div>
        <div>
          <span>Stored energy</span>
          <strong>{formatEnergy(summary.energyCapacityMj)}</strong>
        </div>
        <div>
          <span>Cycle buffer needed</span>
          <strong>{formatEnergy(summary.requiredCycleBufferMj)}</strong>
        </div>
        <div>
          <span>Battery recharge time</span>
          <strong>{formatRechargeMinutes(summary.batteryRechargeMinutes)}</strong>
        </div>
        <div>
          <span>Night sustained battery support</span>
          <strong>{formatMinutes(summary.nightBatteryMinutes)}</strong>
        </div>
        <div>
          <span>Full-dark window</span>
          <strong>
            {summary.fullDarkMinutes > 0
              ? formatMinutes(summary.fullDarkMinutes)
              : 'None'}
          </strong>
        </div>
        <div>
          <span>Movement speed bonus</span>
          <strong>+{summary.movementBonusPercent}%</strong>
        </div>
        <div>
          <span>Total shields</span>
          <strong>{summary.shieldHp} HP</strong>
        </div>
        <div>
          <span>Shield recharge</span>
          <strong>{summary.shieldRechargePerSecond.toFixed(1)} /s</strong>
        </div>
        <div>
          <span>Laser DPS</span>
          <strong>{summary.laserDps.toFixed(1)}</strong>
        </div>
        <div>
          <span>Laser range</span>
          <strong>{summary.laserRange.toFixed(1)}</strong>
        </div>
        <div>
          <span>Robots</span>
          <strong>{summary.robotLimit}</strong>
        </div>
        <div>
          <span>Charging stations</span>
          <strong>{summary.chargingStations}</strong>
        </div>
        <div>
          <span>Construction area</span>
          <strong>
            {summary.constructionAreaDiameter > 0
              ? `${summary.constructionAreaDiameter}×${summary.constructionAreaDiameter}`
              : 'None'}
          </strong>
        </div>
      </div>
    </section>
  );
}
