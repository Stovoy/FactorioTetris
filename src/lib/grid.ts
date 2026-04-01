import type { EquipmentItem, GridHost, Placement, QualityId } from '../types';

export interface PlacementTemplate {
  itemId: string;
  quality: QualityId;
}

export const createPlacementId = (() => {
  let counter = 0;
  return () => `placement-${counter++}`;
})();

export const getItemFootprint = (item: EquipmentItem): { width: number; height: number } => ({
  width: item.width,
  height: item.height,
});

export const doesPlacementFit = (
  placement: Placement,
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  placements: Placement[],
  ignorePlacementId?: string,
) => {
  const hostStats = host.qualities[hostQuality];
  const item = itemMap[placement.itemId];

  if (!item) {
    return false;
  }

  const footprint = getItemFootprint(item);

  if (
    placement.x < 0 ||
    placement.y < 0 ||
    placement.x + footprint.width > hostStats.width ||
    placement.y + footprint.height > hostStats.height
  ) {
    return false;
  }

  for (const candidate of placements) {
    if (candidate.id === ignorePlacementId) {
      continue;
    }

    const candidateItem = itemMap[candidate.itemId];
    const candidateFootprint = getItemFootprint(candidateItem);
    const overlaps =
      placement.x < candidate.x + candidateFootprint.width &&
      placement.x + footprint.width > candidate.x &&
      placement.y < candidate.y + candidateFootprint.height &&
      placement.y + footprint.height > candidate.y;

    if (overlaps) {
      return false;
    }
  }

  return true;
};

export const getUsedCellCount = (
  placements: Placement[],
  itemMap: Record<string, EquipmentItem>,
) =>
  placements.reduce((total, placement) => {
    const item = itemMap[placement.itemId];
    const footprint = getItemFootprint(item);
    return total + footprint.width * footprint.height;
  }, 0);

export const packTemplates = (
  templates: PlacementTemplate[],
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
): Placement[] | null => {
  const hostStats = host.qualities[hostQuality];
  const ordered = [...templates].sort((left, right) => {
    const leftItem = itemMap[left.itemId];
    const rightItem = itemMap[right.itemId];
    const leftArea = leftItem.width * leftItem.height;
    const rightArea = rightItem.width * rightItem.height;
    return rightArea - leftArea;
  });

  const placements: Placement[] = [];

  for (const template of ordered) {
    const item = itemMap[template.itemId];
    const footprint = getItemFootprint(item);
    let placed = false;

    for (let y = 0; y <= hostStats.height - footprint.height; y += 1) {
      for (let x = 0; x <= hostStats.width - footprint.width; x += 1) {
        const placement: Placement = {
          id: createPlacementId(),
          itemId: template.itemId,
          quality: template.quality,
          x,
          y,
        };

        if (doesPlacementFit(placement, host, hostQuality, itemMap, placements)) {
          placements.push(placement);
          placed = true;
          break;
        }
      }

      if (placed) {
        break;
      }
    }

    if (!placed) {
      return null;
    }
  }

  return placements;
};
