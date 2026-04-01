import { describe, expect, it } from 'vitest';
import { equipmentItems, gridHosts, powerLocations } from '../data/factorioData';
import { autoOptimize } from './optimizer';
import { summarizeBuild } from './stats';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  ObjectiveId,
  QualityMap,
} from '../types';

const itemMap = Object.fromEntries(
  equipmentItems.map((item) => [item.id, item] as const),
);

const createEnabledQualities = (): QualityMap<boolean> => ({
  normal: true,
  uncommon: true,
  rare: true,
  epic: true,
  legendary: true,
});

const createAccessMatrix = (): AccessMatrix =>
  Object.fromEntries(
    equipmentItems.map((item) => [item.id, createEnabledQualities()]),
  );

const mechArmor =
  gridHosts.find((host) => host.id === 'mech-armor') ?? gridHosts[0];
const nauvisSurface =
  powerLocations.find((location) => location.id === 'nauvis') ??
  powerLocations[0];

const getCount = (counts: Record<string, number>, itemId: string) => counts[itemId] ?? 0;
const defaultSettings = (
  objective: ObjectiveId,
): AutoOptimizeSettings => ({
  objective,
  includeEnergyShield: false,
  includeRoboport: false,
  includeNightvision: false,
  includeBeltImmunity: false,
});
const resultCache = new Map<string, ReturnType<typeof summarizeSettings>>();

function summarizeSettings(settings: AutoOptimizeSettings) {
  const placements = autoOptimize(
    mechArmor,
    'legendary',
    itemMap,
    settings,
    createAccessMatrix(),
    nauvisSurface,
  );

  const summary = summarizeBuild(
    mechArmor,
    'legendary',
    placements,
    itemMap,
    nauvisSurface,
  );

  return {
    placements,
    summary,
    supportCount:
      getCount(summary.counts, 'portable-fusion-reactor') +
      getCount(summary.counts, 'portable-fission-reactor') +
      getCount(summary.counts, 'portable-solar-panel'),
  };
}

function createSelectiveAccessMatrix(enabledItemIds: string[]): AccessMatrix {
  const enabledSet = new Set(enabledItemIds);

  return Object.fromEntries(
    equipmentItems.map((item) => [
      item.id,
      enabledSet.has(item.id)
        ? createEnabledQualities()
        : {
            normal: false,
            uncommon: false,
            rare: false,
            epic: false,
            legendary: false,
          },
    ]),
  );
}

const runObjective = (objective: ObjectiveId) => {
  const settings = defaultSettings(objective);
  const cacheKey = JSON.stringify(settings);
  const cached = resultCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = summarizeSettings(settings);
  resultCache.set(cacheKey, result);
  return result;
};

const runSettings = (settings: AutoOptimizeSettings) => {
  const cacheKey = JSON.stringify(settings);
  const cached = resultCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = summarizeSettings(settings);
  resultCache.set(cacheKey, result);
  return result;
};

