import { formatEnergy, formatPower } from '../lib/stats';
import type { BuildSummary, EquipmentItem, GridHost, Placement } from '../types';

interface SummaryPanelProps {
  host: GridHost;
  summary: BuildSummary;
  placements: Placement[];
  selectedPlacementId: string | null;
  itemMap: Record<string, EquipmentItem>;
  onRotate: () => void;
  onRemove: () => void;
}

export function SummaryPanel({
  host,
  summary,
  placements,
  selectedPlacementId,
  itemMap,
  onRotate,
  onRemove,
}: SummaryPanelProps) {
  const selectedPlacement = placements.find(
    (placement) => placement.id === selectedPlacementId,
  );
  const selectedItem = selectedPlacement ? itemMap[selectedPlacement.itemId] : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Build summary</h2>
        <p>Totals are computed from the encoded Factorio wiki quality values.</p>
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
          <span>Peak generation</span>
          <strong>{formatPower(summary.generationKw)}</strong>
        </div>
        <div>
          <span>Peak draw</span>
          <strong>{formatPower(summary.drawKw)}</strong>
        </div>
        <div>
          <span>Peak net</span>
          <strong className={summary.netPeakKw >= 0 ? 'good' : 'bad'}>
            {formatPower(summary.netPeakKw)}
          </strong>
        </div>
        <div>
          <span>Average net</span>
          <strong className={summary.netAverageKw >= 0 ? 'good' : 'bad'}>
            {formatPower(summary.netAverageKw)}
          </strong>
        </div>
        <div>
          <span>Stored energy</span>
          <strong>{formatEnergy(summary.energyCapacityMj)}</strong>
        </div>
        <div>
          <span>Movement bonus</span>
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
      {selectedItem ? (
        <div className="selection-card">
          <div>
            <strong>{selectedItem.name}</strong>
            <span>{selectedPlacement?.quality} quality</span>
            <a href={selectedItem.sourceUrl} rel="noreferrer" target="_blank">
              Factorio wiki source
            </a>
          </div>
          <div className="selection-actions">
            <button onClick={onRotate} type="button">
              Rotate
            </button>
            <button onClick={onRemove} type="button">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="selection-card">
          <div>
            <strong>{host.name}</strong>
            <span>{host.note}</span>
            <a href={host.sourceUrl} rel="noreferrer" target="_blank">
              Factorio wiki source
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

