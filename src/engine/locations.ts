/**
 * Location Data
 *
 * Static location definitions for the game world.
 */

import type { LocationId, LocationData, Biome, Direction } from '../types/content';

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
    exits: { south: 'gate', east: 'lake', west: 'mine', north: 'hermit_hut', down: 'trader_post' },
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

