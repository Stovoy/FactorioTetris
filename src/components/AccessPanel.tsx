import { qualityLevels } from '../data/factorioData';
import type { AccessMatrix, EquipmentItem, QualityId } from '../types';

interface AccessPanelProps {
  accessMatrix: AccessMatrix;
  items: EquipmentItem[];
  onSetAll: (enabled: boolean) => void;
  onSetItemAll: (itemId: string, enabled: boolean) => void;
  onToggle: (itemId: string, quality: QualityId) => void;
}

export function AccessPanel({
  accessMatrix,
  items,
  onSetAll,
  onSetItemAll,
  onToggle,
}: AccessPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Optimizer access</h2>
        <p>Choose exactly which modules and quality tiers the auto optimizer can use.</p>
      </div>
      <div className="access-toolbar">
        <button onClick={() => onSetAll(true)} type="button">
          Enable all
        </button>
        <button onClick={() => onSetAll(false)} type="button">
          Disable all
        </button>
      </div>
      <div className="access-table">
        <div className="access-row access-row--head">
          <span>Equipment</span>
          {qualityLevels.map((quality) => (
            <span key={quality.id}>{quality.shortLabel}</span>
          ))}
          <span>Item</span>
        </div>
        {items.map((item) => {
          const enabledCount = qualityLevels.filter(
            (quality) => accessMatrix[item.id][quality.id],
          ).length;

          return (
            <div className="access-row" key={item.id}>
              <div className="access-item">
                <img alt="" src={item.imageUrl} />
                <span>{item.name}</span>
              </div>
              {qualityLevels.map((quality) => (
                <label className="access-checkbox" key={quality.id}>
                  <input
                    checked={accessMatrix[item.id][quality.id]}
                    onChange={() => onToggle(item.id, quality.id)}
                    type="checkbox"
                  />
                </label>
              ))}
              <button
                className="access-item-toggle"
                onClick={() => onSetItemAll(item.id, enabledCount !== qualityLevels.length)}
                type="button"
              >
                {enabledCount === qualityLevels.length ? 'Disable item' : 'Enable item'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
