import {
  parseEdahabConsensus,
  parseFallbackEgyptGoldConsensus,
} from '../src/utils/consensusEngine.ts';
import { parseGoogleNewsRss } from '../src/utils/newsParser.ts';
import type { MarketDataSnapshot, MarketNewsItem } from '../src/types/market.ts';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  return fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function fetchErRatesFromEgp(): Promise<Record<string, number> | null> {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/EGP', 6000);
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    return data.result === 'success' && data.rates ? data.rates : null;
  } catch {
    return null;
  }
}

async function fetchSilverOunceUsd(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout('https://api.gold-api.com/price/XAG', 5000);
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: number };
    return typeof data.price === 'number' && data.price > 0 ? data.price : null;
  } catch {
    return null;
  }
}

export async function fetchLiveNewsFromUpstream(): Promise<MarketNewsItem[]> {
  const query = encodeURIComponent('أسعار الذهب في مصر OR سعر الدولار في مصر');
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=EG&ceid=EG:ar`;
  const res = await fetchWithTimeout(rssUrl, 8000);
  if (!res.ok) {
    throw new Error(`Google News RSS HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseGoogleNewsRss(xml, 20);
}

export async function fetchLiveRatesFromUpstream(): Promise<MarketDataSnapshot> {
  const start = Date.now();
  const erRatesPromise = fetchErRatesFromEgp();
  const silverUsdPromise = fetchSilverOunceUsd();

  try {
    const [edahabRes, erRates, silverUsd] = await Promise.all([
      fetchWithTimeout(`https://edahabapp.com/?_t=${Date.now()}`, 8000),
      erRatesPromise,
      silverUsdPromise,
    ]);
    if (edahabRes.ok) {
      const html = await edahabRes.text();
      const parsed = parseEdahabConsensus(html, erRates, Date.now(), silverUsd);
      if (parsed) {
        return {
          ...parsed,
          latencyMs: Date.now() - start,
        };
      }
    }
  } catch {
    // Proceed to secondary live source
  }

  const [erRates, silverUsd, goldApiRes, egGoldRes] = await Promise.all([
    erRatesPromise,
    silverUsdPromise,
    fetchWithTimeout('https://api.gold-api.com/price/XAU', 6000).catch(() => null),
    fetchWithTimeout('https://egypt.gold-price-today.com/', 7000).catch(() => null),
  ]);

  let ounceUsd = 0;
  if (goldApiRes && goldApiRes.ok) {
    try {
      const goldJson = (await goldApiRes.json()) as { price?: number };
      if (typeof goldJson.price === 'number' && goldJson.price > 0) {
        ounceUsd = goldJson.price;
      }
    } catch {
      // Ignore parse error
    }
  }

  if (egGoldRes && egGoldRes.ok && erRates && ounceUsd > 0) {
    const html = await egGoldRes.text();
    const fallback = parseFallbackEgyptGoldConsensus(
      html,
      ounceUsd,
      erRates,
      Date.now(),
      silverUsd
    );
    if (fallback) {
      return {
        ...fallback,
        latencyMs: Date.now() - start,
      };
    }
  }

  if (erRates && erRates.USD > 0 && ounceUsd > 0) {
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
        source: 'البورصة العالمية المباشرة (XAU/USD & ER-API)',
        sourceUrl: 'https://api.gold-api.com/price/XAU',
        isFallback: true,
        latencyMs: Date.now() - start,
      };
    }
  }

  throw new Error('All upstream live market sources are currently unavailable');
}

interface ServerlessRequest {
  query?: Record<string, string | string[] | undefined>;
}

interface ServerlessResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ServerlessResponse;
  json: (body: unknown) => void;
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  try {
    if (req.query?.news === '1') {
      const news = await fetchLiveNewsFromUpstream();
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      res.status(200).json({ items: news, fetchedAt: Date.now() });
      return;
    }

    const snapshot = await fetchLiveRatesFromUpstream();
    const isBust = Boolean(req.query?._t || req.query?.force === '1');
    res.setHeader(
      'Cache-Control',
      isBust ? 'no-store, max-age=0' : 's-maxage=8, stale-while-revalidate=15'
    );
    res.status(200).json(snapshot);
  } catch (error) {
    res.status(503).json({
      error: 'تعذر جلب البيانات المباشرة حالياً.',
      details: error instanceof Error ? error.message : 'Upstream error',
    });
  }
}
