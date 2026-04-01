import { packTemplates, type PlacementTemplate } from './grid';
import { getSustainedDrawKw, summarizeBuild } from './stats';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  BuildSummary,
  EquipmentItem,
  GridHost,
  Placement,
  PowerLocation,
  QualityId,
} from '../types';

interface Candidate {
  itemId: string;
  quality: QualityId;
}

const SINGLETON_ITEM_GROUPS = [
  ['energy-shield', 'energy-shield-mk2'],
  ['nightvision'],
  ['belt-immunity'],
  ['personal-roboport', 'personal-roboport-mk2'],
] as const;
const AUTO_SINGLETON_ITEM_IDS = new Set([
  'nightvision',
  'belt-immunity',
]);

const POSITIVE_NET_BUFFER_KW = 1;
const CYCLE_BUFFER_TOLERANCE_MJ = 0.05;
const PEAK_BURST_TARGET_SECONDS = 10;
const qualityOrder: QualityId[] = [
  'legendary',
  'epic',
  'rare',
  'uncommon',
  'normal',
];

const getDayDeltaKw = (
  itemId: string,
  stats: EquipmentItem['qualities']['normal'],
  location: PowerLocation,
) => {
  const dayGenerationKw =
    itemId === 'portable-solar-panel'
      ? (stats.generationKw ?? 0) * location.solarMultiplier
      : stats.generationKw ?? 0;

  return dayGenerationKw - getSustainedDrawKw(itemId, stats);
};

const getAverageDeltaKw = (
  itemId: string,
  stats: EquipmentItem['qualities']['normal'],
  location: PowerLocation,
) => {
  const averageGenerationKw =
    itemId === 'portable-solar-panel'
      ? (stats.generationKw ?? 0) *
        location.solarMultiplier *
        (location.kind === 'space' ? 1 : 0.7)
      : stats.averageGenerationKw ?? stats.generationKw ?? 0;

  return averageGenerationKw - getSustainedDrawKw(itemId, stats);
};

const getArea = (item: EquipmentItem) => item.width * item.height;

const getLaserDps = (stats: EquipmentItem['qualities']['normal']) =>
  (stats.laserDamage ?? 0) * (stats.laserShotsPerSecond ?? 0);

const getPowerShortfallScore = (summary: BuildSummary) => {
  const dayShortfallKw = Math.max(0, POSITIVE_NET_BUFFER_KW - summary.dayNetKw);
  const averageShortfallKw = Math.max(0, -summary.netAverageKw);
  const bufferShortfallMj = Math.max(
    0,
    summary.requiredCycleBufferMj - summary.energyCapacityMj - CYCLE_BUFFER_TOLERANCE_MJ,
  );
  const peakBurstShortfallMj = Math.max(
    0,
    (Math.max(0, -summary.netPeakKw) * PEAK_BURST_TARGET_SECONDS) / 1000 -
      summary.energyCapacityMj,
  );

  return (
    dayShortfallKw * 10000 +
    averageShortfallKw * 10000 +
    bufferShortfallMj * 100 +
    peakBurstShortfallMj * 200
  );
};

const isPowerSupported = (summary: BuildSummary) =>
  getPowerShortfallScore(summary) <= CYCLE_BUFFER_TOLERANCE_MJ;

const hasRequiredSingletonAlreadyPlaced = (
  summary: BuildSummary,
  itemId: string,
  requiredSingletonItemIds: Set<string>,
) =>
  SINGLETON_ITEM_GROUPS.some((group) =>
    group.some((candidateId) => requiredSingletonItemIds.has(candidateId)) &&
    group.some((candidateId) => candidateId === itemId) &&
    group.some((candidateId) => (summary.counts[candidateId] ?? 0) > 0),
  );

const hasAutoSingletonAlreadyPlaced = (
  summary: BuildSummary,
  itemId: string,
) => AUTO_SINGLETON_ITEM_IDS.has(itemId) && (summary.counts[itemId] ?? 0) > 0;

