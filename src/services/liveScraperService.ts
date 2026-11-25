import type { MarketDataSnapshot } from '../types/market.ts';
import {
  formatTime12hAr,
  parseEdahabConsensus,
  validateMarketSnapshot,
} from '../utils/consensusEngine.ts';
import {
  getPrevMarketSync,
  loadCachedMarketSnapshot,
  saveMarketSnapshot,
} from './storageService.ts';

function attachPriceDeltas(
  current: MarketDataSnapshot,
  previous: MarketDataSnapshot | null
): MarketDataSnapshot {
  if (!previous) return current;

  const prevCurrMap = new Map(previous.currencies.map((c) => [c.code, c.officialSell]));

  return {
    ...current,
    gold: {
      ...current.gold,
      karat24: {
        ...current.gold.karat24,
        prevSell: previous.gold.karat24.sell,
        prevBuy: previous.gold.karat24.buy,
      },
      karat21: {
        ...current.gold.karat21,
        prevSell: previous.gold.karat21.sell,
        prevBuy: previous.gold.karat21.buy,
      },
      karat18: {
        ...current.gold.karat18,
        prevSell: previous.gold.karat18.sell,
        prevBuy: previous.gold.karat18.buy,
      },
      karat14: {
        ...current.gold.karat14,
        prevSell: previous.gold.karat14.sell,
        prevBuy: previous.gold.karat14.buy,
      },
      goldPound: {
        ...current.gold.goldPound,
        prevSell: previous.gold.goldPound.sell,
        prevBuy: previous.gold.goldPound.buy,
      },
      prevOunceUsd: previous.gold.ounceUsd,
    },
    silver: current.silver
      ? {
          ...current.silver,
          prevOzUsd: previous.silver?.ozUsd,
        }
      : undefined,
    currencies: current.currencies.map((c) => ({
      ...c,
      prevOfficialSell: prevCurrMap.get(c.code),
    })),
  };
}

async function fetchErRatesBrowser(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/EGP?_t=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    return data.result === 'success' && data.rates ? data.rates : null;
  } catch {
    return null;
  }
}

async function fetchSilverUsdBrowser(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.gold-api.com/price/XAG?_t=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: number };
    return typeof data.price === 'number' && data.price > 0 ? data.price : null;
  } catch {
    return null;
  }
}

