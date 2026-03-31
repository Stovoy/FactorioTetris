import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { qualityLevels } from '../data/factorioData';
import type { EquipmentCategory, EquipmentItem, QualityId } from '../types';
import { formatEnergy, formatPower } from '../lib/stats';

interface EquipmentPaletteProps {
  items: EquipmentItem[];
  selectedQuality: QualityId;
  activeItemId: string | null;
  filter: EquipmentCategory | 'all';
  search: string;
  onSelectQuality: (quality: QualityId) => void;
  onSelectFilter: (filter: EquipmentCategory | 'all') => void;
  onSelectItem: (itemId: string | null) => void;
  onSearch: (value: string) => void;
}

const categories: Array<EquipmentCategory | 'all'> = [
  'all',
  'generation',
  'storage',
  'mobility',
  'defense',
  'combat',
  'utility',
  'logistics',
];

function PaletteItem({
  item,
  selectedQuality,
  selected,
  onSelect,
}: {
  item: EquipmentItem;
  selectedQuality: QualityId;
  selected: boolean;
  onSelect: (itemId: string | null) => void;
}) {
  const stats = item.qualities[selectedQuality];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${item.id}:${selectedQuality}`,
    data: {
      kind: 'palette-item',
      itemId: item.id,
      quality: selectedQuality,
    },
  });

  return (
    <button
      ref={setNodeRef}
      className={`palette-card ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(selected ? null : item.id)}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.65 : 1,
      }}
      type="button"
      {...listeners}
      {...attributes}
    >
      <img alt="" src={item.imageUrl} />
      <div className="palette-card__body">
        <strong>{item.name}</strong>
        <span>
          {item.width}×{item.height} footprint
        </span>
        {stats.generationKw ? <span>{formatPower(stats.generationKw)} generation</span> : null}
        {stats.drawKw ? <span>{formatPower(stats.drawKw)} draw</span> : null}
        {stats.energyCapacityMj ? <span>{formatEnergy(stats.energyCapacityMj)} storage</span> : null}
        {stats.movementBonusPercent ? (
          <span>+{stats.movementBonusPercent}% movement</span>
        ) : null}
        {stats.shieldHp ? <span>{stats.shieldHp} shield HP</span> : null}
        {stats.inventoryBonus ? <span>+{stats.inventoryBonus} slots</span> : null}
      </div>
    </button>
  );
}

export function EquipmentPalette({
  items,
  selectedQuality,
  activeItemId,
  filter,
  search,
  onSelectQuality,
  onSelectFilter,
  onSelectItem,
  onSearch,
}: EquipmentPaletteProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Equipment palette</h2>
        <p>Drag a module into the grid, or tap a card and then tap a cell.</p>
      </div>
      <div className="quality-row">
        {qualityLevels.map((quality) => (
          <button
            key={quality.id}
            className={`quality-pill ${
              selectedQuality === quality.id ? 'is-selected' : ''
            }`}
            onClick={() => onSelectQuality(quality.id)}
            style={{ borderColor: quality.accent }}
            type="button"
          >
            {quality.label}
          </button>
        ))}
      </div>
      <div className="filter-row">
        {categories.map((category) => (
          <button
            key={category}
            className={`filter-pill ${filter === category ? 'is-selected' : ''}`}
            onClick={() => onSelectFilter(category)}
            type="button"
          >
            {category === 'all' ? 'All' : category}
          </button>
        ))}
      </div>
      <label className="search-field">
        <span>Search</span>
        <input
          onChange={(event) => onSearch(event.target.value)}
          placeholder="exoskeleton, shield, roboport..."
          type="search"
          value={search}
        />
      </label>
      <div className="palette-list">
        {items.map((item) => (
          <PaletteItem
            key={item.id}
            item={item}
            onSelect={onSelectItem}
            selected={activeItemId === item.id}
            selectedQuality={selectedQuality}
          />
        ))}
      </div>
    </section>
  );
}

