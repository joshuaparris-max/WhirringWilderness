/**
 * Text Helpers
 *
 * Narrative text generation with variation to make the world feel alive.
 */

import type { LocationId } from '../types/gameState';
import type { ForestRepTier } from './encounters';

/**
 * Picks a random element from an array.
 */
export function pick<T>(options: T[]): T {
  if (options.length === 0) throw new Error('pick() requires at least one option');
  const selected = options[Math.floor(Math.random() * options.length)];
  if (selected === undefined) throw new Error('Selected undefined option');
  return selected;
}

const DEFAULT_SENSE_LINES = [
  'You take in your surroundings, quiet and watchful.',
  'You pause, letting the air settle around you.',
];

const SENSE_LINES: Partial<Record<LocationId, string[]>> = {
  sanctum: [
    'The candles breathe quietly; beyond the walls, the forest waits.',
    'Stillness here. The Sanctum holds its breath while the Wilds watch.',
    'Candlelight flickers. Outside, something listens.',
    'Ancient wards murmur softly, the Sanctum sheltering every exhale.',
    'You feel the stone cradle you, humming with memory.',
  ],
  gate: [
    'Wind worries the old wood. The Wilds feel close.',
    'The gate creaks softly. Beyond it, the forest presses near.',
    'Old timber groans. The threshold between safety and the unknown.',
    'The hinges whisper; the path beyond waits for your step.',
  ],
  wilds: [
    "For a moment everything is still, as if listening back.",
    'The forest holds its breath. Something is watching.',
    'A hush falls. The trees seem to lean closer.',
    'The Wilds feel charged, like lightning about to strike.',
    'Leaves rustle where there is no wind, whispering your name.',
  ],
  lake: [
    'Water laps quietly at the shore. The surface reflects nothing quite right.',
    'The lake is still, too still. Its surface refuses to show you clearly.',
    'Ripples move without wind. Something stirs beneath.',
    'The air tastes of iron and mist. Something old dreams under the water.',
  ],
  mine: [
    'Darkness pools in the entrance. The mine holds its secrets close.',
    'Cold air drifts from the tunnel. Old stone remembers.',
    'The mine mouth gapes. Something waits in the deep.',
    'Dust motes hang unmoving, as if the mine is holding its breath.',
  ],
  hermit_hut: [
    'A small hut, quiet and closed. Someone lives here, but they keep to themselves.',
    'The hut sits among the trees, door shut. Privacy respected.',
    'Smoke curls from a small chimney. The hermit is home, but not welcoming.',
    'You sense guarded patience within; this is someone else’s solitude.',
  ],
  trader_post: [
    'A trading post, busy with quiet commerce. The Ranger keeps watch.',
    'Goods line the shelves. A place of exchange in the Wilds.',
    'The post feels safer than the forest. Business, not mystery.',
    'Ledger ink and dried herbs mingle; the Ranger weighs every deal.',
  ],
  deep_wilds: [
    'The light here is not sunlight. Pale motes drift through gnarled roots and hush the air.',
    'A slow pulse of pale light moves between trunks, and the forest seems to watch with something like curiosity.',
    'The deeper woods breathe differently here; faint glow threads weave through the undergrowth.',
    'Something luminous hums just out of reach — the air tastes of old secrets.',
  ],
};

const WILDS_HEALED_SENSE_LINES = [
  'The Wilds breathe easy. Leaves murmur, but the edge has gone from the silence.',
  'A gentler quiet now. The tension has lifted, leaving only the forest’s natural hush.',
  'The air feels lighter here. Whatever was wrong has been soothed.',
  'Birdsong returns in hesitant notes; the Wilds seem thankful.',
];

const DEFAULT_GATHER_LINES = [
  'You search around, but there is nothing here you can safely gather.',
  'Nothing here calls to be collected. You move on.',
  'The place offers nothing for gathering. You leave it as you found it.',
];

