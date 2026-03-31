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
  | 'minimum-power-deficit'
  | 'max-exoskeletons'
  | 'max-lasers'
  | 'max-shields'
  | 'max-battery'
  | 'balanced';

export interface QualityLevel {
  id: QualityId;
  label: string;
  shortLabel: string;
  accent: string;
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
  rotated: boolean;
}

export interface AutoOptimizeSettings {
  objective: ObjectiveId;
  maxExoskeletons: number;
  maxLaserDefenses: number;
  minReactors: number;
  reserveBatteries: number;
}

export type AccessMatrix = Record<string, QualityMap<boolean>>;

export interface BuildSummary {
  usedCells: number;
  totalCells: number;
  inventorySlots: number;
  generationKw: number;
  averageGenerationKw: number;
  drawKw: number;
  netPeakKw: number;
  netAverageKw: number;
  energyCapacityMj: number;
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
