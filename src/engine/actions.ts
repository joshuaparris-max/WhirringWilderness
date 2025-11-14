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
import { getRandomCreatureForLocation, createEncounterState, createEncounterLog, isInEncounter, getEncounterChance, getForestRepTier, createForestRepEncounterFlavor } from './encounters';
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
  getRepFlavourForCreatureHit,
} from './text';
import { audioManager } from '../audio/audioManager';

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
  // Don't trigger encounters if run has ended or already in encounter
  if (isInEncounter(state) || state.flags.runEnded) {
    return { state, logEntries };
  }
  const creature = getRandomCreatureForLocation(state.currentLocation);
  if (!creature) {
    return { state, logEntries };
  }

  // Apply reputation-based encounter chance modifiers
  const tier = getForestRepTier(state);
  let chance = getEncounterChance(state);

  if (tier === 'hostile') {
    chance = Math.min(0.6, chance + 0.15);
  } else if (tier === 'uneasy') {
    chance = Math.min(0.5, chance + 0.05);
  }

  if (Math.random() >= chance) {
    return { state, logEntries };
  }

  // Check if forest spares the player (high reputation)
  const forest = state.flags.reputation?.forest ?? 0;
  if ((tier === 'favour' || tier === 'revered') && Math.random() < Math.min(0.25, forest / 100)) {
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'Something in the Wilds shifts. Whatever was stalking you lets you pass this time.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Create encounter with reputation flavour
  const newState = createEncounterState(state, creature);
  const flavor = createForestRepEncounterFlavor(state, creature.name);
  const encounterLog = createEncounterLog(state, creature);

  const logsToAdd = flavor ? [flavor, encounterLog] : [encounterLog];

  return {
    state: newState,
    logEntries: [...logEntries, ...logsToAdd],
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
  // Don't allow movement if run has ended
  if (state.flags.runEnded) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended. You cannot move.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

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

  // Note: Gather limits are NOT reset when returning to Sanctum.
  // They only reset when explicitly starting a new run via handleNewRun.

  const description = getLocationDescription(newState);
  const moveLog: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: `You move to ${destinationLocation.name}. ${description}`,
    timestamp: Date.now(),
  };

  const logEntries: LogEntry[] = [moveLog];

  // If entering the Deeper Wilds, progress the Hermit's Glow quest if appropriate
  if (destination === 'deep_wilds') {
    const hermitsQuest = getQuestState(newState, 'hermits_glow');
    if (hermitsQuest && hermitsQuest.status === 'active' && hermitsQuest.step === 'unlocked') {
      // Player has unlocked the Hermit's Glow and now finds the deeper lights
      newState = setQuestStep(newState, 'hermits_glow', 'found_glow');

      logEntries.push({
        id: generateLogId(),
        type: 'quest',
        text: "Quest updated: Hermit's Glow (you have found the glow).",
        timestamp: Date.now(),
      });

      // Small forest regard bump for investigation
      const currentRep = newState.flags.reputation ?? { forest: 0 };
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          reputation: {
            ...currentRep,
            forest: currentRep.forest + 2,
          },
        },
      };

      logEntries.push({
        id: generateLogId(),
        type: 'system',
        text: 'Forest regard increases slightly. (+2)',
        timestamp: Date.now(),
      });
    }
  }

  const result = maybeTriggerEncounter(newState, logEntries);
  audioManager.playSFX('move');
  audioManager.playAmbient(destinationLocation.biome);
  return result;
}

/**
 * Performs a sense action, revealing sensory information about the current location.
 */
export function sense(state: GameState): ActionResult {
  // Don't allow sense if run has ended
  if (state.flags.runEnded) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

  const logEntries: LogEntry[] = [
    {
      id: generateLogId(),
      type: 'narration',
      text: senseAt(state.currentLocation, state.flags.groveHealed, state.flags.glowCommuneComplete),
      timestamp: Date.now(),
    },
  ];

  let newState = state;

  const echoesQuest = getQuestState(newState, 'echoes_at_the_lake');
  const shouldRevealEcho =
    echoesQuest &&
    echoesQuest.status === 'active' &&
    echoesQuest.step === 'investigate_lake' &&
    state.currentLocation === 'lake' &&
    !state.flags.lakeEchoesFound;

  if (shouldRevealEcho) {
    newState = setQuestStep(newState, 'echoes_at_the_lake', 'return_to_hermit');
    newState = {
      ...newState,
      flags: {
        ...newState.flags,
        lakeEchoesFound: true,
      },
    };

    logEntries.push({
      id: generateLogId(),
      type: 'quest',
      text: 'The water mirrors someplace you have never stood. The Hermit should hear of this.',
      timestamp: Date.now(),
    });
  }

  audioManager.playSFX('sense');

  return {
    state: newState,
    logEntries,
  };
}

