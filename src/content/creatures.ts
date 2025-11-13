/**
 * Creature Data
 *
 * Static creature definitions for the game.
 */

import type { CreatureData, Biome } from '../types/content';

export const creatures: Record<string, CreatureData> = {
  wild_spirit: {
    id: 'wild_spirit',
    name: 'Wild Spirit',
    description: 'A faint, antlered outline in the trees, eyes like distant lanterns.',
    stats: { hp: 8, attack: 3, defence: 1 },
    tags: ['spirit'],
    biome: 'forest',
  },
  lake_wisp: {
    id: 'lake_wisp',
    name: 'Lake Wisp',
    description: 'A shimmer on the surface of the water that refuses to reflect you properly.',
    stats: { hp: 6, attack: 2, defence: 1 },
    tags: ['spirit'],
    biome: 'lake',
  },
  mine_shade: {
    id: 'mine_shade',
    name: 'Mine Shade',
    description: 'A hunched shadow that never quite lines up with the light.',
    stats: { hp: 10, attack: 4, defence: 2 },
    tags: ['spirit'],
    biome: 'mine',
  },
  stray_beast: {
    id: 'stray_beast',
    name: 'Stray Beast',
    description: 'A lean, wary creature that has learned to live between paths.',
    stats: { hp: 7, attack: 3, defence: 1 },
    tags: ['beast'],
    biome: 'forest',
  },
};

