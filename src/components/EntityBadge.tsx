import { QualityIcon } from './QualityIcon';
import type { QualityId } from '../types';

interface EntityBadgeProps {
  imageUrl: string;
  label: string;
  quality: QualityId;
  large?: boolean;
}

export function EntityBadge({
  imageUrl,
  label,
  quality,
  large = false,
}: EntityBadgeProps) {
  return (
    <span className={`entity-badge ${large ? 'is-large' : ''}`} title={label}>
      <img alt="" className="entity-badge__base" src={imageUrl} />
      <span className="entity-badge__overlay">
        <QualityIcon compact quality={quality} />
      </span>
    </span>
  );
}
