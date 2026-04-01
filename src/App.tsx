import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { equipmentItems, gridHosts, powerLocations } from './data/factorioData';
import { AccessPanel } from './components/AccessPanel';
import { HostSelector } from './components/HostSelector';
import { EquipmentPalette } from './components/EquipmentPalette';
import { GridEditor } from './components/GridEditor';
import { OptimizerPanel } from './components/OptimizerPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { autoOptimize } from './lib/optimizer';
import { createPlacementId, doesPlacementFit, getItemFootprint } from './lib/grid';
import { QualityIcon } from './components/QualityIcon';
import { summarizeBuild } from './lib/stats';
import { readAppUrlState, writeAppUrlState } from './lib/urlState';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  EquipmentCategory,
  Placement,
  QualityMap,
  QualityId,
} from './types';

interface DragPreview {
  itemId: string;
  quality: QualityId;
}

const initialOptimizer: AutoOptimizeSettings = {
  objective: 'balanced',
  includeEnergyShield: false,
  includeRoboport: false,
  includeNightvision: false,
  includeBeltImmunity: false,
};

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

const defaultAppState = {
  selectedHostId: 'modular-armor',
  selectedPowerLocationId: 'nauvis',
  selectedHostQuality: 'normal' as QualityId,
  selectedEquipmentQuality: 'normal' as QualityId,
  filter: 'all' as EquipmentCategory | 'all',
  search: '',
  optimizerSettings: initialOptimizer,
  accessMatrix: createAccessMatrix(),
  placements: [] as Placement[],
};

const qualityIds = new Set<QualityId>([
  'normal',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]);
const categoryIds = new Set<EquipmentCategory | 'all'>([
  'all',
  'generation',
  'storage',
  'mobility',
  'defense',
  'combat',
  'utility',
  'logistics',
]);
const hostIds = new Set(gridHosts.map((host) => host.id));
const powerLocationIds = new Set(powerLocations.map((location) => location.id));
const itemIds = new Set(equipmentItems.map((item) => item.id));
const defaultQualityAccess = createEnabledQualities();

const sanitizeAccessMatrix = (accessMatrix: AccessMatrix) =>
  Object.fromEntries(
    equipmentItems.map((item) => {
      const current = accessMatrix[item.id];

      return [
        item.id,
        {
          normal: current?.normal ?? defaultQualityAccess.normal,
          uncommon: current?.uncommon ?? defaultQualityAccess.uncommon,
          rare: current?.rare ?? defaultQualityAccess.rare,
          epic: current?.epic ?? defaultQualityAccess.epic,
          legendary: current?.legendary ?? defaultQualityAccess.legendary,
        },
      ];
    }),
  ) as AccessMatrix;

const sanitizeOptimizerSettings = (
  settings: AutoOptimizeSettings,
): AutoOptimizeSettings => ({
  objective: (
    ['balanced', 'max-exoskeletons', 'max-lasers', 'max-shields'] as const
  ).includes(settings.objective)
    ? settings.objective
    : initialOptimizer.objective,
  includeEnergyShield: Boolean(settings.includeEnergyShield),
  includeRoboport: Boolean(settings.includeRoboport),
  includeNightvision: Boolean(settings.includeNightvision),
  includeBeltImmunity: Boolean(settings.includeBeltImmunity),
});

const createInitialAppState = () => {
  if (typeof window === 'undefined') {
    return defaultAppState;
  }

  const decoded = readAppUrlState(window.location.search);

  if (!decoded) {
    return defaultAppState;
  }

  return {
    selectedHostId: hostIds.has(decoded.selectedHostId)
      ? decoded.selectedHostId
      : defaultAppState.selectedHostId,
    selectedPowerLocationId: powerLocationIds.has(decoded.selectedPowerLocationId)
      ? decoded.selectedPowerLocationId
      : defaultAppState.selectedPowerLocationId,
    selectedHostQuality: qualityIds.has(decoded.selectedHostQuality)
      ? decoded.selectedHostQuality
      : defaultAppState.selectedHostQuality,
    selectedEquipmentQuality: qualityIds.has(decoded.selectedEquipmentQuality)
      ? decoded.selectedEquipmentQuality
      : defaultAppState.selectedEquipmentQuality,
    filter: categoryIds.has(decoded.filter)
      ? decoded.filter
      : defaultAppState.filter,
    search: typeof decoded.search === 'string' ? decoded.search : defaultAppState.search,
    optimizerSettings: sanitizeOptimizerSettings(decoded.optimizerSettings),
    accessMatrix: sanitizeAccessMatrix(decoded.accessMatrix),
    placements: decoded.placements
      .filter(
        (placement) =>
          itemIds.has(placement.itemId) &&
          qualityIds.has(placement.quality) &&
          Number.isFinite(placement.x) &&
          Number.isFinite(placement.y),
      )
      .map((placement) => ({
        id: createPlacementId(),
        itemId: placement.itemId,
        quality: placement.quality,
        x: Math.trunc(placement.x),
        y: Math.trunc(placement.y),
      })),
  };
};