const getUtilityScore = (
  summary: BuildSummary,
  stats: EquipmentItem['qualities']['normal'],
  objective: AutoOptimizeSettings['objective'],
) => {
  switch (objective) {
    case 'max-exoskeletons':
      return (stats.movementBonusPercent ?? 0) * 10;
    case 'max-lasers':
      return getLaserDps(stats) * 18 + (stats.laserRange ?? 0) * 2;
    case 'max-shields':
      return (stats.shieldHp ?? 0) + (stats.shieldRechargePerSecond ?? 0) * 6;
    case 'balanced':
    default:
      return (
        (stats.movementBonusPercent ?? 0) *
          (4 / (1 + summary.movementBonusPercent / 300)) +
        getLaserDps(stats) * (10 / (1 + summary.laserDps / 90)) +
        (stats.laserRange ?? 0) * 1.5 +
        (stats.shieldHp ?? 0) *
          (0.35 / (1 + summary.shieldHp / 2000)) +
        (stats.shieldRechargePerSecond ?? 0) *
          (6 / (1 + summary.shieldRechargePerSecond / 180)) +
        (stats.energyCapacityMj ?? 0) *
          (0.18 / (1 + summary.energyCapacityMj / 1500)) +
        (stats.inventoryBonus ?? 0) *
          (4 / (1 + Math.max(0, summary.inventorySlots - 125) / 40)) +
        (stats.robotLimit ?? 0) * (1.2 / (1 + summary.robotLimit / 25)) +
        (stats.chargingStations ?? 0) * 4 +
        (stats.constructionAreaDiameter ?? 0) * 0.75
      );
  }
};

const buildCandidates = (
  itemMap: Record<string, EquipmentItem>,
  accessMatrix: AccessMatrix,
) =>
  Object.values(itemMap).flatMap((item) => {
    const quality = qualityOrder.find((candidate) => accessMatrix[item.id]?.[candidate]);
    return quality ? [{ itemId: item.id, quality }] : [];
  });

const resolveRequiredCandidates = (
  settings: AutoOptimizeSettings,
  candidates: Candidate[],
) => {
  const requiredGroups = [
    settings.includeEnergyShield
      ? ['energy-shield-mk2', 'energy-shield']
      : null,
    settings.includeRoboport
      ? ['personal-roboport-mk2', 'personal-roboport']
      : null,
    settings.includeNightvision ? ['nightvision'] : null,
    settings.includeBeltImmunity ? ['belt-immunity'] : null,
  ].filter(Boolean) as string[][];

  return requiredGroups.flatMap((group) => {
    const candidate = group
      .map((itemId) => candidates.find((entry) => entry.itemId === itemId))
      .find(Boolean);

    return candidate ? [candidate] : [];
  });
};

const getFillerCandidates = (candidates: Candidate[]) => {
  const fillerOrder = [
    'personal-battery-mk3',
    'personal-battery-mk2',
    'personal-battery',
    'portable-solar-panel',
  ];

  return fillerOrder.flatMap((itemId) => {
    const candidate = candidates.find((entry) => entry.itemId === itemId);

    if (!candidate) {
      return [];
    }

    return [candidate];
  });
};

const appendCandidate = (
  templates: PlacementTemplate[],
  candidate: Candidate,
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  location: PowerLocation,
) => {
  const nextTemplates = [...templates, candidate];
  const nextPlacements = packTemplates(nextTemplates, host, hostQuality, itemMap);

  if (!nextPlacements) {
    return null;
  }

  return {
    nextTemplates,
    nextPlacements,
    nextSummary: summarizeBuild(host, hostQuality, nextPlacements, itemMap, location),
  };
};

const getSupportPlanArea = (
  itemMap: Record<string, EquipmentItem>,
  summary: BuildSummary,
  supportCandidates: Candidate[],
  location: PowerLocation,
) => {
  if (isPowerSupported(summary)) {
    return 0;
  }

  const neededDayKw = Math.max(0, POSITIVE_NET_BUFFER_KW - summary.dayNetKw);
  const neededAverageKw = Math.max(0, -summary.netAverageKw);
  const neededBufferMj = Math.max(
    0,
    summary.requiredCycleBufferMj - summary.energyCapacityMj,
  );
  let bestDayDensity = 0;
  let bestAverageDensity = 0;
  let bestBufferDensity = 0;

  for (const candidate of supportCandidates) {
    const item = itemMap[candidate.itemId];
    const stats = item.qualities[candidate.quality];
    const area = getArea(item);

    bestDayDensity = Math.max(
      bestDayDensity,
      Math.max(0, getDayDeltaKw(candidate.itemId, stats, location)) / area,
    );
    bestAverageDensity = Math.max(
      bestAverageDensity,
      Math.max(0, getAverageDeltaKw(candidate.itemId, stats, location)) / area,
    );
    bestBufferDensity = Math.max(
      bestBufferDensity,
      (stats.energyCapacityMj ?? 0) / area,
    );
  }

  if (
    (neededDayKw > 0 && bestDayDensity <= 0) ||
    (neededAverageKw > 0 && bestAverageDensity <= 0) ||
    (neededBufferMj > 0 && bestBufferDensity <= 0)
  ) {
    return null;
  }

  return (
    (neededDayKw > 0 ? neededDayKw / bestDayDensity : 0) +
    (neededAverageKw > 0 ? neededAverageKw / bestAverageDensity : 0) +
    (neededBufferMj > 0 ? neededBufferMj / bestBufferDensity : 0)
  );
};

