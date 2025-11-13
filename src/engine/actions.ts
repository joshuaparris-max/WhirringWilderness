/**
 * Game Actions
 *
 * Functions that perform game actions and return updated state with log entries.
 */

import type { GameState, LocationId, LogEntry, InventoryItemInstance } from '../types/gameState';
import { getLocation } from './locations';
import type { NpcId } from '../content/npcs';
import { npcs } from '../content/npcs';

/**
 * Result of performing a game action.
 */
export interface ActionResult {
  state: GameState;
  logEntries: LogEntry[];
}

/**
 * Generates a unique ID for log entries.
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Adds an item to the player's inventory.
 * If the item already exists, increases its quantity.
 */
function addItemToInventory(
  state: GameState,
  itemId: string,
  quantity: number,
): GameState {
  const existing = state.player.inventory.find((i) => i.itemId === itemId);
  let newInventory: InventoryItemInstance[];

  if (existing) {
    newInventory = state.player.inventory.map((i) =>
      i.itemId === itemId ? { ...i, quantity: i.quantity + quantity } : i,
    );
  } else {
    newInventory = [...state.player.inventory, { itemId, quantity }];
  }

  return {
    ...state,
    player: {
      ...state.player,
      inventory: newInventory,
    },
  };
}

/**
 * Moves the player to a new location.
 * Validates that the destination is reachable from the current location.
 */
export function moveTo(state: GameState, destination: LocationId): ActionResult {
  const currentLocation = getLocation(state.currentLocation);
  const destinationLocation = getLocation(destination);

  // Check if destination is reachable from current location
  const exits = Object.values(currentLocation.exits);
  if (!exits.includes(destination)) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'narration',
      text: `You cannot go to ${destinationLocation.name} from here.`,
      timestamp: Date.now(),
    };

    return {
      state,
      logEntries: [logEntry],
    };
  }

  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: `You move to ${destinationLocation.name}. ${destinationLocation.baseDescription}`,
    timestamp: Date.now(),
  };

  const newState: GameState = {
    ...state,
    currentLocation: destination,
  };

  return {
    state: newState,
    logEntries: [logEntry],
  };
}

/**
 * Performs a sense action, revealing sensory information about the current location.
 */
export function sense(state: GameState): ActionResult {
  const location = getLocation(state.currentLocation);

  let senseText: string;
  switch (state.currentLocation) {
    case 'sanctum':
      senseText = 'The candles breathe quietly; beyond the walls, the forest waits.';
      break;
    case 'gate':
      senseText = 'Wind worries the old wood. The Wilds feel close.';
      break;
    case 'wilds':
      senseText = "For a moment everything is still, as if listening back.";
      break;
    default:
      senseText = `You take in your surroundings at ${location.name}.`;
  }

  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: senseText,
    timestamp: Date.now(),
  };

  return {
    state,
    logEntries: [logEntry],
  };
}

/**
 * Performs a gather action, collecting resources from the current location.
 */
export function gather(state: GameState): ActionResult {
  let itemId: string | null = null;
  let text: string;

  switch (state.currentLocation) {
    case 'wilds':
      itemId = 'forest_herb';
      text =
        'You move slowly, hands careful on bark and moss, and gather a handful of forest herbs.';
      break;
    case 'lake':
      itemId = 'lake_water';
      text =
        'Kneeling at the shore, you fill a small vial with lake water, trying not to disturb the surface.';
      break;
    case 'mine':
      itemId = 'raw_ore';
      text =
        'You chip away at the rock, freeing a few lumps of raw ore.';
      break;
    default:
      text = 'You search around, but there is nothing here you can safely gather.';
  }

  let newState = state;
  if (itemId) {
    newState = addItemToInventory(state, itemId, 1);
  }

  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text,
    timestamp: Date.now(),
  };

  return {
    state: newState,
    logEntries: [logEntry],
  };
}

/**
 * Performs a talk action, initiating dialogue with an NPC.
 */
export function talkTo(state: GameState, npcId: NpcId): ActionResult {
  const npc = npcs[npcId];

  if (!npc) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'There is no one like that here.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  if (npc.location !== state.currentLocation) {
    const here = getLocation(state.currentLocation);
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: `You look around ${here.name}, but ${npc.name} is not here.`,
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  const logEntries: LogEntry[] = npc.introLines.map((line) => ({
    id: generateLogId(),
    type: 'narration',
    text: `${npc.name}: ${line}`,
    timestamp: Date.now(),
  }));

  return { state, logEntries };
}

