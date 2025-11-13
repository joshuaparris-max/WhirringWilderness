/**
 * Game Actions
 *
 * Functions that perform game actions and return updated state with log entries.
 */

import type { GameState, LocationId, InventoryItemInstance } from '../types/gameState';
import type { LogEntry } from '../types/log';
import { getLocation, getLocationDescription } from './locations';
import type { NpcId } from '../content/npcs';
import { npcs } from '../content/npcs';
import { getRandomCreatureForLocation, createEncounterState, createEncounterLog, isInEncounter, getEncounterChance } from './encounters';
import { creatures } from '../content/creatures';
import { applyXp } from './progression';
import { activateQuestIfNeeded, setQuestStep, setQuestStatus, getQuestState } from './quests';
import { canAffordTrade, applyTrade, getTradeById, canUseTrade } from './trading';
import type { TradeId } from '../content/shop';
import {
  senseAt,
  gatherAt,
  hitCreature,
  creatureHitsPlayer,
  escapeSuccess,
  escapeFail,
} from './text';

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
 * Helper to potentially trigger an encounter after movement or gathering.
 */
function maybeTriggerEncounter(state: GameState, logEntries: LogEntry[]): { state: GameState; logEntries: LogEntry[] } {
  if (isInEncounter(state)) {
    return { state, logEntries };
  }
  const creature = getRandomCreatureForLocation(state.currentLocation);
  if (!creature) {
    return { state, logEntries };
  }

  const chance = getEncounterChance(state);
  if (Math.random() >= chance) {
    return { state, logEntries };
  }

  const newState = createEncounterState(state, creature);
  const encounterLog = createEncounterLog(state, creature);
  return {
    state: newState,
    logEntries: [...logEntries, encounterLog],
  };
}

/**
 * Counts the total quantity of an item in the player's inventory.
 */
export function countItem(state: GameState, itemId: string): number {
  return state.player.inventory.reduce(
    (sum, item) => (item.itemId === itemId ? sum + item.quantity : sum),
    0,
  );
}

/**
 * Removes a quantity of an item from the player's inventory.
 */
export function removeItems(state: GameState, itemId: string, quantity: number): GameState {
  let remaining = quantity;
  const newInventory = state.player.inventory
    .map((item) => {
      if (item.itemId !== itemId || remaining <= 0) return item;

      const toRemove = Math.min(item.quantity, remaining);
      remaining -= toRemove;
      const newQty = item.quantity - toRemove;

      return newQty > 0 ? { ...item, quantity: newQty } : null;
    })
    .filter((item): item is typeof state.player.inventory[number] => item !== null);

  return {
    ...state,
    player: {
      ...state.player,
      inventory: newInventory,
    },
  };
}

/**
 * Adds an item to the player's inventory.
 * If the item already exists, increases its quantity.
 */
export function addItemToInventory(
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

  let newState: GameState = {
    ...state,
    currentLocation: destination,
  };

  // Reset gather limits when returning to Sanctum (start of a new "run")
  if (destination === 'sanctum') {
    newState = {
      ...newState,
      gather: {
        wildsHerbs: 0,
        lakeWater: 0,
        mineOre: 0,
      },
    };
  }

  const description = getLocationDescription(newState);
  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: `You move to ${destinationLocation.name}. ${description}`,
    timestamp: Date.now(),
  };

  return maybeTriggerEncounter(newState, [logEntry]);
}

/**
 * Performs a sense action, revealing sensory information about the current location.
 */
