import { packTemplates } from './grid';
import { summarizeBuild } from './stats';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  EquipmentItem,
  GridHost,
  ObjectiveId,
  Placement,
  QualityId,
} from '../types';

interface Candidate {
  itemId: string;
  quality: QualityId;
}

const candidateOrder = (objective: ObjectiveId) => {
  switch (objective) {
    case 'max-exoskeletons':
      return [
        'portable-fission-reactor',
        'exoskeleton',
        'personal-battery-mk3',
        'energy-shield-mk2',
        'portable-solar-panel',
      ];
    case 'max-lasers':
      return [
        'portable-fission-reactor',
        'personal-laser-defense',
        'personal-battery-mk3',
        'energy-shield-mk2',
        'portable-solar-panel',
      ];
    case 'max-shields':
      return [
        'portable-fission-reactor',
        'energy-shield-mk2',
        'personal-battery-mk3',
        'energy-shield',
        'portable-solar-panel',
      ];
    case 'max-battery':
      return [
        'portable-fission-reactor',
        'personal-battery-mk3',
        'personal-battery-mk2',
        'portable-solar-panel',
        'energy-shield-mk2',
      ];
    case 'minimum-power-deficit':
      return [
        'portable-fission-reactor',
        'portable-solar-panel',
        'personal-battery-mk3',
        'energy-shield-mk2',
        'exoskeleton',
      ];
    case 'balanced':
    default:
      return [
        'portable-fission-reactor',
        'energy-shield-mk2',
        'personal-battery-mk3',
        'exoskeleton',
        'personal-laser-defense',
        'portable-solar-panel',
        'personal-roboport-mk2',
      ];
  }
};

const getScore = (
  item: EquipmentItem,
  stats: EquipmentItem['qualities']['normal'],
  objective: ObjectiveId,
  currentNetKw: number,
) => {
  const area = item.width * item.height;
  let score = 0;

  switch (objective) {
    case 'max-exoskeletons':
      score += (stats.movementBonusPercent ?? 0) * 12;
      score += (stats.energyCapacityMj ?? 0) * 0.2;
      break;
    case 'max-lasers':
      score += ((stats.laserDamage ?? 0) * (stats.laserShotsPerSecond ?? 0)) * 16;
      score += (stats.laserRange ?? 0) * 6;
      break;
    case 'max-shields':
      score += (stats.shieldHp ?? 0) * 1.5;
      score += (stats.shieldRechargePerSecond ?? 0) * 8;
      break;
    case 'max-battery':
      score += (stats.energyCapacityMj ?? 0) * 1.4;
      break;
    case 'minimum-power-deficit':
      score += (stats.generationKw ?? 0) * 4;
      score += (stats.averageGenerationKw ?? 0) * 2;
      score -= (stats.drawKw ?? 0) * 0.7;
      break;
    case 'balanced':
    default:
      score += (stats.movementBonusPercent ?? 0) * 8;
      score += ((stats.laserDamage ?? 0) * (stats.laserShotsPerSecond ?? 0)) * 10;
      score += (stats.shieldHp ?? 0) * 0.7;
      score += (stats.energyCapacityMj ?? 0) * 0.35;
      score += (stats.robotLimit ?? 0) * 1.5;
      score += (stats.generationKw ?? 0) * 0.8;
      score -= (stats.drawKw ?? 0) * 0.1;
      break;
  }

  if (currentNetKw < 0) {
    score += (stats.generationKw ?? 0) * 6;
    score += (stats.averageGenerationKw ?? 0) * 3;
    score -= (stats.drawKw ?? 0) * 0.3;
  }

  return score / area;
};

export const autoOptimize = (
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  settings: AutoOptimizeSettings,
  accessMatrix: AccessMatrix,
): Placement[] => {
  const templates: Candidate[] = [];
  const counts: Record<string, number> = {};
  const maxIterations = host.qualities[hostQuality].width * host.qualities[hostQuality].height;
  const preferredIds = candidateOrder(settings.objective);
  const qualityOrder: QualityId[] = [
    'legendary',
    'epic',
    'rare',
    'uncommon',
    'normal',
  ];
  const candidates: Candidate[] = preferredIds.flatMap((itemId) =>
    qualityOrder
      .filter((quality) => accessMatrix[itemId]?.[quality])
      .map((quality) => ({ itemId, quality })),
  );

  const getBestEnabledQuality = (itemId: string) =>
    qualityOrder.find((quality) => accessMatrix[itemId]?.[quality]);

  for (let index = 0; index < settings.minReactors; index += 1) {
    const quality = getBestEnabledQuality('portable-fission-reactor');
    if (!quality) {
      break;
    }
    templates.push({ itemId: 'portable-fission-reactor', quality });
    counts['portable-fission-reactor'] = (counts['portable-fission-reactor'] ?? 0) + 1;
  }

  for (let index = 0; index < settings.reserveBatteries; index += 1) {
    const quality = getBestEnabledQuality('personal-battery-mk3');
    if (!quality) {
      break;
    }
    templates.push({ itemId: 'personal-battery-mk3', quality });
    counts['personal-battery-mk3'] = (counts['personal-battery-mk3'] ?? 0) + 1;
  }

  let placements = packTemplates(templates, host, hostQuality, itemMap) ?? [];

  for (let step = 0; step < maxIterations; step += 1) {
    const summary = summarizeBuild(host, hostQuality, placements, itemMap);

    let bestCandidate: Candidate | null = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const item = itemMap[candidate.itemId];

      if (!item) {
        continue;
      }

      if (
        candidate.itemId === 'exoskeleton' &&
        (counts.exoskeleton ?? 0) >= settings.maxExoskeletons
      ) {
        continue;
      }

      if (
        candidate.itemId === 'personal-laser-defense' &&
        (counts['personal-laser-defense'] ?? 0) >= settings.maxLaserDefenses
      ) {
        continue;
      }

      const score = getScore(
        item,
        item.qualities[candidate.quality],
        settings.objective,
        summary.netPeakKw,
      );

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) {
      break;
    }

    const nextTemplates = [...templates, bestCandidate];
    const nextPlacements = packTemplates(nextTemplates, host, hostQuality, itemMap);

    if (!nextPlacements) {
      const currentIndex = candidates.findIndex(
        (candidate) =>
          candidate.itemId === bestCandidate.itemId &&
          candidate.quality === bestCandidate.quality,
      );
      if (currentIndex >= 0) {
        candidates.splice(currentIndex, 1);
      }
      if (candidates.length === 0) {
        break;
      }
      continue;
    }

    templates.push(bestCandidate);
    counts[bestCandidate.itemId] = (counts[bestCandidate.itemId] ?? 0) + 1;
    placements = nextPlacements;
  }

  return placements;
};