/**
 * Performs a gather action, collecting resources from the current location.
 */
export function gather(state: GameState): ActionResult {
  // Don't allow gather if run has ended
  if (state.flags.runEnded) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

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
    case 'deep_wilds': {
      // Special gatherable: luminous fragments — rare and limited per run
      const MAX_LUMINOUS = 2;
      // Note: gather.luminousFragments may be undefined in older save states, default to 0
      if ((state.gather.luminousFragments ?? 0) >= MAX_LUMINOUS) {
        overrideText = 'The pale light here slips away. There are no more fragments to take.';
      } else {
        itemId = 'luminous_fragment';
      }
      break;
    }
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
    } else if (itemId === 'luminous_fragment') {
      newState = {
        ...newState,
        gather: {
          ...newState.gather,
          luminousFragments: (newState.gather.luminousFragments ?? 0) + 1,
        },
      };
    }
  }

  // Check if player has enough ingredients for ritual and update quest step
  const healQuest = getQuestState(newState, 'heal_the_grove');
  if (healQuest && healQuest.status === 'active' && healQuest.step === 'gather_ingredients') {
    const herbs = countItem(newState, 'forest_herb');
    const water = countItem(newState, 'lake_water');
    if (herbs >= 3 && water >= 1) {
      newState = setQuestStep(newState, 'heal_the_grove', 'perform_ritual');
    }
  }

  // Add gather progress to log
  let gatherText = overrideText ?? gatherAt(state.currentLocation);
  if (!overrideText && itemId) {
    const MAX_HERBS = 5;
    const MAX_WATER = 3;
    const MAX_ORE = 4;
    let progress = '';
    if (itemId === 'forest_herb') {
      progress = ` (${newState.gather.wildsHerbs}/${MAX_HERBS} gathered)`;
    } else if (itemId === 'lake_water') {
      progress = ` (${newState.gather.lakeWater}/${MAX_WATER} gathered)`;
    } else if (itemId === 'raw_ore') {
      progress = ` (${newState.gather.mineOre}/${MAX_ORE} gathered)`;
    } else if (itemId === 'luminous_fragment') {
      const MAX_LUM = 2;
      progress = ` (${newState.gather.luminousFragments ?? 0}/${MAX_LUM} gathered)`;
    }
    gatherText = gatherText + progress;
  }

  const logEntry: LogEntry = {
    id: generateLogId(),
    type: 'narration',
    text: gatherText,
    timestamp: Date.now(),
  };

  const result = maybeTriggerEncounter(newState, [logEntry]);
  audioManager.playSFX('gather');
  return result;
}

/**
 * Performs a talk action, initiating dialogue with an NPC.
 */
