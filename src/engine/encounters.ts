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
 * Forest reputation tiers that affect encounter behavior and flavour.
 */
export type ForestRepTier = 'hostile' | 'uneasy' | 'neutral' | 'favour' | 'revered';

/**
 * Gets the forest reputation tier from game state.
 */
export function getForestRepTier(state: GameState): ForestRepTier {
  const forest = state.flags.reputation?.forest ?? 0;

  if (forest >= 25) return 'revered';
  if (forest >= 10) return 'favour';
  if (forest <= -20) return 'hostile';
  if (forest <= -5) return 'uneasy';
  return 'neutral';
}

/**
 * Gets all creatures that can appear in a given location based on biome.
 */
export function getCreaturesForLocation(locationId: LocationId): CreatureData[] {
  const location = getLocation(locationId);
  const biome = location.biome;

  return Object.values(creatures).filter((c) => c.biome === biome);
}

/**
 * Location- and flag-aware encounter chance.
 */
export function getEncounterChance(state: GameState): number {
  const { currentLocation, flags } = state;
  const groveHealed = !!flags.groveHealed;

  switch (currentLocation) {
    case 'wilds':
      return groveHealed ? 0.15 : 0.3;
    case 'deep_wilds':
      // Deeper Wilds are slightly more dangerous — higher encounter chance
      // If the player has communed with the glow, slightly reduce danger
      if (flags.glowCommuneComplete) {
        return Math.max(0.2, 0.35 - 0.05);
      }
      return 0.35;
    case 'lake':
    case 'mine':
      return 0.25;
    case 'gate':
      return 0.1;
    default:
      return 0.0;
  }
}

/**
 * Gets a random creature that can appear in a given location.
 * Returns null if no creatures are available for that biome.
 */
export function getRandomCreatureForLocation(locationId: LocationId): CreatureData | null {
  const list = getCreaturesForLocation(locationId);

  if (list.length === 0) return null;

  const index = Math.floor(Math.random() * list.length);
  return list[index] ?? null;
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
 * Generates a unique ID for log entries.
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates reputation-aware flavour text for encounter start.
 * Returns null if no flavour text should be shown (neutral reputation).
 */
export function createForestRepEncounterFlavor(
  state: GameState,
  creatureName: string,
): LogEntry | null {
  const tier = getForestRepTier(state);

  const text =
    tier === 'revered'
      ? `${creatureName} pauses, recognising the quiet care you've shown the Wilds.`
      : tier === 'favour'
      ? `The Wilds seem to hold their breath around ${creatureName}, as if reluctant to strike you.`
      : tier === 'uneasy'
      ? `The forest feels tense. ${creatureName} watches you with narrowed eyes.`
      : tier === 'hostile'
      ? `The air bristles. ${creatureName} lunges as if the forest itself wants you gone.`
      : null;

  if (!text) return null;

  return {
    id: generateLogId(),
    type: 'narration',
    text,
    timestamp: Date.now(),
  };
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
    id: generateLogId(),
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

