import { getItemFootprint, getUsedCellCount } from './grid';
import type {
  BuildSummary,
  EquipmentItem,
  GridHost,
  Placement,
  QualityId,
} from '../types';

export const summarizeBuild = (
  host: GridHost,
  hostQuality: QualityId,
  placements: Placement[],
  itemMap: Record<string, EquipmentItem>,
): BuildSummary => {
  const hostStats = host.qualities[hostQuality];
  const counts: Record<string, number> = {};
  let generationKw = 0;
  let averageGenerationKw = 0;
  let drawKw = 0;
  let energyCapacityMj = 0;
  let inventoryBonus = 0;
  let movementBonusPercent = 0;
  let shieldHp = 0;
  let shieldRechargePerSecond = 0;
  let laserDps = 0;
  let laserRange = 0;
  let dischargeDamage = 0;
  let dischargeRange = 0;
  let dischargeArea = 0;
  let robotLimit = 0;
  let chargingStations = 0;
  let constructionAreaSquares = 0;

  for (const placement of placements) {
    const item = itemMap[placement.itemId];
    const stats = item.qualities[placement.quality];

    counts[placement.itemId] = (counts[placement.itemId] ?? 0) + 1;
    generationKw += stats.generationKw ?? 0;
    averageGenerationKw += stats.averageGenerationKw ?? stats.generationKw ?? 0;
    drawKw += stats.drawKw ?? 0;
    energyCapacityMj += stats.energyCapacityMj ?? 0;
    inventoryBonus += stats.inventoryBonus ?? 0;
    movementBonusPercent += stats.movementBonusPercent ?? 0;
    shieldHp += stats.shieldHp ?? 0;
    shieldRechargePerSecond += stats.shieldRechargePerSecond ?? 0;
    laserDps +=
      (stats.laserDamage ?? 0) * (stats.laserShotsPerSecond ?? 0);
    laserRange = Math.max(laserRange, stats.laserRange ?? 0);
    dischargeDamage += stats.dischargeDamage ?? 0;
    dischargeRange = Math.max(dischargeRange, stats.dischargeRange ?? 0);
    dischargeArea = Math.max(dischargeArea, stats.dischargeArea ?? 0);
    robotLimit += stats.robotLimit ?? 0;
    chargingStations += stats.chargingStations ?? 0;
    constructionAreaSquares += Math.pow(stats.constructionAreaDiameter ?? 0, 2);
  }

  return {
    usedCells: getUsedCellCount(placements, itemMap),
    totalCells: hostStats.width * hostStats.height,
    inventorySlots: hostStats.inventorySlots + inventoryBonus,
    generationKw,
    averageGenerationKw,
    drawKw,
    netPeakKw: generationKw - drawKw,
    netAverageKw: averageGenerationKw - drawKw,
    energyCapacityMj,
    movementBonusPercent,
    shieldHp,
    shieldRechargePerSecond,
    laserDps,
    laserRange,
    dischargeDamage,
    dischargeRange,
    dischargeArea,
    robotLimit,
    chargingStations,
    constructionAreaDiameter:
      constructionAreaSquares > 0
        ? Math.round(Math.sqrt(constructionAreaSquares))
        : 0,
    counts,
  };
};

export const formatPower = (valueKw: number) => {
  if (Math.abs(valueKw) >= 1000) {
    return `${(valueKw / 1000).toFixed(2)} MW`;
  }

  return `${valueKw.toFixed(0)} kW`;
};

export const formatEnergy = (valueMj: number) => {
  if (valueMj >= 1000) {
    return `${(valueMj / 1000).toFixed(2)} GJ`;
  }

  return `${valueMj.toFixed(2)} MJ`;
};

export const formatFootprint = (
  item: EquipmentItem,
  placement?: Placement,
) => {
  const footprint = getItemFootprint(item, placement?.rotated ?? false);
  return `${footprint.width}×${footprint.height}`;
};