const GATHER_LINES: Partial<Record<LocationId, string[]>> = {
  sanctum: [
    'There is nothing here to take; the Sanctum itself is your shelter.',
    'You run your hand along carved stone. It offers reassurance, not resources.',
  ],
  wilds: [
    'You move slowly, hands careful on bark and moss, and gather a handful of forest herbs.',
    'Fingers trace the undergrowth, finding bitter green leaves. You collect what you need.',
    'Careful not to disturb the quiet, you gather herbs from the forest floor.',
    'You trim a sprig of herbs and whisper thanks to the soil beneath it.',
  ],
  lake: [
    'Kneeling at the shore, you fill a small vial with lake water, trying not to disturb the surface.',
    'You dip a vial into the still water, drawing up what you need while the surface barely ripples.',
    'Carefully, you collect lake water, mindful of what might be watching from below.',
    'A gentle scoop gathers clear water; you leave barely a ripple behind.',
  ],
  mine: [
    'You chip away at the rock, freeing a few lumps of raw ore.',
    'Stone yields to careful strikes. You gather what the mine offers.',
    'Working quietly, you extract ore from the mine wall.',
    'You pry loose a shard of ore and let the rest of the seam rest.',
  ],
  trader_post: [
    'You eye the shelves; best to trade rather than pilfer.',
    'Everything here belongs to fair dealing. You take nothing freely.',
  ],
  gate: [
    'Nothing to gather at the gate — only choices to make.',
  ],
  hermit_hut: [
    'Respecting the hut’s threshold, you gather nothing here.',
  ],
  deep_wilds: [
    'You cup handfuls of the pale motes, but they slip through your fingers like dust of light.',
    'The deeper grove offers nothing you can carry—only a sense that the place has marked you.',
    'You find small glowing fragments caught on moss, but they fade as you reach for them.',
  ],
};

/**
 * Returns varied sense text for a location.
 */
export function senseAt(
  locationId: LocationId,
  groveHealed: boolean | undefined,
  glowCommuneComplete?: boolean,
): string {
  const baseLines = SENSE_LINES[locationId] ?? DEFAULT_SENSE_LINES;

  // Wilds healed behaviour remains as before
  if (locationId === 'wilds' && groveHealed) {
    const pool = [...baseLines, ...WILDS_HEALED_SENSE_LINES];
    return pick(pool);
  }

  // Deeper Wilds have an alternate, softer palette after communion
  if (locationId === 'deep_wilds' && glowCommuneComplete) {
    const softer = [
      'The pale motes settle around you like a hand on your shoulder. The glow recognizes you now.',
      'The deeper wood feels quieter, kinder — the light threads seem to hum with a familiar note.',
      'The glow moves through the roots with a steadier rhythm. The Wilds regard you as one of their own.',
    ];
    const pool = [...baseLines, ...softer];
    return pick(pool);
  }

  return pick(baseLines);
}

/**
 * Returns varied gather text for a location.
 */
export function gatherAt(locationId: LocationId): string {
  const lines = GATHER_LINES[locationId];
  if (!lines || lines.length === 0) {
    return pick(DEFAULT_GATHER_LINES);
  }

  return pick(lines);
}

/**
 * Returns varied text for when the player hits a creature.
 */
export function hitCreature(creatureName: string, damage: number): string {
  return pick([
    `You strike at ${creatureName}, dealing ${damage} damage.`,
    `Your blow lands; ${creatureName} shivers, taking ${damage} damage.`,
    `You press forward, and ${creatureName} recoils from ${damage} points of harm.`,
  ]);
}

/**
 * Returns varied text for when a creature hits the player.
 */
export function creatureHitsPlayer(creatureName: string, damage: number): string {
  return pick([
    `${creatureName} lashes out, dealing ${damage} damage.`,
    `${creatureName}'s touch bites cold for ${damage} damage.`,
    `${creatureName} strikes back, and you take ${damage} damage.`,
  ]);
}

/**
 * Returns reputation-aware flavour text for the first creature hit in an encounter.
 * Returns null if no flavour should be added.
 */
export function getRepFlavourForCreatureHit(tier: ForestRepTier): string | null {
  if (tier === 'favour' || tier === 'revered') {
    return '— the blow feels strangely restrained.';
  }
  if (tier === 'hostile') {
    return '— the strike lands with the weight of the forest\'s anger.';
  }
  return null;
}

/**
 * Returns varied text for successful escape.
 */
export function escapeSuccess(creatureName: string): string {
  return pick([
    `You slip away from ${creatureName}, heart pounding.`,
    `You retreat, and ${creatureName} lets you go.`,
    `You break away, leaving ${creatureName} behind.`,
  ]);
}

/**
 * Returns varied text for failed escape attempt.
 */
export function escapeFail(creatureName: string, damage: number): string {
  return pick([
    `You stumble; ${creatureName} catches you for ${damage} damage.`,
    `Your escape falters. ${creatureName} strikes as you turn, dealing ${damage} damage.`,
    `You try to flee, but ${creatureName} is faster. ${damage} damage.`,
  ]);
}

