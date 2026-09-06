/**
 * Progression rules
 *
 * XP thresholds are [0, 10, 30, 60, 100]. These pin the boundaries so a
 * change to the curve is a deliberate edit rather than a silent regression.
 */
import { describe, it, expect } from 'vitest';
import { getLevelForXp, getNextLevelXp } from '../engine/progression';

describe('getLevelForXp', () => {
  it('starts at level 1 with no xp', () => {
    expect(getLevelForXp(0)).toBe(1);
  });

  it('levels exactly on each threshold', () => {
    expect(getLevelForXp(10)).toBe(2);
    expect(getLevelForXp(30)).toBe(3);
    expect(getLevelForXp(60)).toBe(4);
    expect(getLevelForXp(100)).toBe(5);
  });

  it('does not level one xp short of a threshold', () => {
    expect(getLevelForXp(9)).toBe(1);
    expect(getLevelForXp(29)).toBe(2);
    expect(getLevelForXp(99)).toBe(4);
  });

  it('caps at the highest threshold', () => {
    expect(getLevelForXp(100_000)).toBe(5);
  });

  it('never returns below level 1 for negative xp', () => {
    expect(getLevelForXp(-5)).toBeGreaterThanOrEqual(1);
  });

  it('is monotonic', () => {
    let previous = getLevelForXp(0);
    for (let xp = 0; xp <= 150; xp++) {
      const level = getLevelForXp(xp);
      expect(level, `level dropped at xp=${xp}`).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });
});

describe('getNextLevelXp', () => {
  it('returns the next threshold', () => {
    expect(getNextLevelXp(1)).toBe(10);
    expect(getNextLevelXp(2)).toBe(30);
  });

  it('returns null at max level', () => {
    expect(getNextLevelXp(5)).toBeNull();
  });
});
