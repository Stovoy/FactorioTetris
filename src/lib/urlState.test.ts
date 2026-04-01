import { describe, expect, it } from 'vitest';
import type { AppUrlState } from './urlState';
import { decodeAppUrlState, encodeAppUrlState } from './urlState';

const encodeLegacyAppUrlState = (state: AppUrlState) => {
  const json = JSON.stringify({
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
  });

  let binary = '';
  for (const byte of new TextEncoder().encode(json)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
};

describe('urlState', () => {
  it('round-trips planner state through compact binary encoding', () => {
    const state: AppUrlState = {
      selectedHostId: 'mech-armor',
      selectedPowerLocationId: 'nauvis',
      selectedHostQuality: 'legendary',
      selectedEquipmentQuality: 'epic',
      filter: 'combat',
      search: 'laser',
      optimizerSettings: {
        objective: 'max-lasers',
        includeEnergyShield: true,
        includeRoboport: false,
        includeNightvision: true,
        includeBeltImmunity: false,
      },
      accessMatrix: {
        'personal-laser-defense': {
          normal: true,
          uncommon: false,
          rare: true,
          epic: true,
          legendary: true,
        },
      },
      placements: [
        {
          itemId: 'personal-laser-defense',
          quality: 'legendary',
          x: 1,
          y: 2,
        },
      ],
    };

    const encoded = encodeAppUrlState(state);

    expect(encoded.startsWith('~')).toBe(true);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decodeAppUrlState(encoded)).toEqual({
      ...state,
      accessMatrix: {
        'portable-fusion-reactor': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'portable-solar-panel': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'portable-fission-reactor': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-battery': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-battery-mk2': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-battery-mk3': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'energy-shield': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'energy-shield-mk2': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        exoskeleton: {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-laser-defense': {
          normal: true,
          uncommon: false,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-roboport': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'personal-roboport-mk2': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        nightvision: {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'belt-immunity': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        toolbelt: {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
        'discharge-defense': {
          normal: true,
          uncommon: true,
          rare: true,
          epic: true,
          legendary: true,
        },
      },
    });
  });

  it('can still decode legacy json-base64 urls', () => {
    const state: AppUrlState = {
      selectedHostId: 'mech-armor',
      selectedPowerLocationId: 'nauvis',
      selectedHostQuality: 'rare',
      selectedEquipmentQuality: 'normal',
      filter: 'all',
      search: '',
      optimizerSettings: {
        objective: 'max-exoskeletons',
        includeEnergyShield: true,
        includeRoboport: true,
        includeNightvision: true,
        includeBeltImmunity: true,
      },
      accessMatrix: {
        exoskeleton: {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
      },
      placements: [
        { itemId: 'portable-fission-reactor', quality: 'normal', x: 0, y: 0 },
        { itemId: 'exoskeleton', quality: 'normal', x: 8, y: 0 },
      ],
    };

    expect(decodeAppUrlState(encodeLegacyAppUrlState(state))).toEqual(state);
  });

  it('produces much shorter urls than the legacy json codec', () => {
    const state: AppUrlState = {
      selectedHostId: 'mech-armor',
      selectedPowerLocationId: 'nauvis',
      selectedHostQuality: 'rare',
      selectedEquipmentQuality: 'normal',
      filter: 'all',
      search: '',
      optimizerSettings: {
        objective: 'max-exoskeletons',
        includeEnergyShield: true,
        includeRoboport: true,
        includeNightvision: true,
        includeBeltImmunity: true,
      },
      accessMatrix: {
        'portable-fusion-reactor': {
          normal: false,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'portable-solar-panel': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'portable-fission-reactor': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-battery': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-battery-mk2': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-battery-mk3': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'energy-shield': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'energy-shield-mk2': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        exoskeleton: {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-laser-defense': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-roboport': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'personal-roboport-mk2': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        nightvision: {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'belt-immunity': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        toolbelt: {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
        'discharge-defense': {
          normal: true,
          uncommon: false,
          rare: false,
          epic: false,
          legendary: false,
        },
      },
      placements: [
        { itemId: 'portable-fission-reactor', quality: 'normal', x: 0, y: 0 },
        { itemId: 'portable-fission-reactor', quality: 'normal', x: 4, y: 0 },
        { itemId: 'exoskeleton', quality: 'normal', x: 8, y: 0 },
        { itemId: 'exoskeleton', quality: 'normal', x: 10, y: 0 },
        { itemId: 'exoskeleton', quality: 'normal', x: 0, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 2, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 4, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 6, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 8, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 10, y: 4 },
        { itemId: 'exoskeleton', quality: 'normal', x: 0, y: 8 },
        { itemId: 'exoskeleton', quality: 'normal', x: 2, y: 8 },
        { itemId: 'exoskeleton', quality: 'normal', x: 4, y: 8 },
        { itemId: 'exoskeleton', quality: 'normal', x: 6, y: 8 },
        { itemId: 'exoskeleton', quality: 'normal', x: 8, y: 8 },
        { itemId: 'exoskeleton', quality: 'normal', x: 10, y: 8 },
        { itemId: 'personal-battery-mk3', quality: 'normal', x: 0, y: 12 },
        { itemId: 'energy-shield-mk2', quality: 'normal', x: 3, y: 12 },
        { itemId: 'personal-roboport-mk2', quality: 'normal', x: 5, y: 12 },
        { itemId: 'nightvision', quality: 'normal', x: 7, y: 12 },
        { itemId: 'personal-battery', quality: 'normal', x: 9, y: 12 },
        { itemId: 'personal-battery', quality: 'normal', x: 10, y: 12 },
        { itemId: 'belt-immunity', quality: 'normal', x: 11, y: 12 },
        { itemId: 'portable-solar-panel', quality: 'normal', x: 11, y: 13 },
      ],
    };

    const compact = encodeAppUrlState(state);
    const legacy = encodeLegacyAppUrlState(state);

    expect(compact.length).toBeLessThan(legacy.length / 10);
    expect(compact.length).toBeLessThan(120);
    expect(decodeAppUrlState(compact)).toEqual(state);
  });
});
