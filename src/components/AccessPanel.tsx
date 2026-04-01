import { qualityLevels } from '../data/factorioData';
import type { AccessMatrix, EquipmentItem, QualityId } from '../types';
import { QualityIcon } from './QualityIcon';

interface AccessPanelProps {
  accessMatrix: AccessMatrix;
  items: EquipmentItem[];
  onSetAll: (enabled: boolean) => void;
  onSetQualityAll: (quality: QualityId, enabled: boolean) => void;
  onSetItemAll: (itemId: string, enabled: boolean) => void;
  onToggle: (itemId: string, quality: QualityId) => void;
}

export function AccessPanel({
  accessMatrix,
  items,
  onSetAll,
  onSetQualityAll,
  onSetItemAll,
  onToggle,
}: AccessPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Optimizer access</h2>
      </div>
      <div className="access-toolbar">
        <button onClick={() => onSetAll(true)} type="button">
          Enable all
        </button>
        <button onClick={() => onSetAll(false)} type="button">
          Disable all
        </button>
      </div>
      <div className="access-quality-toolbar">
        <span className="access-quality-label">Quality</span>
        <div className="access-quality-actions">
          {qualityLevels.map((quality) => {
            const enabledCount = items.filter(
              (item) => accessMatrix[item.id][quality.id],
            ).length;
            const allEnabled = enabledCount === items.length;

            return (
              <button
                className={`quality-pill ${allEnabled ? 'is-selected' : ''}`}
                key={quality.id}
                onClick={() => onSetQualityAll(quality.id, !allEnabled)}
                style={{ borderColor: quality.accent }}
                title={`${allEnabled ? 'Disable' : 'Enable'} ${quality.label}`}
                type="button"
              >
                <QualityIcon active={allEnabled} quality={quality.id} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="access-table panel-scroll">
        <div className="access-row access-row--head">
          <span>Equipment</span>
          {qualityLevels.map((quality) => (
            <span key={quality.id}>
              <QualityIcon compact quality={quality.id} />
            </span>
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
