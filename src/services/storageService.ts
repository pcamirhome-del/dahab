import type {
  MarketDataSnapshot,
  PortfolioItem,
  PriceAlertRule,
  PriceHistoryTick,
  RefreshIntervalSetting,
} from '../types/market.ts';
import { validateMarketSnapshot } from '../utils/consensusEngine.ts';

const DB_NAME = 'edahab_pwa_db';
const DB_VERSION = 1;
const STORE_KV = 'kv_store';

const KEY_MARKET = 'edahab_last_market_data';
const KEY_PREV_MARKET = 'edahab_prev_market_data';
const KEY_HISTORY = 'edahab_price_history_ticks';
const KEY_PORTFOLIO = 'edahab_portfolio_items';
const KEY_ALERTS = 'edahab_price_alerts';
const KEY_THEME = 'edahab_theme_mode';
const KEY_REFRESH_INTERVAL = 'edahab_refresh_interval_v2';
const KEY_SOUND_ON_MOVE = 'edahab_sound_on_move';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KV, 'readonly');
      const store = tx.objectStore(STORE_KV);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_KV, 'readwrite');
      const store = tx.objectStore(STORE_KV);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function getCachedMarketSync(): MarketDataSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY_MARKET);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketDataSnapshot;
    return validateMarketSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getPrevMarketSync(): MarketDataSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY_PREV_MARKET);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketDataSnapshot;
    return validateMarketSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveMarketSnapshot(snapshot: MarketDataSnapshot): Promise<void> {
  if (!validateMarketSnapshot(snapshot)) return;
  try {
    const existing = getCachedMarketSync();
    if (
      existing &&
      (existing.gold.karat21.sell !== snapshot.gold.karat21.sell ||
        existing.gold.karat21.buy !== snapshot.gold.karat21.buy ||
        existing.gold.karat24.sell !== snapshot.gold.karat24.sell ||
        existing.gold.ounceUsd !== snapshot.gold.ounceUsd)
    ) {
      localStorage.setItem(KEY_PREV_MARKET, JSON.stringify(existing));
      await idbSet(KEY_PREV_MARKET, existing);
    }
    localStorage.setItem(KEY_MARKET, JSON.stringify(snapshot));
    await idbSet(KEY_MARKET, snapshot);
  } catch {
    // Ignore quota errors
  }
}

export async function loadCachedMarketSnapshot(): Promise<MarketDataSnapshot | null> {
  const fromIdb = await idbGet<MarketDataSnapshot>(KEY_MARKET);
  if (fromIdb && validateMarketSnapshot(fromIdb)) return fromIdb;
  return getCachedMarketSync();
}

export async function loadPriceHistoryTicks(): Promise<PriceHistoryTick[]> {
  const fromIdb = await idbGet<PriceHistoryTick[]>(KEY_HISTORY);
  if (Array.isArray(fromIdb)) return fromIdb;
  try {
    const raw = localStorage.getItem(KEY_HISTORY);
    return raw ? (JSON.parse(raw) as PriceHistoryTick[]) : [];
  } catch {
    return [];
  }
}

export async function appendPriceHistoryTick(
  snapshot: MarketDataSnapshot
): Promise<PriceHistoryTick[]> {
  if (!validateMarketSnapshot(snapshot)) {
    return loadPriceHistoryTicks();
  }

  const existing = await loadPriceHistoryTicks();
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  const pruned = existing.filter((t) => t.timestamp >= cutoff);

  const last = pruned[pruned.length - 1];
  const newTick: PriceHistoryTick = {
    timestamp: snapshot.fetchedAt,
    karat21Sell: snapshot.gold.karat21.sell,
    karat21Buy: snapshot.gold.karat21.buy,
    karat24Sell: snapshot.gold.karat24.sell,
    ounceUsd: snapshot.gold.ounceUsd,
  };

  // Avoid duplicate identical consecutive ticks within 9 seconds unless price changed
  const samePrice =
    last &&
    last.karat21Sell === newTick.karat21Sell &&
    last.karat21Buy === newTick.karat21Buy &&
    last.karat24Sell === newTick.karat24Sell &&
    last.ounceUsd === newTick.ounceUsd;

  if (last && samePrice && newTick.timestamp - last.timestamp < 9_000) {
    return pruned;
  }

  const updated = [...pruned, newTick].slice(-2000);
  try {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(updated));
  } catch {
    // Ignore quota error
  }
  await idbSet(KEY_HISTORY, updated);
  return updated;
}

export async function loadPortfolioItems(): Promise<PortfolioItem[]> {
  const fromIdb = await idbGet<PortfolioItem[]>(KEY_PORTFOLIO);
  if (Array.isArray(fromIdb)) return fromIdb;
  try {
    const raw = localStorage.getItem(KEY_PORTFOLIO);
    return raw ? (JSON.parse(raw) as PortfolioItem[]) : [];
  } catch {
    return [];
  }
}

export async function savePortfolioItems(items: PortfolioItem[]): Promise<void> {
  try {
    localStorage.setItem(KEY_PORTFOLIO, JSON.stringify(items));
  } catch {
    // Ignore storage error
  }
  await idbSet(KEY_PORTFOLIO, items);
}

export async function loadPriceAlerts(): Promise<PriceAlertRule[]> {
  const fromIdb = await idbGet<PriceAlertRule[]>(KEY_ALERTS);
  if (Array.isArray(fromIdb)) return fromIdb;
  try {
    const raw = localStorage.getItem(KEY_ALERTS);
    return raw ? (JSON.parse(raw) as PriceAlertRule[]) : [];
  } catch {
    return [];
  }
}

export async function savePriceAlerts(alerts: PriceAlertRule[]): Promise<void> {
  try {
    localStorage.setItem(KEY_ALERTS, JSON.stringify(alerts));
  } catch {
    // Ignore storage error
  }
  await idbSet(KEY_ALERTS, alerts);
}

export function loadThemePreference(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(KEY_THEME);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function saveThemePreference(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(KEY_THEME, theme);
  } catch {
    // Ignore
  }
}

export function loadRefreshIntervalSetting(): RefreshIntervalSetting {
  try {
    const raw = localStorage.getItem(KEY_REFRESH_INTERVAL);
    if (raw === null) return 10;
    const val = Number(raw);
    if (val === 10 || val === 30 || val === 60 || val === 0) return val;
    return 10;
  } catch {
    return 10;
  }
}

export function saveRefreshIntervalSetting(val: RefreshIntervalSetting): void {
  try {
    localStorage.setItem(KEY_REFRESH_INTERVAL, String(val));
  } catch {
    // Ignore
  }
}

export function loadSoundOnMoveSetting(): boolean {
  try {
    return localStorage.getItem(KEY_SOUND_ON_MOVE) === '1';
  } catch {
    return false;
  }
}

export function saveSoundOnMoveSetting(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_SOUND_ON_MOVE, enabled ? '1' : '0');
  } catch {
    // Ignore
  }
}

const KEY_FAVORITE_JEWELERS = 'edahab_favorite_jewelers';

export async function loadFavoriteJewelers<T>(): Promise<T[]> {
  const fromIdb = await idbGet<T[]>(KEY_FAVORITE_JEWELERS);
  if (Array.isArray(fromIdb)) return fromIdb;
  try {
    const raw = localStorage.getItem(KEY_FAVORITE_JEWELERS);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export async function saveFavoriteJewelers<T>(list: T[]): Promise<void> {
  try {
    localStorage.setItem(KEY_FAVORITE_JEWELERS, JSON.stringify(list));
  } catch {
    // Ignore
  }
  await idbSet(KEY_FAVORITE_JEWELERS, list);
}

