/**
 * Item Data
 *
 * Static item definitions for the game.
 */

import type { ItemData } from '../types/content';

export const items: Record<string, ItemData> = {
  forest_herb: {
    id: 'forest_herb',
    name: 'Forest Herb',
    description: 'A bitter green herb that smells of rain and smoke.',
    category: 'resource',
  },
  lake_water: {
    id: 'lake_water',
    name: 'Vial of Lake Water',
    description: 'A small vial filled with shimmering lake water.',
    category: 'resource',
  },
  raw_ore: {
    id: 'raw_ore',
    name: 'Raw Ore',
    description: 'Heavy ore chipped from the mine wall.',
    category: 'resource',
  },
  healing_tonic: {
    id: 'healing_tonic',
    name: 'Healing Tonic',
    description: 'A sharp, bitter draught that knits shallow wounds.',
    category: 'consumable',
    effectDescription: 'Restore a small amount of HP when used (effect to be implemented later).',
  },
  luminous_fragment: {
    id: 'luminous_fragment',
    name: 'Luminous Fragment',
    description: 'A tiny shard of pale light. It hums faintly and fades if left exposed.',
    category: 'resource',
  },
};