function parseCellId(cellId: string | null) {
  if (!cellId?.startsWith('cell:')) {
    return null;
  }

  const [, rawX, rawY] = cellId.split(':');
  return { x: Number(rawX), y: Number(rawY) };
}

export default function App() {
  const initialState = useMemo(() => createInitialAppState(), []);
  const [selectedHostId, setSelectedHostId] = useState(initialState.selectedHostId);
  const [selectedPowerLocationId, setSelectedPowerLocationId] =
    useState(initialState.selectedPowerLocationId);
  const [selectedHostQuality, setSelectedHostQuality] =
    useState<QualityId>(initialState.selectedHostQuality);
  const [selectedEquipmentQuality, setSelectedEquipmentQuality] =
    useState<QualityId>(initialState.selectedEquipmentQuality);
  const [activePaletteItemId, setActivePaletteItemId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>(initialState.placements);
  const [filter, setFilter] = useState<EquipmentCategory | 'all'>(initialState.filter);
  const [search, setSearch] = useState(initialState.search);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [optimizerSettings, setOptimizerSettings] =
    useState<AutoOptimizeSettings>(initialState.optimizerSettings);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix>(initialState.accessMatrix);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const host = useMemo(
    () => gridHosts.find((candidate) => candidate.id === selectedHostId) ?? gridHosts[0],
    [selectedHostId],
  );
  const powerLocation = useMemo(
    () =>
      powerLocations.find((candidate) => candidate.id === selectedPowerLocationId) ??
      powerLocations[0],
    [selectedPowerLocationId],
  );
  const itemMap = useMemo(
    () =>
      Object.fromEntries(
        equipmentItems.map((item) => [item.id, item] as const),
      ),
    [],
  );
  const visibleItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return equipmentItems.filter((item) => {
      const matchesFilter = filter === 'all' || item.category === filter;
      const matchesSearch =
        normalized.length === 0 ||
        item.name.toLowerCase().includes(normalized) ||
        item.note.toLowerCase().includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search]);
  const summary = useMemo(
    () => summarizeBuild(host, selectedHostQuality, placements, itemMap, powerLocation),
    [host, itemMap, placements, powerLocation, selectedHostQuality],
  );

  useEffect(() => {
    writeAppUrlState({
      selectedHostId,
      selectedPowerLocationId,
      selectedHostQuality,
      selectedEquipmentQuality,
      filter,
      search,
      optimizerSettings,
      accessMatrix,
      placements: placements.map((placement) => ({
        itemId: placement.itemId,
        quality: placement.quality,
        x: placement.x,
        y: placement.y,
      })),
    });
  }, [
    accessMatrix,
    filter,
    optimizerSettings,
    placements,
    search,
    selectedEquipmentQuality,
    selectedHostId,
    selectedHostQuality,
    selectedPowerLocationId,
  ]);

  const placeItemAt = (
    itemId: string,
    quality: QualityId,
    x: number,
    y: number,
    existingPlacementId?: string,
  ) => {
    const nextPlacement: Placement = {
      id: existingPlacementId ?? createPlacementId(),
      itemId,
      quality,
      x,
      y,
    };

    const nextPlacements = existingPlacementId
      ? placements.map((candidate) =>
          candidate.id === existingPlacementId ? nextPlacement : candidate,
        )
      : [...placements, nextPlacement];
    const collisionSet = existingPlacementId ? nextPlacements : placements;

    if (
      doesPlacementFit(
        nextPlacement,
        host,
        selectedHostQuality,
        itemMap,
        collisionSet,
        existingPlacementId,
      )
    ) {
      setPlacements(nextPlacements);
      setSelectedPlacementId(nextPlacement.id);
      return true;
    }

    return false;
  };

  const handlePlaceAtCell = (x: number, y: number) => {
    if (!activePaletteItemId) {
      return;
    }

    placeItemAt(activePaletteItemId, selectedEquipmentQuality, x, y);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const rawId = String(event.active.id);
    if (rawId.startsWith('palette:')) {
      const [, itemId, quality] = rawId.split(':');
      setDragPreview({ itemId, quality: quality as QualityId });
    } else if (rawId.startsWith('placement:')) {
      const placement = placements.find(
        (candidate) => candidate.id === rawId.replace('placement:', ''),
      );
      setDragPreview(
        placement
          ? { itemId: placement.itemId, quality: placement.quality }
          : null,
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragPreview(null);
    if (!event.over) {
      return;
    }

    const cell = parseCellId(String(event.over.id));
    if (!cell) {
      return;
    }

    const rawId = String(event.active.id);

    if (rawId.startsWith('palette:')) {
      const [, itemId, quality] = rawId.split(':');
      placeItemAt(itemId, quality as QualityId, cell.x, cell.y);
      return;
    }

    if (rawId.startsWith('placement:')) {
      const placementId = rawId.replace('placement:', '');
      const current = placements.find((candidate) => candidate.id === placementId);
      if (current) {
        placeItemAt(current.itemId, current.quality, cell.x, cell.y, placementId);
      }
    }
  };

  const handleRemovePlacement = (placementId: string) => {
    setPlacements((current) =>
      current.filter((placement) => placement.id !== placementId),
    );
    setSelectedPlacementId((current) =>
      current === placementId ? null : current,
    );
  };

  const handleRunOptimizer = () => {
    const optimized = autoOptimize(
      host,
      selectedHostQuality,
      itemMap,
      optimizerSettings,
      accessMatrix,
      powerLocation,
    );
    setPlacements(optimized);
    setSelectedPlacementId(null);
  };

  const handleHostChange = (hostId: string) => {
    setSelectedHostId(hostId);
    setPlacements([]);
    setSelectedPlacementId(null);
    setAccessMatrix(createAccessMatrix());
  };

  const toggleAccess = (itemId: string, quality: QualityId) => {
    setAccessMatrix((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        [quality]: !current[itemId][quality],
      },
    }));
  };

  const setItemAccess = (itemId: string, enabled: boolean) => {
    setAccessMatrix((current) => ({
      ...current,
      [itemId]: {
        normal: enabled,
        uncommon: enabled,
        rare: enabled,
        epic: enabled,
        legendary: enabled,
      },
    }));
  };

  const setQualityAccess = (quality: QualityId, enabled: boolean) => {
    setAccessMatrix((current) =>
      Object.fromEntries(
        equipmentItems.map((item) => [
          item.id,
          {
            ...current[item.id],
            [quality]: enabled,
          },
        ]),
      ),
    );
  };

  const setAllAccess = (enabled: boolean) => {
    setAccessMatrix(
      Object.fromEntries(
        equipmentItems.map((item) => [
          item.id,
          {
            normal: enabled,
            uncommon: enabled,
            rare: enabled,
            epic: enabled,
            legendary: enabled,
          },
        ]),
      ),
    );
  };

  return (
    <DndContext
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <main className="app-shell">
        <div className="layout workspace">
          <div className="layout-main layout-main--editor">
            <HostSelector
              hosts={gridHosts}
              onSelectHost={handleHostChange}
              onSelectQuality={setSelectedHostQuality}
              selectedHostId={host.id}
              selectedHostQuality={selectedHostQuality}
            />
            <GridEditor
              host={host}
              hostQuality={selectedHostQuality}
              itemMap={itemMap}
              onPlaceAtCell={handlePlaceAtCell}
              onRemovePlacement={handleRemovePlacement}
              onSelectPlacement={setSelectedPlacementId}
              placements={placements}
              selectedPlacementId={selectedPlacementId}
            />
          </div>

          <aside className="layout-middle">
            <EquipmentPalette
              activeItemId={activePaletteItemId}
              filter={filter}
              items={visibleItems}
              onSearch={setSearch}
              onSelectFilter={setFilter}
              onSelectItem={setActivePaletteItemId}
              onSelectQuality={setSelectedEquipmentQuality}
              search={search}
              selectedQuality={selectedEquipmentQuality}
            />
            <SummaryPanel
              location={powerLocation}
              summary={summary}
            />
          </aside>

          <aside className="layout-side">
            <OptimizerPanel
              onChange={setOptimizerSettings}
              onSelectLocation={setSelectedPowerLocationId}
              onRun={handleRunOptimizer}
              powerLocationId={powerLocation.id}
              powerLocations={powerLocations}
              settings={optimizerSettings}
            />
            <AccessPanel
              accessMatrix={accessMatrix}
              items={equipmentItems}
              onSetAll={setAllAccess}
              onSetQualityAll={setQualityAccess}
              onSetItemAll={setItemAccess}
              onToggle={toggleAccess}
            />
          </aside>
        </div>
      </main>
      <DragOverlay>
        {dragPreview ? (
          <div
            className="drag-overlay drag-overlay--shape"
            style={{
              '--overlay-width': String(getItemFootprint(itemMap[dragPreview.itemId]).width),
              '--overlay-height': String(getItemFootprint(itemMap[dragPreview.itemId]).height),
            } as CSSProperties}
          >
            <div className="drag-overlay__cells">
              {Array.from({
                length:
                  getItemFootprint(itemMap[dragPreview.itemId]).width *
                  getItemFootprint(itemMap[dragPreview.itemId]).height,
              }).map((_, index) => (
                <span key={index} className="drag-overlay__cell" />
              ))}
            </div>
            <img alt="" className="drag-overlay__icon" src={itemMap[dragPreview.itemId].imageUrl} />
            <span className="drag-overlay__quality">
              <QualityIcon compact quality={dragPreview.quality} />
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
