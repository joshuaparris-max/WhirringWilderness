/**
 * Text Helpers
 *
 * Narrative text generation with variation to make the world feel alive.
 */

import type { LocationId } from '../types/gameState';

/**
 * Picks a random element from an array.
 */
export function pick<T>(options: T[]): T {
  if (options.length === 0) throw new Error('pick() requires at least one option');
  const selected = options[Math.floor(Math.random() * options.length)];
  if (selected === undefined) throw new Error('Selected undefined option');
  return selected;
}

/**
 * Returns varied sense text for a location.
 */
export function senseAt(locationId: LocationId, groveHealed: boolean | undefined): string {
  switch (locationId) {
    case 'sanctum':
      return pick([
        'The candles breathe quietly; beyond the walls, the forest waits.',
        'Stillness here. The Sanctum holds its breath while the Wilds watch.',
        'Candlelight flickers. Outside, something listens.',
      ]);

    case 'gate':
      return pick([
        'Wind worries the old wood. The Wilds feel close.',
        'The gate creaks softly. Beyond it, the forest presses near.',
        'Old timber groans. The threshold between safety and the unknown.',
      ]);

    case 'wilds':
      if (groveHealed) {
        return pick([
          'The Wilds breathe easy. Leaves murmur, but the edge has gone from the silence.',
          'A gentler quiet now. The tension has lifted, leaving only the forest\'s natural hush.',
          'The air feels lighter here. Whatever was wrong has been soothed.',
        ]);
      }
      return pick([
        "For a moment everything is still, as if listening back.",
        'The forest holds its breath. Something is watching.',
        'A hush falls. The trees seem to lean closer.',
      ]);

    case 'lake':
      return pick([
        'Water laps quietly at the shore. The surface reflects nothing quite right.',
        'The lake is still, too still. Its surface refuses to show you clearly.',
        'Ripples move without wind. Something stirs beneath.',
      ]);

    case 'mine':
      return pick([
        'Darkness pools in the entrance. The mine holds its secrets close.',
        'Cold air drifts from the tunnel. Old stone remembers.',
        'The mine mouth gapes. Something waits in the deep.',
      ]);

    case 'hermit_hut':
      return pick([
        'A small hut, quiet and closed. Someone lives here, but they keep to themselves.',
        'The hut sits among the trees, door shut. Privacy respected.',
        'Smoke curls from a small chimney. The hermit is home, but not welcoming.',
      ]);

    case 'trader_post':
      return pick([
        'A trading post, busy with quiet commerce. The Ranger keeps watch.',
        'Goods line the shelves. A place of exchange in the Wilds.',
        'The post feels safer than the forest. Business, not mystery.',
      ]);

    default:
      return 'You take in your surroundings, quiet and watchful.';
  }
}

/**
 * Returns varied gather text for a location.
 */
export function gatherAt(locationId: LocationId): string {
  switch (locationId) {
    case 'wilds':
      return pick([
        'You move slowly, hands careful on bark and moss, and gather a handful of forest herbs.',
        'Fingers trace the undergrowth, finding bitter green leaves. You collect what you need.',
        'Careful not to disturb the quiet, you gather herbs from the forest floor.',
      ]);

    case 'lake':
      return pick([
        'Kneeling at the shore, you fill a small vial with lake water, trying not to disturb the surface.',
        'You dip a vial into the still water, drawing up what you need while the surface barely ripples.',
        'Carefully, you collect lake water, mindful of what might be watching from below.',
      ]);

    case 'mine':
      return pick([
        'You chip away at the rock, freeing a few lumps of raw ore.',
        'Stone yields to careful strikes. You gather what the mine offers.',
        'Working quietly, you extract ore from the mine wall.',
      ]);

    default:
      return pick([
        'You search around, but there is nothing here you can safely gather.',
        'Nothing here calls to be collected. You move on.',
        'The place offers nothing for gathering. You leave it as you found it.',
      ]);
  }
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

