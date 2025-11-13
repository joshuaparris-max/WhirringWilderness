/**
 * Trading System
 *
 * Helper functions for handling trades and bartering.
 */

import type { GameState, LogEntry } from '../types/gameState';
import type { TradeOffer, TradeId } from '../content/shop';
import { RANGER_TRADES } from '../content/shop';
import { countItem, removeItems, addItemToInventory } from './actions';

/**
 * Checks if the player can afford a trade.
 */
export function canAffordTrade(state: GameState, trade: TradeOffer): boolean {
  return trade.costs.every((cost) => countItem(state, cost.itemId) >= cost.quantity);
}

/**
 * Applies a trade, removing costs and adding rewards.
 */
export function applyTrade(
  state: GameState,
  trade: TradeOffer,
  makeLogId: () => string,
): { state: GameState; logEntries: LogEntry[] } {
  let newState = state;
  const logEntries: LogEntry[] = [];

  // Remove costs
  for (const cost of trade.costs) {
    newState = removeItems(newState, cost.itemId, cost.quantity);
  }

  // Add rewards
  for (const reward of trade.rewards) {
    newState = addItemToInventory(newState, reward.itemId, reward.quantity);
  }

  // One simple log entry for now
  logEntries.push({
    id: makeLogId(),
    type: 'system',
    text: trade.label,
    timestamp: Date.now(),
  });

  return { state: newState, logEntries };
}

/**
 * Gets a trade offer by ID.
 */
export function getTradeById(id: TradeId): TradeOffer | undefined {
  return RANGER_TRADES.find((t) => t.id === id);
}

