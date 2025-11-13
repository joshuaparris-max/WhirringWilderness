/**
 * Quest Content Definitions
 *
 * Static quest definitions for the game.
 */

import type { QuestDefinition } from '../types/content';

export type QuestId = 'heal_the_grove' | 'echoes_at_the_lake' | 'hermits_glow';

export const QUESTS: Record<QuestId, QuestDefinition> = {
  heal_the_grove: {
    id: 'heal_the_grove',
    name: 'Heal the Grove',
    description:
      'The forest grove near the Wilds is unsettled. Gather what you need and perform a ritual to soothe it.',
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
  echoes_at_the_lake: {
    id: 'echoes_at_the_lake',
    name: 'Echoes at the Lake',
    description: 'Freshly healed water now hums with whispers. Trace the ripples and report back to the Hermit.',
    steps: [
      {
        id: 'unlocked',
        summary: 'The newly calmed grove hints at echoes stirring across the Lake.',
      },
      {
        id: 'investigate_lake',
        summary: 'Visit the Lake and sense what changed there.',
      },
      {
        id: 'return_to_hermit',
        summary: 'Tell the Hermit what you witnessed at the Lake.',
      },
      {
        id: 'completed',
        summary: 'The Hermit considers the echoes and weighs what comes next.',
      },
    ],
  },
  hermits_glow: {
    id: 'hermits_glow',
    name: "Hermit's Glow",
    description: 'The Hermit speaks of lights deeper in the Wilds. Something waits beyond the newly quiet grove.',
    steps: [
      {
        id: 'unlocked',
        summary: 'The Hermit hints at strange lights and expects you may seek them soon.',
      },
      {
        id: 'completed',
        summary: 'Those lights will be met another day.',
      },
    ],
  },
};

