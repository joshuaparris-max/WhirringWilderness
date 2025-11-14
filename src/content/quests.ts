/**
 * Quest Content Definitions
 *
 * Static quest definitions for the game.
 */

import type { QuestDefinition } from '../types/content';

export type QuestId =
  | 'heal_the_grove'
  | 'echoes_at_the_lake'
  | 'hermits_glow'
  | 'hermit_fragment';

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
      { id: 'unlocked', summary: 'The Hermit hints at strange lights and expects you may seek them soon.' },
      { id: 'seek_glow', summary: 'Seek the pale lights deeper in the Wilds.' },
      { id: 'found_glow', summary: 'You have found the deeper glow.' },
      { id: 'commune_with_glow', summary: 'Reach for the Glow and commune with it.' },
      { id: 'completed', summary: 'Those lights will be met another day.' },
    ],
  },
  hermit_fragment: {
    id: 'hermit_fragment',
    name: "Hermit's Gift",
    description: 'The Hermit is interested in a pale shard of light you may find in the deeper Wilds.',
    steps: [
      {
        id: 'unlocked',
        summary: 'You have something the Hermit would like to see.',
      },
      {
        id: 'delivered',
        summary: 'You gave the Hermit a luminous fragment.',
      },
      {
        id: 'completed',
        summary: 'The Hermit thanks you and the Wilds seem kinder for it.',
      },
    ],
  },
};

