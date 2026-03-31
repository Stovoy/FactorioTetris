import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getItemFootprint } from '../lib/grid';
import type { EquipmentItem, GridHost, Placement, QualityId } from '../types';

function Cell({
  x,
  y,
  onClick,
}: {
  x: number;
  y: number;
  onClick: (x: number, y: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell:${x}:${y}`,
    data: { kind: 'grid-cell', x, y },
  });

  return (
    <button
      ref={setNodeRef}
      className={`grid-cell ${isOver ? 'is-over' : ''}`}
      onClick={() => onClick(x, y)}
      type="button"
    />
  );
}

function PlacementTile({
  item,
  placement,
  selected,
  onSelect,
}: {
  item: EquipmentItem;
  placement: Placement;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const footprint = getItemFootprint(item, placement.rotated);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placement:${placement.id}`,
    data: {
      kind: 'placement',
      placementId: placement.id,
      itemId: placement.itemId,
      quality: placement.quality,
    },
  });

  return (
    <button
      ref={setNodeRef}
      className={`placement-tile ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(placement.id)}
      style={{
        gridColumn: `${placement.x + 1} / span ${footprint.width}`,
        gridRow: `${placement.y + 1} / span ${footprint.height}`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
      }}
      type="button"
      {...listeners}
      {...attributes}
    >
      <img alt="" src={item.imageUrl} />
      <span>{item.name}</span>
      <small>{placement.quality}</small>
    </button>
  );
}

interface GridEditorProps {
  host: GridHost;
  hostQuality: QualityId;
  placements: Placement[];
  itemMap: Record<string, EquipmentItem>;
  selectedPlacementId: string | null;
  onPlaceAtCell: (x: number, y: number) => void;
  onSelectPlacement: (placementId: string | null) => void;
}

export function GridEditor({
  host,
  hostQuality,
  placements,
  itemMap,
  selectedPlacementId,
  onPlaceAtCell,
  onSelectPlacement,
}: GridEditorProps) {
  const stats = host.qualities[hostQuality];

  return (
    <section className="panel panel--grid">
      <div className="panel-header">
        <h2>Grid editor</h2>
        <p>
          {host.name} at {hostQuality} quality. Current grid is {stats.width}×{stats.height}.
        </p>
      </div>
      <div className="grid-shell">
        <div
          className="grid-layer grid-cells"
          style={{
            gridTemplateColumns: `repeat(${stats.width}, var(--cell-size))`,
            gridTemplateRows: `repeat(${stats.height}, var(--cell-size))`,
          }}
        >
          {Array.from({ length: stats.height }, (_, y) =>
            Array.from({ length: stats.width }, (_, x) => (
              <Cell key={`${x}-${y}`} onClick={onPlaceAtCell} x={x} y={y} />
            )),
          )}
        </div>
        <div
          className="grid-layer grid-placements"
          style={{
            gridTemplateColumns: `repeat(${stats.width}, var(--cell-size))`,
            gridTemplateRows: `repeat(${stats.height}, var(--cell-size))`,
          }}
        >
          {placements.map((placement) => (
            <PlacementTile
              key={placement.id}
              item={itemMap[placement.itemId]}
              onSelect={onSelectPlacement}
              placement={placement}
              selected={selectedPlacementId === placement.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