describe('autoOptimize legendary mech armor', () => {
  it('keeps every objective average-net positive', () => {
    const objectives: ObjectiveId[] = [
      'balanced',
      'max-exoskeletons',
      'max-lasers',
      'max-shields',
    ];

    for (const objective of objectives) {
      const { summary } = runObjective(objective);
      expect(summary.netAverageKw).toBeGreaterThan(0);
      expect(summary.usedCells).toBeGreaterThan(0);
    }
  });

  it('produces an actual mobility build for max-exoskeletons', () => {
    const { summary, supportCount } = runObjective('max-exoskeletons');

    expect(getCount(summary.counts, 'exoskeleton')).toBeGreaterThanOrEqual(15);
    expect(summary.movementBonusPercent).toBeGreaterThanOrEqual(1000);
    expect(getCount(summary.counts, 'personal-laser-defense')).toBe(0);
    expect(getCount(summary.counts, 'energy-shield-mk2')).toBe(0);
    expect(supportCount).toBeLessThan(getCount(summary.counts, 'exoskeleton'));
  });

  it('produces an actual laser build for max-lasers', () => {
    const { summary, supportCount } = runObjective('max-lasers');

    expect(getCount(summary.counts, 'personal-laser-defense')).toBeGreaterThanOrEqual(20);
    expect(summary.laserDps).toBeGreaterThanOrEqual(300);
    expect(getCount(summary.counts, 'personal-battery-mk3')).toBe(0);
    expect(getCount(summary.counts, 'energy-shield-mk2')).toBe(0);
    expect(supportCount).toBeLessThan(getCount(summary.counts, 'personal-laser-defense'));
  });

  it('produces an actual shield build for max-shields', () => {
    const { summary, supportCount } = runObjective('max-shields');

    expect(getCount(summary.counts, 'energy-shield-mk2')).toBeGreaterThanOrEqual(20);
    expect(summary.shieldHp).toBeGreaterThanOrEqual(7500);
    expect(getCount(summary.counts, 'personal-battery-mk3')).toBe(0);
    expect(getCount(summary.counts, 'personal-laser-defense')).toBe(0);
    expect(supportCount).toBeLessThan(getCount(summary.counts, 'energy-shield-mk2'));
  });

  it('produces a mixed build for balanced', () => {
    const { summary, supportCount } = runObjective('balanced');
    const utilityCount =
      Object.values(summary.counts).reduce((total, count) => total + count, 0) -
      supportCount;

    expect(getCount(summary.counts, 'exoskeleton')).toBeGreaterThan(0);
    expect(getCount(summary.counts, 'energy-shield-mk2')).toBeGreaterThan(0);
    expect(getCount(summary.counts, 'personal-laser-defense')).toBeGreaterThan(0);
    expect(summary.movementBonusPercent).toBeGreaterThan(0);
    expect(summary.shieldHp).toBeGreaterThan(0);
    expect(summary.laserDps).toBeGreaterThan(0);
    expect(supportCount).toBeLessThan(utilityCount);
  });

  it('can force utility essentials into the optimized build', () => {
    const { summary } = runSettings({
      ...defaultSettings('balanced'),
      includeEnergyShield: true,
      includeRoboport: true,
      includeNightvision: true,
      includeBeltImmunity: true,
    });

    expect(
      getCount(summary.counts, 'energy-shield') +
        getCount(summary.counts, 'energy-shield-mk2'),
    ).toBe(1);
    expect(
      getCount(summary.counts, 'personal-roboport') +
        getCount(summary.counts, 'personal-roboport-mk2'),
    ).toBe(1);
    expect(getCount(summary.counts, 'nightvision')).toBe(1);
    expect(getCount(summary.counts, 'belt-immunity')).toBe(1);
    expect(summary.netAverageKw).toBeGreaterThan(0);
  });

  it('never duplicates night vision or belt immunity', () => {
    const placements = autoOptimize(
      mechArmor,
      'legendary',
      itemMap,
      defaultSettings('balanced'),
      createSelectiveAccessMatrix([
        'portable-fusion-reactor',
        'nightvision',
        'belt-immunity',
      ]),
      nauvisSurface,
    );
    const summary = summarizeBuild(
      mechArmor,
      'legendary',
      placements,
      itemMap,
      nauvisSurface,
    );

    expect(getCount(summary.counts, 'nightvision')).toBeLessThanOrEqual(1);
    expect(getCount(summary.counts, 'belt-immunity')).toBeLessThanOrEqual(1);
  });

  it('fills remaining space with batteries before solar when filler is available', () => {
    const placements = autoOptimize(
      mechArmor,
      'legendary',
      itemMap,
      defaultSettings('balanced'),
      createSelectiveAccessMatrix([
        'portable-fusion-reactor',
        'personal-battery-mk3',
        'portable-solar-panel',
      ]),
      nauvisSurface,
    );
    const summary = summarizeBuild(
      mechArmor,
      'legendary',
      placements,
      itemMap,
      nauvisSurface,
    );

    expect(summary.usedCells).toBe(summary.totalCells);
    expect(getCount(summary.counts, 'personal-battery-mk3')).toBeGreaterThan(0);
    expect(getCount(summary.counts, 'personal-battery-mk3')).toBeGreaterThan(
      getCount(summary.counts, 'portable-solar-panel'),
    );
  });

  it('adds batteries when peak burst support would otherwise fail', () => {
    const placements = autoOptimize(
      mechArmor,
      'legendary',
      itemMap,
      defaultSettings('max-lasers'),
      createSelectiveAccessMatrix([
        'portable-fission-reactor',
        'personal-battery-mk3',
        'personal-laser-defense',
      ]),
      nauvisSurface,
    );
    const summary = summarizeBuild(
      mechArmor,
      'legendary',
      placements,
      itemMap,
      nauvisSurface,
    );

    expect(getCount(summary.counts, 'personal-battery-mk3')).toBeGreaterThan(0);
    expect(summary.peakSustainable).toBe(true);
  });
});
