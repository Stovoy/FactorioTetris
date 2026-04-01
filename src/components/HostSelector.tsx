import type { GridHost, QualityId } from '../types';
import { qualityLevels } from '../data/factorioData';
import { QualityIcon } from './QualityIcon';

interface HostSelectorProps {
  hosts: GridHost[];
  selectedHostId: string;
  selectedHostQuality: QualityId;
  onSelectHost: (hostId: string) => void;
  onSelectQuality: (quality: QualityId) => void;
}

export function HostSelector({
  hosts,
  selectedHostId,
  selectedHostQuality,
  onSelectHost,
  onSelectQuality,
}: HostSelectorProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Host grid</h2>
      </div>
      <div className="host-grid">
        {hosts.map((host) => {
          const stats = host.qualities[selectedHostQuality];
          const selected = host.id === selectedHostId;
          return (
            <button
              key={host.id}
              className={`host-card ${selected ? 'is-selected' : ''}`}
              onClick={() => onSelectHost(host.id)}
              type="button"
            >
              <img alt="" src={host.imageUrl} />
              <div>
                <strong>{host.name}</strong>
                <span>
                  {stats.width}×{stats.height} grid
                </span>
                <span>{stats.inventorySlots} inventory slots</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="quality-row host-quality-row">
        {qualityLevels.map((quality) => (
          <button
            key={quality.id}
            className={`quality-pill ${
              selectedHostQuality === quality.id ? 'is-selected' : ''
            }`}
            onClick={() => onSelectQuality(quality.id)}
            style={{ borderColor: quality.accent }}
            type="button"
            title={quality.label}
          >
            <QualityIcon active={selectedHostQuality === quality.id} quality={quality.id} />
          </button>
        ))}
      </div>
    </section>
  );
}
