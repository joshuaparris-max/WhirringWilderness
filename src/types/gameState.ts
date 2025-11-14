/**
 * Game State Types
 *
 * Core game state interfaces for Whispering Wilds.
 * These types define the runtime state of the game.
 */

import type { LogEntry } from './log';

/**
 * Valid location identifiers in the game world.
 */
export type LocationId =
  | 'sanctum'
  | 'gate'
  | 'wilds'
  | 'lake'
  | 'mine'
  | 'hermit_hut'
  | 'trader_post'
  | 'deep_wilds';

/**
 * Biome types that locations can belong to.
 */
export type Biome = 'sanctum' | 'forest' | 'lake' | 'mine' | 'camp' | 'deep_forest';

/**
 * Player character statistics.
 */
export interface PlayerStats {
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
}

/**
 * An instance of an item in the player's inventory.
 */
export interface InventoryItemInstance {
  itemId: string;
  quantity: number;
}

/**
 * Status of a quest in the game.
 */
export type QuestStatus = 'not_started' | 'active' | 'completed';

/**
 * Current state of a quest.
 */
export interface QuestState {
  id: string;
  name: string;
  step: string;
  status: QuestStatus;
}

/**
 * Narrative flags that track story progression and world state.
 * These are boolean or string values that affect game events and dialogue.
 */
export interface NarrativeFlags {
  groveHealed?: boolean;
  lakeTreatment?: boolean;
  mineTreatment?: boolean;
  lakeEchoesFound?: boolean;
  glowCommuneComplete?: boolean;
  npcMemory?: NpcMemory;
  reputation?: ReputationState;
  /** Whether the player has dismissed the first-time tutorial overlay */
  seenTutorial?: boolean;
  /**
   * True when the current run has ended (e.g. player death).
   * Used by the UI to show a summary screen and freeze inputs.
   */
  runEnded?: boolean;
}

/**
 * Tracks simple per-NPC memory.
 */
export interface NpcMemory {
  [npcId: string]: {
    timesSpoken: number;
  };
}

/**
 * Simple reputation state scaffold.
 */
export interface ReputationState {
  forest: number;
}

/**
 * Encounter state for tracking active creature encounters.
 */
export interface EncounterState {
  creatureId: string;
  hp: number;
  hasRepFlavourApplied?: boolean;
}

/**
 * Complete game state containing all runtime information.
 */
export interface GameState {
  currentLocation: LocationId;
  player: PlayerStats & {
    inventory: InventoryItemInstance[];
  };
  quests: QuestState[];
  flags: NarrativeFlags;
  log: LogEntry[];
  currentEncounter?: EncounterState | null;
  gather: GatherState;
  tradeUsage: TradeUsageState;
}

/**
 * Tracks soft usage limits for gathering per "run".
 */
export interface GatherState {
  wildsHerbs: number;
  lakeWater: number;
  mineOre: number;
  luminousFragments?: number;
}

/**
 * Tracks number of times each trade has been used.
 */
export interface TradeUsageState {
  [tradeId: string]: number;
}

