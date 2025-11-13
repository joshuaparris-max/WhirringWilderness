/**
 * Shop Content Definitions
 *
 * Trading post offers and trade definitions.
 */

export interface TradeCost {
  itemId: string;
  quantity: number;
}

export type TradeId = 'herbs_for_tonic' | 'ore_for_tonic';

export interface TradeOffer {
  id: TradeId;
  label: string; // e.g., "Trade 3x Forest Herb for 1x Healing Tonic"
  costs: TradeCost[];
  rewards: TradeCost[];
}

export const RANGER_TRADES: TradeOffer[] = [
  {
    id: 'herbs_for_tonic',
    label: 'Trade 3x Forest Herb for 1x Healing Tonic',
    costs: [{ itemId: 'forest_herb', quantity: 3 }],
    rewards: [{ itemId: 'healing_tonic', quantity: 1 }],
  },
  {
    id: 'ore_for_tonic',
    label: 'Trade 2x Raw Ore for 1x Healing Tonic',
    costs: [{ itemId: 'raw_ore', quantity: 2 }],
    rewards: [{ itemId: 'healing_tonic', quantity: 1 }],
  },
];

