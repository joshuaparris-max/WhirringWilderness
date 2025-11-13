/**
 * Quest System
 *
 * Helper functions for managing quest state.
 */

import type { GameState, QuestState, QuestStatus } from '../types/gameState';
import type { QuestId } from '../content/quests';
import { QUESTS } from '../content/quests';

/**
 * Gets the current state of a quest by ID.
 */
export function getQuestState(state: GameState, id: QuestId): QuestState | undefined {
  return state.quests.find((q) => q.id === id);
}

/**
 * Updates or inserts a quest state.
 * If a quest with the same id exists, it is replaced; otherwise, it is added.
 */
export function upsertQuestState(state: GameState, quest: QuestState): GameState {
  const existingIndex = state.quests.findIndex((q) => q.id === quest.id);
  let newQuests: QuestState[];

  if (existingIndex >= 0) {
    newQuests = state.quests.map((q, index) => (index === existingIndex ? quest : q));
  } else {
    newQuests = [...state.quests, quest];
  }

  return {
    ...state,
    quests: newQuests,
  };
}

/**
 * Sets the status of a quest.
 */
export function setQuestStatus(state: GameState, id: QuestId, status: QuestStatus): GameState {
  const quest = getQuestState(state, id);
  if (!quest) {
    return state;
  }

  const updatedQuest: QuestState = {
    ...quest,
    status,
  };

  return upsertQuestState(state, updatedQuest);
}

/**
 * Sets the current step of a quest.
 */
export function setQuestStep(state: GameState, id: QuestId, step: string): GameState {
  const quest = getQuestState(state, id);
  if (!quest) {
    return state;
  }

  const updatedQuest: QuestState = {
    ...quest,
    step,
  };

  return upsertQuestState(state, updatedQuest);
}

/**
 * Activates a quest if it is not yet started.
 * Sets status to 'active' and step to the first step ID from the quest definition.
 */
export function activateQuestIfNeeded(state: GameState, id: QuestId): GameState {
  const quest = getQuestState(state, id);
  if (!quest) {
    return state;
  }

  // If quest is already active or completed, return unchanged
  if (quest.status === 'active' || quest.status === 'completed') {
    return state;
  }

  // If quest is not_started, activate it
  if (quest.status === 'not_started') {
    const questDef = QUESTS[id];
    const firstStepId = questDef.steps[0]?.id;
    if (!firstStepId) {
      return state;
    }

    const updatedQuest: QuestState = {
      ...quest,
      status: 'active',
      step: firstStepId,
    };

    return upsertQuestState(state, updatedQuest);
  }

  return state;
}

