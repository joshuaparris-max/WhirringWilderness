/**
 * Art Mapping
 *
 * Maps location IDs to art keys for visual presentation.
 * This provides a hook for future art assets.
 */

import type { LocationId } from '../types/gameState';

export type LocationArtKey =
  | 'sanctum'
  | 'gate'
  | 'wilds'
  | 'lake'
  | 'mine'
  | 'trader_post'
  | 'grove'
  | 'hermit_hut'
  | 'deep_wilds';

export function getLocationArtKey(locationId: LocationId): LocationArtKey {
  switch (locationId) {
    case 'sanctum':
      return 'sanctum';
    case 'gate':
      return 'gate';
    case 'lake':
      return 'lake';
    case 'mine':
      return 'mine';
    case 'trader_post':
      return 'trader_post';
    case 'hermit_hut':
      return 'hermit_hut';
    case 'deep_wilds':
      return 'deep_wilds';
    case 'wilds':
    default:
      return 'wilds';
  }
}
