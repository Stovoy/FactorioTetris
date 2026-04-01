import { describe, expect, it } from 'vitest';
import { equipmentItems, gridHosts, powerLocations } from '../data/factorioData';
import { summarizeBuild } from './stats';
import type { Placement } from '../types';

const itemMap = Object.fromEntries(
  equipmentItems.map((item) => [item.id, item] as const),
);

const legendaryModularArmor =
  gridHosts.find((host) => host.id === 'modular-armor') ?? gridHosts[0];
const nauvisSurface =
  powerLocations.find((location) => location.id === 'nauvis') ??
  powerLocations[0];
const fulgoraSurface =
  powerLocations.find((location) => location.id === 'fulgora') ??
  powerLocations[0];

const placements: Placement[] = [
  {
    id: 'solar-1',
    itemId: 'portable-solar-panel',
    quality: 'legendary',
    x: 0,
    y: 0,
  },
  {
    id: 'solar-2',
    itemId: 'portable-solar-panel',
    quality: 'legendary',
    x: 1,
    y: 0,
  },
  {
    id: 'solar-3',
    itemId: 'portable-solar-panel',
    quality: 'legendary',
    x: 2,
    y: 0,
  },
  {
    id: 'solar-4',
    itemId: 'portable-solar-panel',
    quality: 'legendary',
    x: 3,
    y: 0,
  },
  {
    id: 'battery',
    itemId: 'personal-battery-mk3',
    quality: 'legendary',
    x: 0,
    y: 1,
  },
  {
    id: 'exo',
    itemId: 'exoskeleton',
    quality: 'legendary',
    x: 0,
    y: 3,
  },
];

describe('summarizeBuild solar locations', () => {
  it('separates day and night power and applies location solar multipliers', () => {
    const nauvis = summarizeBuild(
      legendaryModularArmor,
      'legendary',
      placements,
      itemMap,
      nauvisSurface,
    );
    const fulgora = summarizeBuild(
      legendaryModularArmor,
      'legendary',
      placements,
      itemMap,
      fulgoraSurface,
    );

    expect(nauvis.dayGenerationKw).toBeCloseTo(300, 5);
    expect(nauvis.nightGenerationKw).toBeCloseTo(0, 5);
    expect(nauvis.drawKw).toBeCloseTo(200, 5);
    expect(nauvis.sustainedDrawKw).toBeCloseTo(70, 5);
    expect(nauvis.peakDayNetKw).toBeCloseTo(100, 5);
    expect(nauvis.peakNightNetKw).toBeCloseTo(-200, 5);
    expect(nauvis.netPeakKw).toBeCloseTo(-200, 5);
    expect(nauvis.peakSustainable).toBe(true);
    expect(nauvis.dayNetKw).toBeCloseTo(230, 5);
    expect(nauvis.nightNetKw).toBeCloseTo(-70, 5);
    expect(nauvis.batteryRechargeMinutes).toBeCloseTo(74.4048, 3);
    expect(nauvis.nightBatteryMinutes).toBeCloseTo(148.8095, 3);
    expect(nauvis.cycleSustainable).toBe(true);

    expect(fulgora.dayGenerationKw).toBeCloseTo(60, 5);
    expect(fulgora.nightGenerationKw).toBeCloseTo(0, 5);
    expect(fulgora.peakDayNetKw).toBeCloseTo(-140, 5);
    expect(fulgora.peakNightNetKw).toBeCloseTo(-200, 5);
    expect(fulgora.netPeakKw).toBeCloseTo(-200, 5);
    expect(fulgora.peakBurstSeconds).toBeCloseTo(3125, 3);
    expect(fulgora.peakSustainable).toBe(true);
    expect(fulgora.dayNetKw).toBeCloseTo(-10, 5);
    expect(fulgora.netAverageKw).toBeCloseTo(-28, 5);
    expect(fulgora.batteryRechargeMinutes).toBeNull();
    expect(fulgora.cycleSustainable).toBe(false);
  });
});
