import { getItemFootprint, getUsedCellCount } from './grid';
import type {
  BuildSummary,
  EquipmentItem,
  GridHost,
  Placement,
  PowerLocation,
  QualityId,
} from '../types';

const DAY_PHASE_RATIO = 0.5;
const DUSK_PHASE_RATIO = 0.2;
const NIGHT_PHASE_RATIO = 0.1;
const DAWN_PHASE_RATIO = 0.2;
const SURFACE_AVERAGE_SOLAR_FACTOR = 0.7;
const SOLAR_BUFFER_SIMULATION_STEPS = 120;
const PEAK_BURST_TARGET_SECONDS = 10;
const SUSTAINED_DRAW_FACTORS: Record<string, number> = {
  'energy-shield': 0.15,
  'energy-shield-mk2': 0.15,
  exoskeleton: 0.35,
  'personal-laser-defense': 0.2,
  'personal-roboport': 0.12,
  'personal-roboport-mk2': 0.08,
  'belt-immunity': 0.15,
  'discharge-defense': 0.03,
};

const getSolarDayKw = (basePeakKw: number, location: PowerLocation) =>
  basePeakKw * location.solarMultiplier;

const getSolarAverageKw = (basePeakKw: number, location: PowerLocation) =>
  getSolarDayKw(basePeakKw, location) *
  (location.kind === 'space' ? 1 : SURFACE_AVERAGE_SOLAR_FACTOR);

const getSolarNightKw = (basePeakKw: number, location: PowerLocation) =>
  location.kind === 'space' ? getSolarDayKw(basePeakKw, location) : 0;

export const getSustainedDrawKw = (
  itemId: string,
  stats: EquipmentItem['qualities']['normal'],
) => {
  if (stats.averageDrawKw !== undefined) {
    return stats.averageDrawKw;
  }

  const peakDrawKw = stats.drawKw ?? 0;
  return peakDrawKw * (SUSTAINED_DRAW_FACTORS[itemId] ?? 1);
};

const getSolarFactorAtProgress = (location: PowerLocation, progress: number) => {
  if (location.kind === 'space') {
    return 1;
  }

  if (progress < DAY_PHASE_RATIO) {
    return 1;
  }

  if (progress < DAY_PHASE_RATIO + DUSK_PHASE_RATIO) {
    return 1 - (progress - DAY_PHASE_RATIO) / DUSK_PHASE_RATIO;
  }

  if (progress < DAY_PHASE_RATIO + DUSK_PHASE_RATIO + NIGHT_PHASE_RATIO) {
    return 0;
  }

  return (
    (progress - (DAY_PHASE_RATIO + DUSK_PHASE_RATIO + NIGHT_PHASE_RATIO)) /
    DAWN_PHASE_RATIO
  );
};

const getRequiredCycleBufferMj = (
  constantGenerationKw: number,
  solarBasePeakKw: number,
  drawKw: number,
  location: PowerLocation,
) => {
  if (location.kind === 'space' || !location.dayNightCycleSeconds) {
    return 0;
  }

  let cumulativeEnergyMj = 0;
  let peakEnergyMj = 0;
  let maxDrawdownMj = 0;

  for (let step = 0; step < SOLAR_BUFFER_SIMULATION_STEPS; step += 1) {
    const progress = step / SOLAR_BUFFER_SIMULATION_STEPS;
    const nextProgress = (step + 1) / SOLAR_BUFFER_SIMULATION_STEPS;
    const durationSeconds =
      (nextProgress - progress) * location.dayNightCycleSeconds;
    const solarFactor = getSolarFactorAtProgress(
      location,
      progress + (nextProgress - progress) / 2,
    );
    const netKw =
      constantGenerationKw +
      getSolarDayKw(solarBasePeakKw, location) * solarFactor -
      drawKw;

    cumulativeEnergyMj += (netKw * durationSeconds) / 1000;
    peakEnergyMj = Math.max(peakEnergyMj, cumulativeEnergyMj);
    maxDrawdownMj = Math.max(maxDrawdownMj, peakEnergyMj - cumulativeEnergyMj);
  }

  return maxDrawdownMj;
};