export function sense(state: GameState): ActionResult {
  const senseText = senseAt(state.currentLocation, state.flags.groveHealed);

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
  const MAX_HERBS = 5;
  const MAX_WATER = 3;
  const MAX_ORE = 4;

  let itemId: string | null = null;
  let overrideText: string | null = null;

  switch (state.currentLocation) {
    case 'wilds':
      if (state.gather.wildsHerbs >= MAX_HERBS) {
        overrideText = 'You search carefully, but taking more now would feel wrong.';
      } else {
        itemId = 'forest_herb';
      }
      break;
    case 'lake':
      if (state.gather.lakeWater >= MAX_WATER) {
        overrideText = 'The water lies still. Best not to take more right now.';
      } else {
        itemId = 'lake_water';
      }
      break;
    case 'mine':
      if (state.gather.mineOre >= MAX_ORE) {
        overrideText = 'The seams look thin here. You should leave the rest for now.';
      } else {
        itemId = 'raw_ore';
      }
      break;
    default:
      itemId = null;
  }

  let newState = state;
  if (itemId) {
    newState = addItemToInventory(state, itemId, 1);
    // Increment gather counters
    if (itemId === 'forest_herb') {
      newState = {
        ...newState,
        gather: {
          ...newState.gather,
          wildsHerbs: newState.gather.wildsHerbs + 1,
        },
      };
    } else if (itemId === 'lake_water') {
      newState = {
        ...newState,
        gather: {
          ...newState.gather,
          lakeWater: newState.gather.lakeWater + 1,
        },
      };
    } else if (itemId === 'raw_ore') {
      newState = {
        ...newState,
        gather: {
          ...newState.gather,
          mineOre: newState.gather.mineOre + 1,
        },
      };
    }
  }

  const gatherText = overrideText ?? gatherAt(state.currentLocation);
  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: gatherText,
    timestamp: Date.now(),
  };

  return maybeTriggerEncounter(newState, [logEntry]);
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

  const logEntries: LogEntry[] = [];
  let newState = state;

  // Branching dialogue for Caretaker
  if (npcId === 'caretaker') {
    const healQuest = getQuestState(state, 'heal_the_grove');
    const groveHealed = !!state.flags.groveHealed;

    // Branch 1: Quest not started
    if (!healQuest || healQuest.status === 'not_started') {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: Welcome back, traveler. The Sanctum has been quiet.`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: The Wilds feel uneasy. The grove near the forest edge is… wrong somehow.`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: If you feel called, you could help heal it. Start by gathering herbs from the Wilds and water from the Lake.`,
          timestamp: Date.now(),
        },
      );
      newState = activateQuestIfNeeded(newState, 'heal_the_grove');
      newState = setQuestStep(newState, 'heal_the_grove', 'gather_ingredients');
      return { state: newState, logEntries };
    }

    // Branch 2: Quest active, gathering ingredients, grove not healed yet
    if (healQuest.status === 'active' && healQuest.step === 'gather_ingredients' && !groveHealed) {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: You've sensed it too, haven't you? The grove is still unsettled.`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: Gather herbs from the Wilds and water from the Lake, then perform the ritual out there. Only then will it ease.`,
          timestamp: Date.now(),
        },
      );
      return { state: newState, logEntries };
    }

    // Branch 3: Quest active, returning to caretaker, grove healed - complete quest
    if (healQuest.status === 'active' && healQuest.step === 'return_to_caretaker' && groveHealed) {
      logEntries.push({
        id: generateLogId(),
        type: 'narration',
        text: `${npc.name}: You did something out there, didn't you? The Wilds feel different. Thank you.`,
        timestamp: Date.now(),
      });
      newState = setQuestStep(newState, 'heal_the_grove', 'grove_healed');
      newState = setQuestStatus(newState, 'heal_the_grove', 'completed');
      return { state: newState, logEntries };
    }

    // Branch 4: Quest completed
    if (healQuest.status === 'completed') {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: Welcome back, traveler. The Sanctum breathes easier now.`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: The grove is calm again. Whatever you did, it mattered.`,
          timestamp: Date.now(),
        },
      );
      return { state: newState, logEntries };
    }
  }

  // Default: Add regular intro lines for other NPCs
  const introLogEntries: LogEntry[] = npc.introLines.map((line) => ({
    id: generateLogId(),
    type: 'narration' as const,
    text: `${npc.name}: ${line}`,
    timestamp: Date.now(),
  }));
  logEntries.push(...introLogEntries);

  return { state: newState, logEntries };
}

/**
 * Performs an attack action during an encounter.
 */
