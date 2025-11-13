/**
 * NPC Data
 *
 * Non-player character definitions for the game.
 */

import type { LocationId } from '../types/gameState';

export type NpcId = 'caretaker' | 'hermit' | 'ranger_trader';

export interface NpcData {
  id: NpcId;
  name: string;
  location: LocationId;
  introLines: string[];
}

export const npcs: Record<NpcId, NpcData> = {
  caretaker: {
    id: 'caretaker',
    name: 'Caretaker',
    location: 'sanctum',
    introLines: [
      'Welcome back, traveler. The Sanctum has been quiet.',
      'The forest beyond these walls needs help—there are places that have grown sick, places that need tending.',
      'If you venture out, be careful. The Wilds are not what they once were.',
    ],
  },
  hermit: {
    id: 'hermit',
    name: 'Hermit',
    location: 'hermit_hut',
    introLines: [
      'What do you want?',
      "I don't get many visitors. Most people know better than to wander this deep.",
      'If you came looking for answers, you might be disappointed. I keep to myself.',
    ],
  },
  ranger_trader: {
    id: 'ranger_trader',
    name: 'Ranger',
    location: 'trader_post',
    introLines: [
      "Ah, a traveler. I'm the Ranger here, and I run this trading post.",
      'I deal in resources—herbs, ore, water. If you have something useful, we can make a trade.',
      'The Wilds are dangerous, but they hold valuable things for those willing to gather them.',
    ],
  },
};

