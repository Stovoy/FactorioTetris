import { equipmentItems, gridHosts, powerLocations } from '../data/factorioData';
import type {
  AccessMatrix,
  AutoOptimizeSettings,
  EquipmentCategory,
  ObjectiveId,
  QualityId,
} from '../types';

const URL_STATE_PARAM = 'state';
const BINARY_STATE_PREFIX = '~';

interface LegacyEncodedAppUrlState {
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

const qualityIds: QualityId[] = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];
const filterIds: Array<EquipmentCategory | 'all'> = [
  'all',
  'generation',
  'storage',
  'mobility',
  'defense',
  'combat',
  'utility',
  'logistics',
];
const objectiveIds: ObjectiveId[] = [
  'balanced',
  'max-exoskeletons',
  'max-lasers',
  'max-shields',
];
const defaultOptimizerSettings: AutoOptimizeSettings = {
  objective: 'balanced',
  includeEnergyShield: false,
  includeRoboport: false,
  includeNightvision: false,
  includeBeltImmunity: false,
};

const encodeBase64Url = (bytes: Uint8Array) => {
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
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

class BitWriter {
  private bytes: number[] = [];
  private currentByte = 0;
  private bitOffset = 0;

  writeBits(value: number, bitCount: number) {
    for (let index = bitCount - 1; index >= 0; index -= 1) {
      const bit = (value >> index) & 1;
      this.currentByte = (this.currentByte << 1) | bit;
      this.bitOffset += 1;

      if (this.bitOffset === 8) {
        this.bytes.push(this.currentByte);
        this.currentByte = 0;
        this.bitOffset = 0;
      }
    }
  }

  writeVarint(value: number) {
    let current = value >>> 0;

    do {
      let nextByte = current & 0x7f;
      current >>>= 7;

      if (current > 0) {
        nextByte |= 0x80;
      }

      this.writeBits(nextByte, 8);
    } while (current > 0);
  }

  writeBytes(bytes: Uint8Array) {
    for (const byte of bytes) {
      this.writeBits(byte, 8);
    }
  }

  finish() {
    if (this.bitOffset > 0) {
      this.bytes.push(this.currentByte << (8 - this.bitOffset));
    }

    return Uint8Array.from(this.bytes);
  }
}

class BitReader {
  private byteOffset = 0;
  private bitOffset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBits(bitCount: number) {
    let value = 0;

    for (let index = 0; index < bitCount; index += 1) {
      if (this.byteOffset >= this.bytes.length) {
        throw new Error('Unexpected end of state');
      }

      const currentByte = this.bytes[this.byteOffset];
      const bit = (currentByte >> (7 - this.bitOffset)) & 1;
      value = (value << 1) | bit;
      this.bitOffset += 1;

      if (this.bitOffset === 8) {
        this.bitOffset = 0;
        this.byteOffset += 1;
      }
    }

    return value;
  }

  readVarint() {
    let value = 0;
    let shift = 0;

    while (true) {
      const nextByte = this.readBits(8);
      value |= (nextByte & 0x7f) << shift;

      if ((nextByte & 0x80) === 0) {
        return value;
      }

      shift += 7;
      if (shift > 35) {
        throw new Error('Varint too large');
      }
    }
  }

  readBytes(length: number) {
    const output = new Uint8Array(length);

    for (let index = 0; index < length; index += 1) {
      output[index] = this.readBits(8);
    }

    return output;
  }
}

const indexOrZero = (values: readonly string[], target: string) => {
  const index = values.indexOf(target);
  return index >= 0 ? index : 0;
};

const bitsNeeded = (size: number) => (
  size <= 1 ? 1 : Math.ceil(Math.log2(size))
);

const hostIds = gridHosts.map((host) => host.id);
const powerLocationIds = powerLocations.map((location) => location.id);
const equipmentItemIds = equipmentItems.map((item) => item.id);
const qualityBitWidth = bitsNeeded(qualityIds.length);
const filterBitWidth = bitsNeeded(filterIds.length);
const objectiveBitWidth = bitsNeeded(objectiveIds.length);
const hostBitWidth = bitsNeeded(hostIds.length);
const powerLocationBitWidth = bitsNeeded(powerLocationIds.length);
const itemBitWidth = bitsNeeded(equipmentItemIds.length);

const getHostDimensions = (hostId: string, quality: QualityId) => {
  const host = gridHosts.find((candidate) => candidate.id === hostId);

  if (!host) {
    return { width: 32, height: 32 };
  }

  const stats = host.qualities[quality];
  return { width: stats.width, height: stats.height };
};

const encodeBinaryState = (state: AppUrlState) => {
  const writer = new BitWriter();
  const searchBytes = new TextEncoder().encode(state.search);
  const { width, height } = getHostDimensions(
    state.selectedHostId,
    state.selectedHostQuality,
  );
  const xBitWidth = bitsNeeded(width);
  const yBitWidth = bitsNeeded(height);

  writer.writeBits(2, 3);
  writer.writeBits(indexOrZero(hostIds, state.selectedHostId), hostBitWidth);
  writer.writeBits(indexOrZero(powerLocationIds, state.selectedPowerLocationId), powerLocationBitWidth);
  writer.writeBits(indexOrZero(qualityIds, state.selectedHostQuality), qualityBitWidth);
  writer.writeBits(indexOrZero(qualityIds, state.selectedEquipmentQuality), qualityBitWidth);
  writer.writeBits(indexOrZero(filterIds, state.filter), filterBitWidth);
  writer.writeBits(indexOrZero(objectiveIds, state.optimizerSettings.objective), objectiveBitWidth);
  writer.writeBits(state.optimizerSettings.includeEnergyShield ? 1 : 0, 1);
  writer.writeBits(state.optimizerSettings.includeRoboport ? 1 : 0, 1);
  writer.writeBits(state.optimizerSettings.includeNightvision ? 1 : 0, 1);
  writer.writeBits(state.optimizerSettings.includeBeltImmunity ? 1 : 0, 1);

  writer.writeVarint(searchBytes.length);
  writer.writeBytes(searchBytes);

  for (const itemId of equipmentItemIds) {
    const access = state.accessMatrix[itemId];

    for (const qualityId of qualityIds) {
      writer.writeBits(access?.[qualityId] !== false ? 1 : 0, 1);
    }
  }

  writer.writeVarint(state.placements.length);
  for (const placement of state.placements) {
    writer.writeBits(indexOrZero(equipmentItemIds, placement.itemId), itemBitWidth);
    writer.writeBits(indexOrZero(qualityIds, placement.quality), qualityBitWidth);
    writer.writeBits(placement.x, xBitWidth);
    writer.writeBits(placement.y, yBitWidth);
  }

  return `${BINARY_STATE_PREFIX}${encodeBase64Url(writer.finish())}`;
};

const decodeBinaryState = (encoded: string): AppUrlState | null => {
  try {
    const reader = new BitReader(decodeBase64Url(encoded.slice(BINARY_STATE_PREFIX.length)));
    const version = reader.readBits(3);

    if (version !== 2) {
      return null;
    }

    const selectedHostId = hostIds[reader.readBits(hostBitWidth)] ?? '';
    const selectedPowerLocationId =
      powerLocationIds[reader.readBits(powerLocationBitWidth)] ?? '';
    const selectedHostQuality = qualityIds[reader.readBits(qualityBitWidth)] ?? 'normal';
    const selectedEquipmentQuality =
      qualityIds[reader.readBits(qualityBitWidth)] ?? 'normal';
    const filter = filterIds[reader.readBits(filterBitWidth)] ?? 'all';
    const objective = objectiveIds[reader.readBits(objectiveBitWidth)] ?? 'balanced';
    const includeEnergyShield = reader.readBits(1) === 1;
    const includeRoboport = reader.readBits(1) === 1;
    const includeNightvision = reader.readBits(1) === 1;
    const includeBeltImmunity = reader.readBits(1) === 1;

    const searchLength = reader.readVarint();
    const search = new TextDecoder().decode(reader.readBytes(searchLength));
    const accessMatrix = Object.fromEntries(
      equipmentItemIds.map((itemId) => [
        itemId,
        {
          normal: reader.readBits(1) === 1,
          uncommon: reader.readBits(1) === 1,
          rare: reader.readBits(1) === 1,
          epic: reader.readBits(1) === 1,
          legendary: reader.readBits(1) === 1,
        },
      ]),
    ) as AccessMatrix;

    const { width, height } = getHostDimensions(selectedHostId, selectedHostQuality);
    const xBitWidth = bitsNeeded(width);
    const yBitWidth = bitsNeeded(height);
    const placementCount = reader.readVarint();
    const placements = Array.from({ length: placementCount }, () => ({
      itemId: equipmentItemIds[reader.readBits(itemBitWidth)] ?? '',
      quality: qualityIds[reader.readBits(qualityBitWidth)] ?? 'normal',
      x: reader.readBits(xBitWidth),
      y: reader.readBits(yBitWidth),
    }));

    return {
      selectedHostId,
      selectedPowerLocationId,
      selectedHostQuality,
      selectedEquipmentQuality,
      filter,
      search,
      optimizerSettings: {
        objective,
        includeEnergyShield,
        includeRoboport,
        includeNightvision,
        includeBeltImmunity,
      },
      accessMatrix,
      placements,
    };
  } catch {
    return null;
  }
};

const decodeLegacyState = (encoded: string): AppUrlState | null => {
  try {
    const json = new TextDecoder().decode(decodeBase64Url(encoded));
    const parsed = JSON.parse(json) as Partial<LegacyEncodedAppUrlState>;

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
      optimizerSettings: parsed.o ?? defaultOptimizerSettings,
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

export const encodeAppUrlState = (state: AppUrlState) => encodeBinaryState(state);

export const decodeAppUrlState = (encoded: string): AppUrlState | null => {
  if (encoded.startsWith(BINARY_STATE_PREFIX)) {
    return decodeBinaryState(encoded);
  }

  return decodeLegacyState(encoded);
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
