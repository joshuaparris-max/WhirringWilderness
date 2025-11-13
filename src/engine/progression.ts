/**
 * Progression System
 *
 * Handles XP, leveling, and character progression.
 */

import type { GameState } from '../types/gameState';

// XP thresholds for levels 1–5
const XP_THRESHOLDS = [0, 10, 30, 60, 100];

/**
 * Gets the player level for a given XP amount.
 */
export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

/**
 * Gets the XP threshold needed for the next level.
 * Returns null if already at max level.
 */
export function getNextLevelXp(level: number): number | null {
  const index = level;
  if (index < 0 || index >= XP_THRESHOLDS.length) return null;
  return XP_THRESHOLDS[index];
}

/**
 * Applies XP to the player and handles leveling up.
 * Returns the updated state and whether a level up occurred.
 */
export function applyXp(
  state: GameState,
  amount: number,
): { state: GameState; levelledUp: boolean } {
  const currentXp = state.player.xp;
  const newXp = Math.max(0, currentXp + amount);
  const oldLevel = state.player.level;
  const newLevel = getLevelForXp(newXp);

  let newState: GameState = {
    ...state,
    player: {
      ...state.player,
      xp: newXp,
      level: newLevel,
    },
  };

  if (newLevel > oldLevel) {
    const levelDiff = newLevel - oldLevel;
    const newMaxHp = state.player.maxHp + levelDiff * 5;
    newState = {
      ...newState,
      player: {
        ...newState.player,
        maxHp: newMaxHp,
        hp: newMaxHp,
      },
    };
    return { state: newState, levelledUp: true };
  }

  return { state: newState, levelledUp: false };
}

