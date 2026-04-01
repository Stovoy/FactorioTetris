export type QualityId =
  | 'normal'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type HostType = 'player' | 'vehicle';

export type EquipmentCategory =
  | 'generation'
  | 'storage'
  | 'mobility'
  | 'defense'
  | 'combat'
  | 'utility'
  | 'logistics';

export type ObjectiveId =
  | 'max-exoskeletons'
  | 'max-lasers'
  | 'max-shields'
  | 'balanced';

export type PowerLocationKind = 'surface' | 'space';

export interface QualityLevel {
  id: QualityId;
  label: string;
  shortLabel: string;
  accent: string;
  imageUrl: string;
}

export interface PowerLocation {
  id: string;
  label: string;
  kind: PowerLocationKind;
  solarMultiplier: number;
  dayNightCycleSeconds: number | null;
}

export interface QualityMap<T> {
  normal: T;
  uncommon: T;
  rare: T;
  epic: T;
  legendary: T;
}

export interface HostQualityStats {
  width: number;
  height: number;
  inventorySlots: number;
}

export interface EquipmentQualityStats {
  generationKw?: number;
  averageGenerationKw?: number;
  drawKw?: number;
  averageDrawKw?: number;
  energyCapacityMj?: number;
  movementBonusPercent?: number;
  shieldHp?: number;
  shieldRechargePerSecond?: number;
  laserDamage?: number;
  laserShotsPerSecond?: number;
  laserRange?: number;
  dischargeDamage?: number;
  dischargeRange?: number;
  dischargeArea?: number;
  robotLimit?: number;
  chargingStations?: number;
  constructionAreaDiameter?: number;
  inventoryBonus?: number;
}

export interface GridHost {
  id: string;
  name: string;
  type: HostType;
  imageUrl: string;
  sourceUrl: string;
  note: string;
  qualities: QualityMap<HostQualityStats>;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  width: number;
  height: number;
  imageUrl: string;
  sourceUrl: string;
  note: string;
  qualities: QualityMap<EquipmentQualityStats>;
}

export interface Placement {
  id: string;
  itemId: string;
  quality: QualityId;
  x: number;
  y: number;
}

export interface AutoOptimizeSettings {
  objective: ObjectiveId;
  includeEnergyShield: boolean;
  includeRoboport: boolean;
  includeNightvision: boolean;
  includeBeltImmunity: boolean;
}

export type AccessMatrix = Record<string, QualityMap<boolean>>;

export interface BuildSummary {
  usedCells: number;
  totalCells: number;
  inventorySlots: number;
  dayGenerationKw: number;
  nightGenerationKw: number;
  generationKw: number;
  averageGenerationKw: number;
  drawKw: number;
  sustainedDrawKw: number;
  peakDayNetKw: number;
  peakNightNetKw: number;
  dayNetKw: number;
  nightNetKw: number;
  netPeakKw: number;
  netAverageKw: number;
  energyCapacityMj: number;
  requiredCycleBufferMj: number;
  cycleSustainable: boolean;
  peakBurstSeconds: number | null;
  peakSustainable: boolean;
  batteryRechargeMinutes: number | null;
  nightBatteryMinutes: number | null;
  fullDarkMinutes: number;
  movementBonusPercent: number;
  shieldHp: number;
  shieldRechargePerSecond: number;
  laserDps: number;
  laserRange: number;
  dischargeDamage: number;
  dischargeRange: number;
  dischargeArea: number;
  robotLimit: number;
  chargingStations: number;
  constructionAreaDiameter: number;
  counts: Record<string, number>;
}
