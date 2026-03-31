import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { equipmentItems, gridHosts } from './data/factorioData';
import { AccessPanel } from './components/AccessPanel';
import { HostSelector } from './components/HostSelector';
import { EquipmentPalette } from './components/EquipmentPalette';
import { GridEditor } from './components/GridEditor';
import { OptimizerPanel } from './components/OptimizerPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { autoOptimize } from './lib/optimizer';
import { createPlacementId, doesPlacementFit } from './lib/grid';
import { summarizeBuild } from './lib/stats';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  EquipmentCategory,
  Placement,
  QualityMap,
  QualityId,
} from './types';

const initialOptimizer: AutoOptimizeSettings = {
  objective: 'balanced',
  maxExoskeletons: 8,
  maxLaserDefenses: 16,
  minReactors: 1,
  reserveBatteries: 0,
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

function parseCellId(cellId: string | null) {
  if (!cellId?.startsWith('cell:')) {
    return null;
  }

  const [, rawX, rawY] = cellId.split(':');
  return { x: Number(rawX), y: Number(rawY) };
}

export default function App() {
  const [selectedHostId, setSelectedHostId] = useState('power-armor-mk2');
  const [selectedHostQuality, setSelectedHostQuality] =
    useState<QualityId>('normal');
  const [selectedEquipmentQuality, setSelectedEquipmentQuality] =
    useState<QualityId>('normal');
  const [activePaletteItemId, setActivePaletteItemId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [filter, setFilter] = useState<EquipmentCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dragPreviewLabel, setDragPreviewLabel] = useState<string | null>(null);
  const [optimizerSettings, setOptimizerSettings] =
    useState<AutoOptimizeSettings>(initialOptimizer);
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix>(createAccessMatrix);

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
    () => summarizeBuild(host, selectedHostQuality, placements, itemMap),
    [host, itemMap, placements, selectedHostQuality],
  );

  const placeItemAt = (
    itemId: string,
    quality: QualityId,
    x: number,
    y: number,
    existingPlacementId?: string,
  ) => {
    const placement = existingPlacementId
      ? placements.find((candidate) => candidate.id === existingPlacementId)
      : null;
    const nextPlacement: Placement = {
      id: existingPlacementId ?? createPlacementId(),
      itemId,
      quality,
      x,
      y,
      rotated: placement?.rotated ?? false,
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
      const [, itemId] = rawId.split(':');
      setDragPreviewLabel(itemMap[itemId]?.name ?? null);
    } else if (rawId.startsWith('placement:')) {
      const placement = placements.find(
        (candidate) => candidate.id === rawId.replace('placement:', ''),
      );
      setDragPreviewLabel(placement ? itemMap[placement.itemId].name : null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragPreviewLabel(null);
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

  const handleRotatePlacement = () => {
    if (!selectedPlacementId) {
      return;
    }

    const current = placements.find((placement) => placement.id === selectedPlacementId);
    if (!current) {
      return;
    }

    const rotated = { ...current, rotated: !current.rotated };
    const nextPlacements = placements.map((placement) =>
      placement.id === current.id ? rotated : placement,
    );

    if (
      doesPlacementFit(
        rotated,
        host,
        selectedHostQuality,
        itemMap,
        nextPlacements,
        current.id,
      )
    ) {
      setPlacements(nextPlacements);
    }
  };

  const handleRemovePlacement = () => {
    if (!selectedPlacementId) {
      return;
    }

    setPlacements((current) =>
      current.filter((placement) => placement.id !== selectedPlacementId),
    );
    setSelectedPlacementId(null);
  };

  const handleRunOptimizer = () => {
    const optimized = autoOptimize(
      host,
      selectedHostQuality,
      itemMap,
      optimizerSettings,
      accessMatrix,
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
        <header className="hero">
          <div className="hero__copy">
            <span className="eyebrow">Factorio equipment planner</span>
            <h1>FactorioTetris</h1>
            <p>
              Drag, rotate, compare, and auto-fill equipment layouts for modular
              armor, tank, and spidertron grids. Current host coverage matches the
              official Factorio wiki pages that expose vanilla equipment grids.
            </p>
          </div>
          <div className="hero__aside">
            <div>
              <span>Wiki-backed data</span>
              <strong>{equipmentItems.length} equipment modules</strong>
            </div>
            <div>
              <span>Grid hosts</span>
              <strong>{gridHosts.length} vanilla hosts</strong>
            </div>
            <div>
              <span>Quality tiers</span>
              <strong>Normal to legendary</strong>
            </div>
          </div>
        </header>

        <div className="layout">
          <div className="layout-main">
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
              onSelectPlacement={setSelectedPlacementId}
              placements={placements}
              selectedPlacementId={selectedPlacementId}
            />
          </div>

          <aside className="layout-side">
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
            <OptimizerPanel
              onChange={setOptimizerSettings}
              onRun={handleRunOptimizer}
              settings={optimizerSettings}
            />
            <AccessPanel
              accessMatrix={accessMatrix}
              items={equipmentItems}
              onSetAll={setAllAccess}
              onSetItemAll={setItemAccess}
              onToggle={toggleAccess}
            />
            <SummaryPanel
              host={host}
              itemMap={itemMap}
              onRemove={handleRemovePlacement}
              onRotate={handleRotatePlacement}
              placements={placements}
              selectedPlacementId={selectedPlacementId}
              summary={summary}
            />
          </aside>
        </div>
      </main>
      <DragOverlay>
        {dragPreviewLabel ? <div className="drag-overlay">{dragPreviewLabel}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
