/**
 * Content Data Types
 *
 * Static content definitions for locations, creatures, items, and quests.
 * These types define the game's content structure.
 */

import type { LocationId, Biome } from './gameState';

/**
 * Direction identifiers for location exits.
 */
export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/**
 * Location data definition.
 */
export interface LocationData {
  id: LocationId;
  name: string;
  biome: Biome;
  baseDescription: string;
  exits: Partial<Record<Direction, LocationId>>;
  tags?: string[];
}

/**
 * Creature statistics for combat and interactions.
 */
export interface CreatureStats {
  hp: number;
  attack: number;
  defence: number;
}

/**
 * Creature data definition.
 */
export interface CreatureData {
  id: string;
  name: string;
  description: string;
  stats: CreatureStats;
  tags: string[];
  biome: Biome;
}

/**
 * Item category types.
 */
export type ItemCategory = 'resource' | 'consumable' | 'quest';

/**
 * Item data definition.
 */
export interface ItemData {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  effectDescription?: string;
}

/**
 * Quest step definition.
 */
export interface QuestStep {
  id: string;
  summary: string;
  completionCondition?: string; // Placeholder for future condition logic
}

/**
 * Quest definition containing all quest information.
 */
export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  steps: QuestStep[];
}

