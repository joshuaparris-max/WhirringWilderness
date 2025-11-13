/**
 * Log Entry Types
 *
 * Types for game log entries that track player actions, narration, and events.
 */

import type { LocationId } from './gameState';

/**
 * Types of log entries in the game log.
 */
export type LogEntryType = 'narration' | 'choice' | 'system' | 'combat' | 'quest';

/**
 * Metadata that can be attached to log entries for context.
 */
export interface LogEntryMetadata {
  locationId?: LocationId;
  questId?: string;
  creatureId?: string;
  itemId?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * A single entry in the game log.
 */
export interface LogEntry {
  id: string;
  type: LogEntryType;
  text: string;
  metadata?: LogEntryMetadata;
  timestamp: number;
}

