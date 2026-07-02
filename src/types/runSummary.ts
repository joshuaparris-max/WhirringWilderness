import type { LocationId } from './gameState';

export interface RunSummary {
  finishedAt: number;
  level: number;
  xp: number;
  forestReputation: number;
  groveHealed: boolean;
  location: LocationId;
  itemsCarried: number;
  deathCause: string;
}
