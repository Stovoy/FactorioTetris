import type {
  AccessMatrix,
  AutoOptimizeSettings,
  EquipmentCategory,
  QualityId,
} from '../types';

const URL_STATE_PARAM = 'state';

interface EncodedAppUrlState {
  v: 1;
  h: string;
  l: string;
  hq: QualityId;
  eq: QualityId;
  f: EquipmentCategory | 'all';
  s: string;
  o: AutoOptimizeSettings;
  a: AccessMatrix;
  pl: Array<[string, QualityId, number, number]>;
}

export interface AppUrlState {
  selectedHostId: string;
  selectedPowerLocationId: string;
  selectedHostQuality: QualityId;
  selectedEquipmentQuality: QualityId;
  filter: EquipmentCategory | 'all';
  search: string;
  optimizerSettings: AutoOptimizeSettings;
  accessMatrix: AccessMatrix;
  placements: Array<{
    itemId: string;
    quality: QualityId;
    x: number;
    y: number;
  }>;
}

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0
    ? ''
    : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const encodeAppUrlState = (state: AppUrlState) =>
  encodeBase64Url(
    JSON.stringify({
      v: 1,
      h: state.selectedHostId,
      l: state.selectedPowerLocationId,
      hq: state.selectedHostQuality,
      eq: state.selectedEquipmentQuality,
      f: state.filter,
      s: state.search,
      o: state.optimizerSettings,
      a: state.accessMatrix,
      pl: state.placements.map((placement) => [
        placement.itemId,
        placement.quality,
        placement.x,
        placement.y,
      ]),
    } satisfies EncodedAppUrlState),
  );

export const decodeAppUrlState = (encoded: string): AppUrlState | null => {
  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as Partial<EncodedAppUrlState>;

    if (parsed.v !== 1) {
      return null;
    }

    return {
      selectedHostId: parsed.h ?? '',
      selectedPowerLocationId: parsed.l ?? '',
      selectedHostQuality: parsed.hq ?? 'normal',
      selectedEquipmentQuality: parsed.eq ?? 'normal',
      filter: parsed.f ?? 'all',
      search: parsed.s ?? '',
      optimizerSettings: parsed.o ?? {
        objective: 'balanced',
        includeEnergyShield: false,
        includeRoboport: false,
        includeNightvision: false,
        includeBeltImmunity: false,
      },
      accessMatrix: parsed.a ?? {},
      placements: (parsed.pl ?? []).map((placement) => ({
        itemId: placement[0],
        quality: placement[1],
        x: placement[2],
        y: placement[3],
      })),
    };
  } catch {
    return null;
  }
};

export const readAppUrlState = (search: string) => {
  const params = new URLSearchParams(search);
  const encodedState = params.get(URL_STATE_PARAM);

  if (!encodedState) {
    return null;
  }

  return decodeAppUrlState(encodedState);
};

export const writeAppUrlState = (state: AppUrlState) => {
  const url = new URL(window.location.href);
  url.searchParams.set(URL_STATE_PARAM, encodeAppUrlState(state));
  window.history.replaceState({}, '', url);
};
