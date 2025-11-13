/**
 * Trading System
 *
 * Helper functions for handling trades and bartering.
 */

import type { GameState } from '../types/gameState';
import type { LogEntry } from '../types/log';
import type { TradeOffer, TradeId } from '../content/shop';
import { RANGER_TRADES } from '../content/shop';
import { countItem, removeItems, addItemToInventory } from './actions';

/**
 * Per-trade usage limits to avoid infinite conversions.
 */
const BASE_TRADE_LIMITS: Partial<Record<TradeId, number>> = {
  herbs_for_tonic: 3,
  ore_for_tonic: 3,
};

export function getEffectiveTradeLimit(state: GameState, tradeId: TradeId): number | undefined {
  const baseLimit = BASE_TRADE_LIMITS[tradeId];
  if (baseLimit === undefined) return undefined;

  const forestRep = state.flags.reputation?.forest ?? 0;
  let modifier = 0;

  if (forestRep >= 20) {
    modifier = 2;
  } else if (forestRep >= 10) {
    modifier = 1;
  } else if (forestRep <= -15) {
    modifier = -2;
  } else if (forestRep <= -5) {
    modifier = -1;
  }

  return Math.max(1, baseLimit + modifier);
}

export function canUseTrade(state: GameState, tradeId: TradeId): boolean {
  const limit = getEffectiveTradeLimit(state, tradeId);
  if (limit === undefined) return true;
  const used = state.tradeUsage[tradeId] ?? 0;
  return used < limit;
}

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

  // Increment trade usage
  const used = newState.tradeUsage[trade.id] ?? 0;
  newState = {
    ...newState,
    tradeUsage: {
      ...newState.tradeUsage,
      [trade.id]: used + 1,
    },
  };

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

