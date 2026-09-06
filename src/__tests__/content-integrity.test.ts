/**
 * Content integrity
 *
 * These check the string-id links between content files. Nothing else
 * verifies them, so a renamed or deleted id fails silently at runtime.
 */
import { describe, it, expect } from 'vitest';
import { items } from '../content/items';
import { creatures } from '../content/creatures';
import { npcs } from '../content/npcs';
import { QUESTS } from '../content/quests';
import { RANGER_TRADES } from '../content/shop';
import { locations } from '../engine/locations';

const itemIds = new Set(Object.keys(items));
const locationIds = new Set(Object.keys(locations));

describe('items', () => {
  it('has entries', () => {
    expect(itemIds.size).toBeGreaterThan(0);
  });

  it('each record key matches its id field', () => {
    for (const [key, item] of Object.entries(items)) {
      expect(item.id, `items.${key}.id`).toBe(key);
    }
  });

  it('each item has a name, description and valid category', () => {
    for (const [key, item] of Object.entries(items)) {
      expect(item.name, `items.${key}.name`).toBeTruthy();
      expect(item.description, `items.${key}.description`).toBeTruthy();
      expect(['resource', 'consumable', 'quest']).toContain(item.category);
    }
  });
});

describe('creatures', () => {
  it('each record key matches its id field', () => {
    for (const [key, creature] of Object.entries(creatures)) {
      expect(creature.id, `creatures.${key}.id`).toBe(key);
    }
  });

  it('each creature has sane combat stats', () => {
    for (const [key, creature] of Object.entries(creatures)) {
      expect(creature.stats.hp, `creatures.${key}.stats.hp`).toBeGreaterThan(0);
      expect(creature.stats.attack, `creatures.${key}.stats.attack`).toBeGreaterThanOrEqual(0);
      expect(creature.stats.defence, `creatures.${key}.stats.defence`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('locations', () => {
  it('every exit points at a real location', () => {
    for (const [key, location] of Object.entries(locations)) {
      for (const [direction, target] of Object.entries(location.exits)) {
        expect(locationIds.has(target as string), `${key} exit ${direction} -> ${target}`).toBe(true);
      }
    }
  });

  it('each record key matches its id field', () => {
    for (const [key, location] of Object.entries(locations)) {
      expect(location.id, `locations.${key}.id`).toBe(key);
    }
  });
});

describe('npcs', () => {
  it('each npc stands in a real location', () => {
    for (const [key, npc] of Object.entries(npcs)) {
      expect(locationIds.has(npc.location), `npcs.${key}.location -> ${npc.location}`).toBe(true);
    }
  });

  it('each npc has at least one intro line', () => {
    for (const [key, npc] of Object.entries(npcs)) {
      expect(npc.introLines.length, `npcs.${key}.introLines`).toBeGreaterThan(0);
    }
  });
});

describe('quests', () => {
  it('each quest has steps with unique ids', () => {
    for (const [key, quest] of Object.entries(QUESTS)) {
      expect(quest.steps.length, `QUESTS.${key}.steps`).toBeGreaterThan(0);
      const ids = quest.steps.map((s) => s.id);
      expect(new Set(ids).size, `QUESTS.${key} duplicate step ids`).toBe(ids.length);
    }
  });
});

describe('trades', () => {
  it('every cost and reward references a real item', () => {
    for (const trade of RANGER_TRADES) {
      for (const cost of trade.costs) {
        expect(itemIds.has(cost.itemId), `trade ${trade.id} cost -> ${cost.itemId}`).toBe(true);
      }
      for (const reward of trade.rewards) {
        expect(itemIds.has(reward.itemId), `trade ${trade.id} reward -> ${reward.itemId}`).toBe(true);
      }
    }
  });

  it('quantities are positive', () => {
    for (const trade of RANGER_TRADES) {
      for (const entry of [...trade.costs, ...trade.rewards]) {
        expect(entry.quantity, `trade ${trade.id} quantity`).toBeGreaterThan(0);
      }
    }
  });
});