const pickBestUtilityCandidate = (
  templates: PlacementTemplate[],
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  objective: AutoOptimizeSettings['objective'],
  currentSummary: BuildSummary,
  utilityCandidates: Candidate[],
  supportCandidates: Candidate[],
  requiredSingletonItemIds: Set<string>,
  location: PowerLocation,
) => {
  let best:
    | {
        candidate: Candidate;
        placements: Placement[];
        summary: BuildSummary;
        templates: PlacementTemplate[];
        score: number;
      }
    | null = null;

  for (const candidate of utilityCandidates) {
    if (
      hasAutoSingletonAlreadyPlaced(currentSummary, candidate.itemId) ||
      hasRequiredSingletonAlreadyPlaced(
        currentSummary,
        candidate.itemId,
        requiredSingletonItemIds,
      )
    ) {
      continue;
    }

    const item = itemMap[candidate.itemId];
    const stats = item.qualities[candidate.quality];
    const utility = getUtilityScore(currentSummary, stats, objective);

    if (utility <= 0) {
      continue;
    }

    const appended = appendCandidate(
      templates,
      candidate,
      host,
      hostQuality,
      itemMap,
      location,
    );

    if (!appended) {
      continue;
    }

    const supportArea = getSupportPlanArea(
      itemMap,
      appended.nextSummary,
      supportCandidates,
      location,
    );

    if (supportArea === null) {
      continue;
    }

    const score = utility / (getArea(item) + supportArea);

    if (!best || score > best.score) {
      best = {
        candidate,
        placements: appended.nextPlacements,
        summary: appended.nextSummary,
        templates: appended.nextTemplates,
        score,
      };
    }
  }

  return best;
};

const pickBestSupportCandidate = (
  templates: PlacementTemplate[],
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  currentSummary: BuildSummary,
  supportCandidates: Candidate[],
  location: PowerLocation,
) => {
  const currentShortfall = getPowerShortfallScore(currentSummary);
  let bestPositive:
    | {
        candidate: Candidate;
        placements: Placement[];
        summary: BuildSummary;
        templates: PlacementTemplate[];
        shortfall: number;
        area: number;
      }
    | null = null;
  let bestImprovement:
    | {
        candidate: Candidate;
        placements: Placement[];
        summary: BuildSummary;
        templates: PlacementTemplate[];
        improvement: number;
        area: number;
      }
    | null = null;

  for (const candidate of supportCandidates) {
    const item = itemMap[candidate.itemId];
    const stats = item.qualities[candidate.quality];
    const averageDeltaKw = getAverageDeltaKw(candidate.itemId, stats, location);
    const dayDeltaKw = getDayDeltaKw(candidate.itemId, stats, location);
    const batteryDeltaMj = stats.energyCapacityMj ?? 0;

    if (averageDeltaKw <= 0 && dayDeltaKw <= 0 && batteryDeltaMj <= 0) {
      continue;
    }

    const appended = appendCandidate(
      templates,
      candidate,
      host,
      hostQuality,
      itemMap,
      location,
    );

    if (!appended) {
      continue;
    }

    const area = getArea(item);
    const nextShortfall = getPowerShortfallScore(appended.nextSummary);

    if (isPowerSupported(appended.nextSummary)) {
      if (
        !bestPositive ||
        nextShortfall < bestPositive.shortfall ||
        (nextShortfall === bestPositive.shortfall && area < bestPositive.area)
      ) {
        bestPositive = {
          candidate,
          placements: appended.nextPlacements,
          summary: appended.nextSummary,
          templates: appended.nextTemplates,
          shortfall: nextShortfall,
          area,
        };
      }
      continue;
    }

    if (
      !bestImprovement ||
      currentShortfall - nextShortfall > bestImprovement.improvement ||
      (currentShortfall - nextShortfall === bestImprovement.improvement &&
        area < bestImprovement.area)
    ) {
      bestImprovement = {
        candidate,
        placements: appended.nextPlacements,
        summary: appended.nextSummary,
        templates: appended.nextTemplates,
        improvement: currentShortfall - nextShortfall,
        area,
      };
    }
  }

  return bestPositive ?? bestImprovement;
};

