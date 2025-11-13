/**
 * Encounter Management
 *
 * Helper functions for managing creature encounters.
 */

import type { GameState, EncounterState, LocationId } from '../types/gameState';
import type { CreatureData } from '../types/content';
import { creatures } from '../content/creatures';
import { getLocation } from './locations';
import type { LogEntry } from '../types/log';

/**
 * Gets all creatures that can appear in a given location based on biome.
 */
export function getCreaturesForLocation(locationId: LocationId): CreatureData[] {
  const location = getLocation(locationId);
  const biome = location.biome;

  return Object.values(creatures).filter((c) => c.biome === biome);
}

/**
 * Gets a random creature that can appear in a given location.
 * Returns null if no creatures are available for that biome.
 */
export function getRandomCreatureForLocation(locationId: LocationId): CreatureData | null {
  const list = getCreaturesForLocation(locationId);

  if (list.length === 0) return null;

  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

/**
 * Creates a new encounter state with the given creature.
 */
export function createEncounterState(
  state: GameState,
  creature: CreatureData,
): GameState {
  const encounter: EncounterState = {
    creatureId: creature.id,
    hp: creature.stats.hp,
  };

  return { ...state, currentEncounter: encounter };
}

/**
 * Creates a log entry for when an encounter begins.
 */
export function createEncounterLog(
  state: GameState,
  creature: CreatureData,
): LogEntry {
  const here = getLocation(state.currentLocation);

  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'combat',
    text: `Something stirs in ${here.name}. ${creature.name} emerges.`,
    timestamp: Date.now(),
  };
}

/**
 * Checks if the player is currently in an encounter.
 */
export function isInEncounter(state: GameState): boolean {
  return Boolean(state.currentEncounter);
}