export function attack(state: GameState): ActionResult {
  if (!state.currentEncounter) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'There is nothing here to strike.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  const encounter = state.currentEncounter;
  const creature = creatures[encounter.creatureId];
  if (!creature) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'The threat wavers and slips away.',
      timestamp: Date.now(),
    };
    return { state: { ...state, currentEncounter: null }, logEntries: [logEntry] };
  }

  // Very simple damage model for now
  const playerDamage = Math.max(1, 4 - creature.stats.defence);
  const creatureDamage = Math.max(0, creature.stats.attack - 1);

  const newCreatureHp = encounter.hp - playerDamage;
  let newState: GameState = { ...state };
  const logEntries: LogEntry[] = [];

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: hitCreature(creature.name, playerDamage),
    timestamp: Date.now(),
  });

  if (newCreatureHp <= 0) {
    // Creature defeated
    newState = {
      ...newState,
      currentEncounter: null,
    };
    logEntries.push({
      id: generateLogId(),
      type: 'combat',
      text: `${creature.name} unravels and is gone.`,
      timestamp: Date.now(),
    });
    
    // Award XP
    const xpReward = 10;
    const xpResult = applyXp(newState, xpReward);
    newState = xpResult.state;
    if (xpResult.levelledUp) {
      logEntries.push({
        id: generateLogId(),
        type: 'system',
        text: 'You feel the Wilds settle differently around you. You have grown stronger.',
        timestamp: Date.now(),
      });
    } else {
      logEntries.push({
        id: generateLogId(),
        type: 'system',
        text: `You gain ${xpReward} XP.`,
        timestamp: Date.now(),
      });
    }
    
    return { state: newState, logEntries };
  }

  // Creature survives and strikes back
  const newHp = Math.max(0, newState.player.hp - creatureDamage);
  newState = {
    ...newState,
    player: {
      ...newState.player,
      hp: newHp,
    },
    currentEncounter: {
      ...encounter,
      hp: newCreatureHp,
    },
  };

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: creatureHitsPlayer(creature.name, creatureDamage),
    timestamp: Date.now(),
  });

  if (newHp <= 0) {
    // Player "death" – send back to Sanctum with 1 HP
    newState = {
      ...newState,
      currentLocation: 'sanctum',
      player: {
        ...newState.player,
        hp: 1,
      },
      currentEncounter: null,
    };
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'Darkness closes in. When you wake, you are back in the Sanctum.',
      timestamp: Date.now(),
    });
  }

  return { state: newState, logEntries };
}

/**
 * Attempts to flee from the current encounter.
 */
export function attemptEscape(state: GameState): ActionResult {
  if (!state.currentEncounter) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'There is nothing to escape from.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  const encounter = state.currentEncounter;
  const creature = creatures[encounter.creatureId];
  const logEntries: LogEntry[] = [];

  if (!creature) {
    return {
      state: { ...state, currentEncounter: null },
      logEntries: [
        {
          id: generateLogId(),
          type: 'system',
          text: 'The presence fades as suddenly as it came.',
          timestamp: Date.now(),
        },
      ],
    };
  }

  // 70% chance to escape cleanly
  if (Math.random() < 0.7) {
    const newState: GameState = { ...state, currentEncounter: null };
    logEntries.push({
      id: generateLogId(),
      type: 'combat',
      text: escapeSuccess(creature.name),
      timestamp: Date.now(),
    });
    return { state: newState, logEntries };
  }

  // Failed escape: creature gets a free hit
  const creatureDamage = Math.max(0, creature.stats.attack - 1);
  const newHp = Math.max(0, state.player.hp - creatureDamage);
  let newState: GameState = {
    ...state,
    player: {
      ...state.player,
      hp: newHp,
    },
  };

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: escapeFail(creature.name, creatureDamage),
    timestamp: Date.now(),
  });

  if (newHp <= 0) {
    newState = {
      ...newState,
      currentLocation: 'sanctum',
      player: {
        ...newState.player,
        hp: 1,
      },
      currentEncounter: null,
    };
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'You collapse. When you wake, the Sanctum candles burn low.',
      timestamp: Date.now(),
    });
  }

  return { state: newState, logEntries };
}

