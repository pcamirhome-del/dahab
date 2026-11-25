export type KaratKey = '24' | '21' | '18' | '14';

export interface GoldRateItem {
  karat: KaratKey;
  label: string;
  purity: string;
  sell: number;
  buy: number;
  prevSell?: number;
  prevBuy?: number;
}

export interface SilverRates {
  ozUsd: number;
  ozEgpSell: number;
  ozEgpBuy: number;
  gram999: { sell: number; buy: number };
  gram925: { sell: number; buy: number };
  gram800: { sell: number; buy: number };
  prevOzUsd?: number;
}

export interface CurrencyRateItem {
  code: 'USD' | 'EUR' | 'SAR' | 'AED' | 'KWD' | 'GBP' | 'QAR';
  nameAr: string;
  flag: string;
  officialSell: number;
  officialBuy: number;
  saghaSell: number;
  saghaBuy: number;
  prevOfficialSell?: number;
}

export interface MarketDataSnapshot {
  gold: {
    karat24: GoldRateItem;
    karat21: GoldRateItem;
    karat18: GoldRateItem;
    karat14: GoldRateItem;
    goldPound: {
      sell: number;
      buy: number;
      prevSell?: number;
      prevBuy?: number;
    };
    ounceUsd: number;
    ounceEgpSell: number;
    ounceEgpBuy: number;
    prevOunceUsd?: number;
  };
  silver?: SilverRates;
  saghaUsd: number;
  currencies: CurrencyRateItem[];
  source: string;
  sourceUrl: string;
  isFallback: boolean;
  isOfflineCache?: boolean;
  latencyMs?: number;
  fetchedAt: number;
  lastUpdatedFormatted: string;
}

export interface PriceHistoryTick {
  timestamp: number;
  karat21Sell: number;
  karat21Buy: number;
  karat24Sell: number;
  ounceUsd: number;
}

export type RefreshIntervalSetting = 10 | 30 | 60 | 0;

export interface PriceChangeDelta {
  direction: 'up' | 'down';
  diff: number;
}

export type PriceDeltaMap = Record<string, PriceChangeDelta>;

export type PortfolioKarat = '24' | '21' | '18' | '14' | 'pound';

export interface PortfolioItem {
  id: string;
  label: string;
  karat: PortfolioKarat;
  weightGrams: number;
  quantity: number;
  purchasePricePerUnit: number;
  totalCost: number;
  createdAt: number;
}

export interface PriceAlertRule {
  id: string;
  karat: '21';
  priceType: 'sell' | 'buy';
  condition: 'above' | 'below';
  targetPrice: number;
  soundEnabled: boolean;
  browserNotifyEnabled: boolean;
  active: boolean;
  triggeredAt?: number;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  pubDateMs: number;
  relativeTimeAr: string;
  category: 'gold' | 'currency';
}

export type BullionBrandId = 'btc' | 'swiss' | 'malaz' | 'selema';

export type GovernorateId =
  | 'cairo-sagha'
  | 'nasr-heliopolis'
  | 'maadi'
  | 'giza-zayed'
  | 'alexandria'
  | 'delta-upper';

export interface JewelerDirectoryEntry {
  id: string;
  name: string;
  governorate: GovernorateId;
  governorateLabel: string;
  address: string;
  phone?: string;
  mapsQuery: string;
  specialty: string;
  isUserSaved?: boolean;
}
