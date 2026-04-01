import { describe, expect, it } from 'vitest';
import { decodeAppUrlState, encodeAppUrlState } from './urlState';

describe('urlState', () => {
  it('round-trips planner state through base64url encoding', () => {
    const encoded = encodeAppUrlState({
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
    });

    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(decodeAppUrlState(encoded)).toEqual({
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
    });
  });
});