export function talkTo(state: GameState, npcId: NpcId): ActionResult {
  // Don't allow talking if run has ended
  if (state.flags.runEnded) {
    const logEntry: LogEntry = {
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    };
    return { state, logEntries: [logEntry] };
  }

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

  // NPC memory
  const npcMemory = state.flags.npcMemory ?? {};
  const memoryForNpc = npcMemory[npc.id] ?? { timesSpoken: 0 };
  const firstTime = memoryForNpc.timesSpoken === 0;

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
      const updatedNpcMemory = {
        ...npcMemory,
        [npc.id]: {
          timesSpoken: memoryForNpc.timesSpoken + 1,
        },
      };
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          npcMemory: updatedNpcMemory,
        },
      };
      return { state: newState, logEntries };
    }

    // Branch 2: Quest active, gathering ingredients, grove not healed yet
    if (healQuest.status === 'active' && healQuest.step === 'gather_ingredients' && !groveHealed) {
      if (firstTime) {
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
      } else {
        logEntries.push({
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name} gives you a small nod, already familiar with your presence.`,
          timestamp: Date.now(),
        });
      }
      // write back memory and return
      const updatedNpcMemory = {
        ...npcMemory,
        [npc.id]: {
          timesSpoken: memoryForNpc.timesSpoken + 1,
        },
      };
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          npcMemory: updatedNpcMemory,
        },
      };
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
      const updatedNpcMemory = {
        ...npcMemory,
        [npc.id]: {
          timesSpoken: memoryForNpc.timesSpoken + 1,
        },
      };
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          npcMemory: updatedNpcMemory,
        },
      };
      return { state: newState, logEntries };
    }

    // Branch 4: Quest completed
    if (healQuest.status === 'completed') {
      if (firstTime) {
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
      } else {
        logEntries.push({
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name} gives you a small nod, already familiar with your presence.`,
          timestamp: Date.now(),
        });
      }
      const updatedNpcMemory = {
        ...npcMemory,
        [npc.id]: {
          timesSpoken: memoryForNpc.timesSpoken + 1,
        },
      };
      newState = {
        ...newState,
        flags: {
          ...newState.flags,
          npcMemory: updatedNpcMemory,
        },
      };
      return { state: newState, logEntries };
    }
  }

  if (npc.id === 'hermit') {
    const echoesQuest = getQuestState(newState, 'echoes_at_the_lake');
    const hermitsGlowQuest = getQuestState(newState, 'hermits_glow');
    const questMemoryUpdate = () => ({
      ...npcMemory,
      [npc.id]: {
        timesSpoken: memoryForNpc.timesSpoken + 1,
      },
    });

    if (echoesQuest && echoesQuest.status === 'active' && echoesQuest.step === 'return_to_hermit') {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "You felt it too, didn't you? The lake humming with somewhere else."`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "Those echoes do not belong to the Wilds. Thank you for telling me."`,
          timestamp: Date.now(),
        },
      );

      let updatedState = setQuestStep(newState, 'echoes_at_the_lake', 'completed');
      updatedState = setQuestStatus(updatedState, 'echoes_at_the_lake', 'completed');

      const currentRep = updatedState.flags.reputation ?? { forest: 0 };
      updatedState = {
        ...updatedState,
        flags: {
          ...updatedState.flags,
          reputation: {
            ...currentRep,
            forest: currentRep.forest + 3,
          },
          npcMemory: questMemoryUpdate(),
        },
      };

      logEntries.push(
        {
          id: generateLogId(),
          type: 'quest',
          text: 'Quest completed: Echoes at the Lake.',
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'system',
          text: 'Forest regard increases. (+3 favour)',
          timestamp: Date.now(),
        },
      );

      return { state: updatedState, logEntries };
    }

    if (echoesQuest && echoesQuest.status === 'completed') {
      if (!hermitsGlowQuest || hermitsGlowQuest.status === 'not_started') {
        logEntries.push(
          {
            id: generateLogId(),
            type: 'narration',
            text: `${npc.name}: "Since the echoes, I've seen a pale glow deeper in the Wilds."`,
            timestamp: Date.now(),
          },
          {
            id: generateLogId(),
            type: 'narration',
            text: `${npc.name}: "If you still have the patience for mysteries, you might seek it out soon."`,
            timestamp: Date.now(),
          },
        );

        let updatedState = activateQuestIfNeeded(newState, 'hermits_glow');
        updatedState = setQuestStatus(updatedState, 'hermits_glow', 'active');
        updatedState = setQuestStep(updatedState, 'hermits_glow', 'unlocked');
        updatedState = {
          ...updatedState,
          flags: {
            ...updatedState.flags,
            npcMemory: questMemoryUpdate(),
          },
        };

        logEntries.push({
          id: generateLogId(),
          type: 'quest',
          text: "Quest started: Hermit's Glow.",
          timestamp: Date.now(),
        });

        return { state: updatedState, logEntries };
      }

      if (hermitsGlowQuest.status === 'active') {
        logEntries.push({
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "Those lights are still out there. When you’re ready, follow them."`,
          timestamp: Date.now(),
        });

        const updatedNpcMemory = questMemoryUpdate();
        newState = {
          ...newState,
          flags: {
            ...newState.flags,
            npcMemory: updatedNpcMemory,
          },
        };

        return { state: newState, logEntries };
      }
    }

    // Allow the Hermit to accept a luminous fragment if the player has one
    const hermitFragmentQuest = getQuestState(newState, 'hermit_fragment');
    const hasFragment = countItem(newState, 'luminous_fragment') > 0;
    if (hasFragment && (!hermitFragmentQuest || hermitFragmentQuest.status === 'not_started')) {
      // Offer the quest: deliver the fragment
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "You found that pale shard? Give it to me — I would see what it contains.",`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'quest',
          text: 'Quest started: Hermit\'s Gift (deliver a luminous fragment).',
          timestamp: Date.now(),
        },
      );

      let updatedState = activateQuestIfNeeded(newState, 'hermit_fragment');
      updatedState = setQuestStatus(updatedState, 'hermit_fragment', 'active');
      updatedState = setQuestStep(updatedState, 'hermit_fragment', 'unlocked');

      const updatedNpcMemory = questMemoryUpdate();
      updatedState = {
        ...updatedState,
        flags: {
          ...updatedState.flags,
          npcMemory: updatedNpcMemory,
        },
      };

      return { state: updatedState, logEntries };
    }

    // If Hermit's Glow is completed, Hermit offers a small acknowledgement
    if (hermitsGlowQuest && hermitsGlowQuest.status === 'completed') {
      logEntries.push({
        id: generateLogId(),
        type: 'narration',
        text: `${npc.name} studies you quietly. "The Glow has taken your measure. We'll see what that means for the rest of us."`,
        timestamp: Date.now(),
      });
    }

    // If quest is active and player gives fragment, consume it and complete the quest
    if (hermitFragmentQuest && hermitFragmentQuest.status === 'active' && hasFragment) {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "Ah. Let me see that..."`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: 'The Hermit studies the fragment and tucks it away with a small, grateful nod.',
          timestamp: Date.now(),
        },
      );

      let updatedState = removeItems(newState, 'luminous_fragment', 1);
      updatedState = setQuestStep(updatedState, 'hermit_fragment', 'delivered');
      updatedState = setQuestStatus(updatedState, 'hermit_fragment', 'completed');

      // Reward: small XP and reputation bump
      const xpResult = applyXp(updatedState, 5);
      updatedState = xpResult.state;
      const currentRep = updatedState.flags.reputation ?? { forest: 0 };
      updatedState = {
        ...updatedState,
        flags: {
          ...updatedState.flags,
          reputation: {
            ...currentRep,
            forest: currentRep.forest + 2,
          },
        },
      };

      logEntries.push({
        id: generateLogId(),
        type: 'system',
        text: 'The Hermit thanks you. You gain 5 XP and forest regard increases. (+2)',
        timestamp: Date.now(),
      });

      const updatedNpcMemory = questMemoryUpdate();
      updatedState = {
        ...updatedState,
        flags: {
          ...updatedState.flags,
          npcMemory: updatedNpcMemory,
        },
      };

      return { state: updatedState, logEntries };
    }
  }

  // Default / other NPCs, with a special case for the Ranger
  if (npc.id === 'ranger_trader') {
    if (firstTime) {
      const introLogEntries: LogEntry[] = npc.introLines.map((line) => ({
        id: generateLogId(),
        type: 'narration' as const,
        text: `${npc.name}: ${line}`,
        timestamp: Date.now(),
      }));
      logEntries.push(...introLogEntries);
    } else {
      logEntries.push(
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name} glances up, already familiar with your needs here.`,
          timestamp: Date.now(),
        },
        {
          id: generateLogId(),
          type: 'narration',
          text: `${npc.name}: "Supplies are as before. Take what you need — within reason."`,
          timestamp: Date.now(),
        },
      );
    }
  } else {
    if (firstTime) {
      const introLogEntries: LogEntry[] = npc.introLines.map((line) => ({
        id: generateLogId(),
        type: 'narration' as const,
        text: `${npc.name}: ${line}`,
        timestamp: Date.now(),
      }));
      logEntries.push(...introLogEntries);
    } else {
      logEntries.push({
        id: generateLogId(),
        type: 'narration',
        text: `${npc.name} gives you a small nod, already familiar with your presence.`,
        timestamp: Date.now(),
      });
    }
  }

  const updatedNpcMemory = {
    ...npcMemory,
    [npc.id]: {
      timesSpoken: memoryForNpc.timesSpoken + 1,
    },
  };
  newState = {
    ...newState,
    flags: {
      ...newState.flags,
      npcMemory: updatedNpcMemory,
    },
  };

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

  const logEntries: LogEntry[] = [];
  let newState: GameState = { ...state };

  const playerDamage = Math.max(1, 4 - creature.stats.defence);
  const creatureDamage = Math.max(0, creature.stats.attack - 1);
  const creatureHpAfter = Math.max(0, encounter.hp - playerDamage);

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: hitCreature(creature.name, playerDamage),
    timestamp: Date.now(),
  });
  audioManager.playSFX('attack');

  if (creatureHpAfter <= 0) {
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

    // Special drop: will-o'-wisp leaves a faint luminous fragment
    try {
      if (encounter.creatureId === 'will_o_wisp') {
        newState = addItemToInventory(newState, 'luminous_fragment', 1);
        logEntries.push({
          id: generateLogId(),
          type: 'narration',
          text: 'From the fading light you gather a pale shard — a luminous fragment.',
          timestamp: Date.now(),
        });
  audioManager.playSFX('gather');
      }
    } catch (e) {
      // defensive: do not break combat resolution on unexpected errors
    }

    return { state: newState, logEntries };
  }

  const playerHpAfter = Math.max(0, newState.player.hp - creatureDamage);

  // Add reputation flavour on first hit if not already applied
  let hitText = creatureHitsPlayer(creature.name, creatureDamage);
  let hasRepFlavourApplied = encounter.hasRepFlavourApplied ?? false;
  if (!hasRepFlavourApplied && creatureDamage > 0) {
    const tier = getForestRepTier(state);
    const repFlavour = getRepFlavourForCreatureHit(tier);
    if (repFlavour) {
      hitText = `${hitText} ${repFlavour}`;
      hasRepFlavourApplied = true;
    }
  }

  newState = {
    ...newState,
    player: {
      ...newState.player,
      hp: playerHpAfter,
    },
    currentEncounter: {
      ...encounter,
      hp: creatureHpAfter,
      hasRepFlavourApplied,
    },
  };

  logEntries.push({
    id: generateLogId(),
    type: 'combat',
    text: hitText,
    timestamp: Date.now(),
  });
  if (creatureDamage > 0) {
    audioManager.playSFX('hurt');
  }

  if (playerHpAfter <= 0) {
    newState = {
      ...newState,
      player: {
        ...newState.player,
        hp: 0,
      },
      currentEncounter: null,
      flags: {
        ...newState.flags,
        runEnded: newState.flags.runEnded ? newState.flags.runEnded : true,
      },
    };

    if (!state.flags.runEnded) {
      logEntries.push({
        id: generateLogId(),
        type: 'narration',
        text: 'Your vision blurs and the Whispering Wilds close in. This run has ended.',
        timestamp: Date.now(),
      });
    }
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
    audioManager.playSFX('move');
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
  if (creatureDamage > 0) {
    audioManager.playSFX('hurt');
  }

  if (newHp <= 0) {
    // Player death: clamp to 0 HP, mark run ended, end encounter, add death line
    const nextHp = 0;
    newState = {
      ...newState,
      player: {
        ...newState.player,
        hp: nextHp,
      },
      currentEncounter: null,
      flags: {
        ...newState.flags,
        runEnded: newState.flags.runEnded ? newState.flags.runEnded : true,
      },
    };
    if (!state.flags.runEnded) {
      logEntries.push({
        id: generateLogId(),
        type: 'narration',
        text: 'Your vision blurs and the Whispering Wilds close in. This run has ended.',
        timestamp: Date.now(),
      });
    }
  }

  return { state: newState, logEntries };
}

