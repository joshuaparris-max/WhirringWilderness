/**
 * Game State Management
 *
 * Functions for creating and manipulating game state.
 */

import type { GameState } from '../types/gameState';
import type { LogEntry } from '../types/log';

/**
 * Creates the initial game state.
 */
export function createInitialState(): GameState {
  return {
    currentLocation: 'sanctum',
    player: {
      hp: 20,
      maxHp: 20,
      xp: 0,
      level: 1,
      inventory: [],
    },
    quests: [
      {
        id: 'heal_the_grove',
        name: 'Heal the Grove',
        step: 'speak_to_caretaker',
        status: 'not_started',
      },
      {
        id: 'echoes_at_the_lake',
        name: 'Echoes at the Lake',
        step: 'unlocked',
        status: 'not_started',
      },
      {
        id: 'hermits_glow',
        name: "Hermit's Glow",
        step: 'unlocked',
        status: 'not_started',
      },
    ],
    flags: {
      groveHealed: false,
      lakeEchoesFound: false,
      npcMemory: {},
      reputation: { forest: 0 },
      runEnded: false,
    },
    log: [],
    gather: {
      wildsHerbs: 0,
      lakeWater: 0,
      mineOre: 0,
    },
    tradeUsage: {},
  };
}

/**
 * Appends a log entry to the game state, returning a new state.
 * Does not mutate the original state.
 */
export function appendLog(state: GameState, entry: LogEntry): GameState {
  return {
    ...state,
    log: [...state.log, entry],
  };
}