async function fetchViaCorsProxies(startTime: number): Promise<MarketDataSnapshot | null> {
  const erRatesPromise = fetchErRatesBrowser();
  const silverUsdPromise = fetchSilverUsdBrowser();
  const bust = Date.now();

  // CORS Proxy 1: api.allorigins.win/get?url=... (JSON wrapper)
  try {
    const targetUrl = `https://edahabapp.com/?_t=${bust}`;
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&_t=${bust}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const wrapper = (await res.json()) as { contents?: string };
      if (wrapper.contents) {
        const [erRates, silverUsd] = await Promise.all([erRatesPromise, silverUsdPromise]);
        const parsed = parseEdahabConsensus(wrapper.contents, erRates, Date.now(), silverUsd);
        if (parsed) {
          return {
            ...parsed,
            source: 'eDahab عبر AllOrigins Proxy',
            latencyMs: Math.round(performance.now() - startTime),
          };
        }
      }
    }
  } catch {
    // Try next proxy
  }

  // CORS Proxy 2: corsproxy.io
  try {
    const targetUrl = `https://edahabapp.com/?_t=${bust}`;
    const res = await fetch(
      `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const html = await res.text();
      const [erRates, silverUsd] = await Promise.all([erRatesPromise, silverUsdPromise]);
      const parsed = parseEdahabConsensus(html, erRates, Date.now(), silverUsd);
      if (parsed) {
        return {
          ...parsed,
          source: 'eDahab عبر CorsProxy',
          latencyMs: Math.round(performance.now() - startTime),
        };
      }
    }
  } catch {
    // Fall through to direct CORS APIs
  }

  // Secondary CORS-enabled direct APIs (api.gold-api.com + open.er-api.com)
  try {
    const [erRates, silverUsd, goldRes] = await Promise.all([
      erRatesPromise,
      silverUsdPromise,
      fetch(`https://api.gold-api.com/price/XAU?_t=${bust}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      }),
    ]);
    if (erRates && erRates.USD > 0 && goldRes.ok) {
      const goldJson = (await goldRes.json()) as { price?: number };
      const ounceUsd = goldJson.price;
      if (typeof ounceUsd === 'number' && ounceUsd > 0) {
        const usdToEgp = Number((1 / erRates.USD).toFixed(2));
        const gram24 = Math.round((ounceUsd / 31.1034768) * usdToEgp);
        const gram21 = Math.round((gram24 * 21) / 24);
        const gram18 = Math.round((gram24 * 18) / 24);
        const gram14 = Math.round((gram24 * 14) / 24);
        const syntheticHtml = `
          الذهب عيار 24 بيع: <span class="number-font">${gram24}</span> شراء: <span class="number-font">${Math.round(gram24 * 0.9945)}</span>
          الذهب عيار 21 بيع: <span class="number-font">${gram21}</span> شراء: <span class="number-font">${Math.round(gram21 * 0.9945)}</span>
          الذهب عيار 18 بيع: <span class="number-font">${gram18}</span> شراء: <span class="number-font">${Math.round(gram18 * 0.9945)}</span>
          الذهب عيار 14 بيع: <span class="number-font">${gram14}</span> شراء: <span class="number-font">${Math.round(gram14 * 0.9945)}</span>
          سعر الجنيه الذهب <span class="number-font">${gram21 * 8}</span>
          سعر الأوقية عالمياً <span class="number-font">${Math.round(ounceUsd)}</span>
        `;
        const parsed = parseEdahabConsensus(syntheticHtml, erRates, Date.now(), silverUsd);
        if (parsed) {
          return {
            ...parsed,
            source: 'البورصة العالمية المباشرة (Gold-API & ER-API)',
            sourceUrl: 'https://api.gold-api.com/price/XAU',
            isFallback: true,
            latencyMs: Math.round(performance.now() - startTime),
          };
        }
      }
    }
  } catch {
    // Fall through to offline cache
  }

  return null;
}

export async function fetchLiveMarketData(force = false): Promise<MarketDataSnapshot> {
  const prevSnapshot = getPrevMarketSync();
  const startTime = performance.now();
  const bust = Date.now();

  if (typeof navigator === 'undefined' || navigator.onLine) {
    // Tier 1: Serverless / Express proxy (/api/live-rates) with mandatory cache-busting _t
    const endpoints = force
      ? [`/api/live-rates?force=1&_t=${bust}`, `/api/market-data?force=1&_t=${bust}`]
      : [`/api/live-rates?_t=${bust}`, `/api/market-data?_t=${bust}`];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          cache: 'no-store',
          signal: AbortSignal.timeout(9000),
        });
        if (res.ok) {
          const data = (await res.json()) as MarketDataSnapshot;
          if (validateMarketSnapshot(data)) {
            const clientLatency = Math.round(performance.now() - startTime);
            const formatted: MarketDataSnapshot = {
              ...data,
              latencyMs: data.latencyMs && data.latencyMs > 5 ? data.latencyMs : clientLatency,
              lastUpdatedFormatted: formatTime12hAr(data.fetchedAt),
              isOfflineCache: false,
            };
            await saveMarketSnapshot(formatted);
            return attachPriceDeltas(formatted, prevSnapshot);
          }
        }
      } catch {
        // Try next endpoint / CORS proxy
      }
    }

    // Tier 2 & 3: Public CORS proxy chain + direct live APIs
    const corsData = await fetchViaCorsProxies(startTime);
    if (corsData && validateMarketSnapshot(corsData)) {
      await saveMarketSnapshot(corsData);
      return attachPriceDeltas(corsData, prevSnapshot);
    }
  }

  // Tier 4: Offline / Cached Snapshot from IndexedDB / localStorage
  const cached = await loadCachedMarketSnapshot();
  if (cached) {
    return attachPriceDeltas(
      {
        ...cached,
        isOfflineCache: true,
        lastUpdatedFormatted: formatTime12hAr(cached.fetchedAt),
      },
      prevSnapshot
    );
  }

  throw new Error('لا يمكن الاتصال بمصادر الأسعار الحية ولا توجد بيانات مخزنة مسبقاً.');
}