/**
 * Performs the Grove Ritual in the Wilds, consuming items and healing the grove.
 */
export function performGroveRitual(state: GameState): ActionResult {
  const logEntries: LogEntry[] = [];

  // Don't allow ritual if run has ended
  if (state.flags.runEnded) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

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

  const healQuest = getQuestState(state, 'heal_the_grove');
  const groveHealedAlready = !!state.flags.groveHealed;
  const questCompleted = healQuest ? healQuest.status === 'completed' : false;

  if (groveHealedAlready || questCompleted) {
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'The grove already stands in still, luminous peace. There is nothing more to mend here.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  const ritualStepActive =
    healQuest &&
    healQuest.status === 'active' &&
    (healQuest.step === 'gather_ingredients' || healQuest.step === 'perform_ritual');

  if (!ritualStepActive) {
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'You feel the grove watching, waiting. The ritual is not yet ready to be performed.',
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
  newState = setQuestStep(newState, 'heal_the_grove', 'grove_healed');
  newState = setQuestStatus(newState, 'heal_the_grove', 'completed');

  const currentRep = newState.flags.reputation ?? { forest: 0 };
  newState = {
    ...newState,
    flags: {
      ...newState.flags,
      groveHealed: true,
      lakeEchoesFound: false,
      reputation: {
        ...currentRep,
        forest: currentRep.forest + 10,
      },
    },
  };

  newState = activateQuestIfNeeded(newState, 'echoes_at_the_lake');
  newState = setQuestStatus(newState, 'echoes_at_the_lake', 'active');
  newState = setQuestStep(newState, 'echoes_at_the_lake', 'investigate_lake');

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

  logEntries.push({
    id: generateLogId(),
    type: 'system',
    text: 'You sense the Wilds regard you differently now.',
    timestamp: Date.now(),
  });
  logEntries.push({
    id: generateLogId(),
    type: 'quest',
    text: 'Far off, the Lake seems to shiver with new echoes.',
    timestamp: Date.now(),
  });

  audioManager.playRitualSwell();
  audioManager.playAmbient(getLocation('wilds').biome);

  return { state: newState, logEntries };
}

/**
 * Performs the Deeper Wilds communion set-piece for Hermit's Glow.
 */
export function communeWithGlow(state: GameState): ActionResult {
  const logEntries: LogEntry[] = [];

  // Don't allow if run has ended
  if (state.flags.runEnded) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  // Must be in the Deeper Wilds
  if (state.currentLocation !== 'deep_wilds') {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'The Glow is not here.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  const glowQuest = getQuestState(state, 'hermits_glow');
  if (!glowQuest || glowQuest.status !== 'active') {
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'The strange light flickers at the edge of your vision, but it does not yet answer you.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  if (glowQuest.step !== 'found_glow' && glowQuest.step !== 'commune_with_glow') {
    logEntries.push({
      id: generateLogId(),
      type: 'narration',
      text: 'The glow pulses faintly, waiting for something you have not yet done.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

  let newState = state;

  // First time: play the full set-piece and advance step
  if (glowQuest.step === 'found_glow') {
    newState = setQuestStep(newState, 'hermits_glow', 'commune_with_glow');
    logEntries.push(
      {
        id: generateLogId(),
        type: 'narration',
        text: 'You step into the circle of pale motes. They rise, slow and deliberate, like breath drawn in.',
        timestamp: Date.now(),
      },
      {
        id: generateLogId(),
        type: 'narration',
        text: 'For a moment you feel the Wilds looking through you, weighing every choice you have made here.',
        timestamp: Date.now(),
      },
    );
  }

  // Complete the communion: reward reputation and mark quest complete
  const currentRep = newState.flags.reputation ?? { forest: 0 };
  const newForestRep = currentRep.forest + 8;
  newState = {
    ...newState,
    flags: {
      ...newState.flags,
      reputation: { ...currentRep, forest: newForestRep },
      glowCommuneComplete: true,
    },
  };

  newState = setQuestStatus(newState, 'hermits_glow', 'completed');
  newState = setQuestStep(newState, 'hermits_glow', 'completed');

  logEntries.push(
    {
      id: generateLogId(),
      type: 'narration',
      text: 'The light sinks into the roots and into you. The forest no longer watches from a distance — it knows you now.',
      timestamp: Date.now(),
    },
    {
      id: generateLogId(),
      type: 'narration',
      text: 'You sense a new steadiness in the Wilds, and a quiet thread binding you back to the Hermit.',
      timestamp: Date.now(),
    },
  );

  audioManager.playRitualSwell();
  audioManager.playAmbient(getLocation('deep_wilds').biome);

  return { state: newState, logEntries };
}

/**
 * Performs a trade at the Trader's Post.
 */
export function performTrade(state: GameState, tradeId: TradeId): ActionResult {
  const logEntries: LogEntry[] = [];

  // Don't allow trading if run has ended
  if (state.flags.runEnded) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

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
  audioManager.playSFX('trade');
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

  // Don't allow using items if run has ended
  if (state.flags.runEnded) {
    logEntries.push({
      id: generateLogId(),
      type: 'system',
      text: 'Your journey in this run has ended.',
      timestamp: Date.now(),
    });
    return { state, logEntries };
  }

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

  audioManager.playSFX('heal');

  return { state: newState, logEntries };
}