export const autoOptimize = (
  host: GridHost,
  hostQuality: QualityId,
  itemMap: Record<string, EquipmentItem>,
  settings: AutoOptimizeSettings,
  accessMatrix: AccessMatrix,
  location: PowerLocation,
): Placement[] => {
  const maxIterations = host.qualities[hostQuality].width * host.qualities[hostQuality].height;
  const candidates = buildCandidates(itemMap, accessMatrix);
  const requiredCandidates = resolveRequiredCandidates(settings, candidates);
  const fillerCandidates = getFillerCandidates(candidates);
  const requiredSingletonItemIds = new Set(
    requiredCandidates.map((candidate) => candidate.itemId),
  );
  const supportCandidates = candidates.filter((candidate) => {
    const item = itemMap[candidate.itemId];
    const stats = item.qualities[candidate.quality];
    return (
      getAverageDeltaKw(candidate.itemId, stats, location) > 0 ||
      getDayDeltaKw(candidate.itemId, stats, location) > 0 ||
      (stats.energyCapacityMj ?? 0) > 0
    );
  });
  const utilityCandidates = candidates.filter((candidate) => {
    const item = itemMap[candidate.itemId];
    return getUtilityScore(
      {
        usedCells: 0,
        totalCells: 0,
        inventorySlots: 0,
        dayGenerationKw: 0,
        nightGenerationKw: 0,
        generationKw: 0,
        averageGenerationKw: 0,
        drawKw: 0,
        sustainedDrawKw: 0,
        peakDayNetKw: 0,
        peakNightNetKw: 0,
        dayNetKw: 0,
        nightNetKw: 0,
        netPeakKw: 0,
        netAverageKw: 0,
        energyCapacityMj: 0,
        requiredCycleBufferMj: 0,
        cycleSustainable: true,
        peakBurstSeconds: null,
        peakSustainable: true,
        batteryRechargeMinutes: null,
        nightBatteryMinutes: null,
        fullDarkMinutes: 0,
        movementBonusPercent: 0,
        shieldHp: 0,
        shieldRechargePerSecond: 0,
        laserDps: 0,
        laserRange: 0,
        dischargeDamage: 0,
        dischargeRange: 0,
        dischargeArea: 0,
        robotLimit: 0,
        chargingStations: 0,
        constructionAreaDiameter: 0,
        counts: {},
      },
      item.qualities[candidate.quality],
      settings.objective,
    ) > 0;
  });

  let templates: PlacementTemplate[] = [];
  let placements: Placement[] = [];
  let summary = summarizeBuild(host, hostQuality, placements, itemMap, location);

  for (const candidate of requiredCandidates) {
    const next = appendCandidate(
      templates,
      candidate,
      host,
      hostQuality,
      itemMap,
      location,
    );

    if (!next) {
      continue;
    }

    templates = next.nextTemplates;
    placements = next.nextPlacements;
    summary = next.nextSummary;
  }

  for (let step = 0; step < maxIterations; step += 1) {
    const next = isPowerSupported(summary)
      ? pickBestUtilityCandidate(
          templates,
          host,
          hostQuality,
          itemMap,
          settings.objective,
          summary,
          utilityCandidates,
          supportCandidates,
          requiredSingletonItemIds,
          location,
        )
      : pickBestSupportCandidate(
          templates,
          host,
          hostQuality,
          itemMap,
          summary,
          supportCandidates,
          location,
        );

    if (!next) {
      break;
    }

    templates = next.templates;
    placements = next.placements;
    summary = next.summary;
  }

  while (!isPowerSupported(summary)) {
    const next = pickBestSupportCandidate(
      templates,
      host,
      hostQuality,
      itemMap,
      summary,
      supportCandidates,
      location,
    );

    if (!next) {
      break;
    }

    templates = next.templates;
    placements = next.placements;
    summary = next.summary;
  }

  for (const filler of fillerCandidates) {
    while (true) {
      const next = appendCandidate(
        templates,
        filler,
        host,
        hostQuality,
        itemMap,
        location,
      );

      if (!next) {
        break;
      }

      templates = next.nextTemplates;
      placements = next.nextPlacements;
      summary = next.nextSummary;
    }
  }

  return placements;
};
