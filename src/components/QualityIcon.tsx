import type { CSSProperties } from 'react';
import { qualityLevels } from '../data/factorioData';
import type { QualityId } from '../types';

interface QualityIconProps {
  quality: QualityId;
  active?: boolean;
  compact?: boolean;
}

export function QualityIcon({
  quality,
  active = false,
  compact = false,
}: QualityIconProps) {
  const level = qualityLevels.find((candidate) => candidate.id === quality);

  if (!level) {
    return null;
  }

  return (
    <span
      aria-label={level.label}
      className={`quality-icon ${active ? 'is-active' : ''} ${
        compact ? 'is-compact' : ''
      }`}
      style={{ '--quality-accent': level.accent } as CSSProperties}
      title={level.label}
    >
      <img alt="" src={level.imageUrl} />
    </span>
  );
}