/**
 * Performs the Grove Ritual in the Wilds, consuming items and healing the grove.
 */
export function performGroveRitual(state: GameState): ActionResult {
  const logEntries: LogEntry[] = [];

  // Must be in the Wilds
  if (state.currentLocation !== 'wilds') {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'The ritual belongs to the grove in the Wilds, not here.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Check ingredients
  const herbs = countItem(state, 'forest_herb');
  const water = countItem(state, 'lake_water');

  if (herbs < 3 || water < 1) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'You do not yet have what the grove asks of you (3x Forest Herb, 1x Lake Water).',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Consume items
  let newState = state;
  newState = removeItems(newState, 'forest_herb', 3);
  newState = removeItems(newState, 'lake_water', 1);

  // Update quest state: "Heal the Grove"
  newState = activateQuestIfNeeded(newState, 'heal_the_grove');
  newState = setQuestStep(newState, 'heal_the_grove', 'return_to_caretaker');

  // Set groveHealed flag (keep quest status as 'active')
  newState = {
    ...newState,
    flags: {
      ...newState.flags,
      groveHealed: true,
    },
  };

  // Add narrative log entries
  logEntries.push(
    {
      id: generateLogId(),
      type: 'narration',
      text: 'You arrange herbs and water, breathing with the grove as you begin the ritual.',
      timestamp: Date.now(),
    },
    {
      id: generateLogId(),
      type: 'narration',
      text: 'For a long moment, nothing. Then the tension in the Wilds loosens, like a held breath released.',
      timestamp: Date.now(),
    },
    {
      id: generateLogId(),
      type: 'quest',
      text: 'Quest updated: the grove is calmer now.',
      timestamp: Date.now(),
    },
  );

  return { state: newState, logEntries };
}

/**
 * Performs a trade at the Trader's Post.
 */
export function performTrade(state: GameState, tradeId: TradeId): ActionResult {
  const logEntries: LogEntry[] = [];

  // Must be at Trader's Post
  if (state.currentLocation !== 'trader_post') {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: "You need to be at the Trader's Post to make that deal.",
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  const trade = getTradeById(tradeId);
  if (!trade) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: "The Ranger doesn't seem to understand that trade.",
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  if (!canAffordTrade(state, trade)) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: "You don't have what you need for that trade.",
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Respect trade usage limits
  // Note: Import canUseTrade from trading
  // (we import from './trading' at top; extend it)
  // If over limit, block trade
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (!canUseTrade(state, trade.id)) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'The Ranger shakes their head — that deal is no longer available.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  const result = applyTrade(state, trade, generateLogId);
  return {
    state: result.state,
    logEntries: result.logEntries,
  };
}

/**
 * Uses a healing tonic to restore HP.
 */
export function consumeHealingTonic(state: GameState): ActionResult {
  const logEntries: LogEntry[] = [];

  // Check if player has a healing tonic
  const tonicCount = countItem(state, 'healing_tonic');
  if (tonicCount < 1) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'You do not have a healing tonic.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Remove 1 tonic from inventory
  let newState = removeItems(state, 'healing_tonic', 1);

  // Heal player by 8 HP, but not above maxHp
  const healAmount = 8;
  const newHp = Math.min(newState.player.maxHp, newState.player.hp + healAmount);
  const actualHeal = newHp - newState.player.hp;

  newState = {
    ...newState,
    player: {
      ...newState.player,
      hp: newHp,
    },
  };

  // Add log entries
  logEntries.push({
    id: generateLogId(),
    type: 'narration',
    text: 'You uncork the vial and drink the sharp, bitter tonic.',
    timestamp: Date.now(),
  });

  if (actualHeal > 0) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: `You feel warmth spread through your body. You restore ${actualHeal} HP.`,
      timestamp: Date.now(),
    });
  } else {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'The tonic has no effect—you are already at full health.',
      timestamp: Date.now(),
    });
  }

  return { state: newState, logEntries };
}

