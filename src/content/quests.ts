/**
 * Quest Content Definitions
 *
 * Static quest definitions for the game.
 */

import type { QuestDefinition } from '../types/content';

export type QuestId = 'heal_the_grove';

export const QUESTS: Record<QuestId, QuestDefinition> = {
  heal_the_grove: {
    id: 'heal_the_grove',
    name: 'Heal the Grove',
    description: 'The forest grove near the Wilds is unsettled. Gather what you need and perform a ritual to soothe it.',
    steps: [
      {
        id: 'speak_to_caretaker',
        summary: 'Speak with the Caretaker in the Sanctum.',
      },
      {
        id: 'gather_ingredients',
        summary: 'Gather forest herbs from the Wilds and pure water from the Lake.',
      },
      {
        id: 'perform_ritual',
        summary: 'Perform the healing ritual in the Wilds.',
      },
      {
        id: 'return_to_caretaker',
        summary: 'Return to the Caretaker in the Sanctum.',
      },
      {
        id: 'grove_healed',
        summary: 'The grove at the edge of the Wilds is calm again. The Sanctum watches a quieter forest.',
      },
    ],
  },
};