export const summarizeBuild = (
  host: GridHost,
  hostQuality: QualityId,
  placements: Placement[],
  itemMap: Record<string, EquipmentItem>,
  location: PowerLocation,
): BuildSummary => {
  const hostStats = host.qualities[hostQuality];
  const counts: Record<string, number> = {};
  let constantGenerationKw = 0;
  let solarBasePeakKw = 0;
  let drawKw = 0;
  let sustainedDrawKw = 0;
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

    if (placement.itemId === 'portable-solar-panel') {
      solarBasePeakKw += stats.generationKw ?? 0;
    } else {
      constantGenerationKw += stats.generationKw ?? 0;
    }

    drawKw += stats.drawKw ?? 0;
    sustainedDrawKw += getSustainedDrawKw(placement.itemId, stats);
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

  const solarDayKw = getSolarDayKw(solarBasePeakKw, location);
  const solarAverageKw = getSolarAverageKw(solarBasePeakKw, location);
  const solarNightKw = getSolarNightKw(solarBasePeakKw, location);
  const dayGenerationKw = constantGenerationKw + solarDayKw;
  const averageGenerationKw = constantGenerationKw + solarAverageKw;
  const nightGenerationKw = constantGenerationKw + solarNightKw;
  const peakDayNetKw = dayGenerationKw - drawKw;
  const peakNightNetKw = nightGenerationKw - drawKw;
  const dayNetKw = dayGenerationKw - sustainedDrawKw;
  const nightNetKw = nightGenerationKw - sustainedDrawKw;
  const requiredCycleBufferMj = getRequiredCycleBufferMj(
    constantGenerationKw,
    solarBasePeakKw,
    sustainedDrawKw,
    location,
  );
  const fullDarkMinutes = location.dayNightCycleSeconds
    ? (location.dayNightCycleSeconds * NIGHT_PHASE_RATIO) / 60
    : 0;
  const worstPeakDeficitKw = Math.max(0, -Math.min(peakDayNetKw, peakNightNetKw));
  const peakBurstSeconds =
    worstPeakDeficitKw > 0
      ? (energyCapacityMj * 1000) / worstPeakDeficitKw
      : null;
  const peakSustainable =
    worstPeakDeficitKw === 0 ||
    (peakBurstSeconds !== null && peakBurstSeconds >= PEAK_BURST_TARGET_SECONDS);
  const batteryRechargeMinutes =
    energyCapacityMj <= 0 || averageGenerationKw <= sustainedDrawKw
      ? null
      : (energyCapacityMj * 1000) / (averageGenerationKw - sustainedDrawKw) / 60;
  const nightBatteryMinutes =
    location.kind === 'space' || nightNetKw >= 0
      ? null
      : (energyCapacityMj * 1000) / Math.abs(nightNetKw) / 60;
  const cycleSustainable =
    averageGenerationKw >= sustainedDrawKw &&
    dayNetKw >= 0 &&
    energyCapacityMj + 1e-6 >= requiredCycleBufferMj;

  return {
    usedCells: getUsedCellCount(placements, itemMap),
    totalCells: hostStats.width * hostStats.height,
    inventorySlots: hostStats.inventorySlots + inventoryBonus,
    dayGenerationKw,
    nightGenerationKw,
    generationKw: dayGenerationKw,
    averageGenerationKw,
    drawKw,
    sustainedDrawKw,
    peakDayNetKw,
    peakNightNetKw,
    dayNetKw,
    nightNetKw,
    netPeakKw: Math.min(peakDayNetKw, peakNightNetKw),
    netAverageKw: averageGenerationKw - sustainedDrawKw,
    energyCapacityMj,
    requiredCycleBufferMj,
    cycleSustainable,
    peakBurstSeconds,
    peakSustainable,
    batteryRechargeMinutes,
    nightBatteryMinutes,
    fullDarkMinutes,
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
) => {
  const footprint = getItemFootprint(item);
  return `${footprint.width}×${footprint.height}`;
};
