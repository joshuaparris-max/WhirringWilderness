/**
 * Location Data
 *
 * Static location definitions for the game world.
 */

import type { LocationId, LocationData, Direction } from '../types/content';
import type { GameState } from '../types/gameState';

export const locations: Record<LocationId, LocationData> = {
  sanctum: {
    id: 'sanctum',
    name: 'Sanctum',
    biome: 'sanctum',
    baseDescription: 'A small stone-and-timber sanctum on the edge of the Wilds.',
    exits: { north: 'gate' },
  },
  gate: {
    id: 'gate',
    name: 'The Gate',
    biome: 'forest',
    baseDescription: 'An old wooden gate marking the threshold between Sanctum and the Wilds.',
    exits: { south: 'sanctum', north: 'wilds' },
  },
  wilds: {
    id: 'wilds',
    name: 'The Wilds',
    biome: 'forest',
    baseDescription: 'The forest presses close here, quiet and watchful.',
    exits: { south: 'gate', east: 'lake', west: 'mine', north: 'hermit_hut', down: 'trader_post', up: 'deep_wilds' },
  },
  lake: {
    id: 'lake',
    name: 'The Lake',
    biome: 'lake',
    baseDescription: 'A placid lake reflecting the sky.',
    exits: { west: 'wilds' },
  },
  mine: {
    id: 'mine',
    name: 'The Mine',
    biome: 'mine',
    baseDescription: 'An abandoned mine entrance.',
    exits: { east: 'wilds' },
  },
  hermit_hut: {
    id: 'hermit_hut',
    name: "Hermit's Hut",
    biome: 'camp',
    baseDescription: 'A small hut nestled in the trees.',
    exits: { south: 'wilds' },
  },
  trader_post: {
    id: 'trader_post',
    name: "Trader's Post",
    biome: 'camp',
    baseDescription: 'A trading post with various goods.',
    exits: { up: 'wilds' },
  },
  deep_wilds: {
    id: 'deep_wilds',
    name: 'Deeper Wilds',
    biome: 'deep_forest',
    baseDescription:
      'The forest closes in here, lit by faint, pulsing motes of light between the roots.',
    exits: { down: 'wilds' },
  },
};

/**
 * Gets location data by ID.
 * Throws an error if the location doesn't exist.
 */
export function getLocation(id: LocationId): LocationData {
  const location = locations[id];
  if (!location) {
    throw new Error(`Unknown location: ${id}`);
  }
  return location;
}

/**
 * Gets all available exits from a location.
 */
export function getAvailableExits(id: LocationId): Array<{ direction: Direction; to: LocationId }> {
  const location = getLocation(id);
  return Object.entries(location.exits).map(([direction, to]) => ({
    direction: direction as Direction,
    to,
  }));
}

/**
 * Returns available exits taking game state into account.
 * Currently used to gate access to certain areas (e.g. 'deep_wilds') behind quests.
 */
export function getAvailableExitsForState(state: GameState): Array<{ direction: Direction; to: LocationId }> {
  const location = getLocation(state.currentLocation);
  const raw = Object.entries(location.exits).map(([direction, to]) => ({
    direction: direction as Direction,
    to,
  }));

  // Gate deep_wilds behind the Hermit's Glow quest being active
  return raw.filter((exit) => {
    if (exit.to === 'deep_wilds') {
      const hermits = state.quests.find((q) => q.id === 'hermits_glow');
      if (!hermits || hermits.status !== 'active') return false;
    }
    return true;
  });
}

/**
 * Gets the location description, which may change based on game state flags.
 */
export function getLocationDescription(state: GameState): string {
  const location = getLocation(state.currentLocation);

  // Default to baseDescription
  let description = location.baseDescription;

  // If the grove is healed and we are in or near the Wilds, tweak the description
  if (state.flags.groveHealed) {
    if (state.currentLocation === 'wilds') {
      description =
        'The forest here feels looser and kinder now, as if something heavy has been lifted.';
    } else if (state.currentLocation === 'gate') {
      description =
        'Even from here, the air beyond the gate feels calmer than before.';
    }
  }

  return description;
}

