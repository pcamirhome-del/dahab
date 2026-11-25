import type { MarketNewsItem } from '../types/market.ts';
import { formatRelativeArabicTime, parseGoogleNewsRss } from '../utils/newsParser.ts';

const NEWS_CACHE_KEY = 'edahab_cached_market_news';

function loadCachedNews(): MarketNewsItem[] {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketNewsItem[];
    const now = Date.now();
    return parsed.map((item) => ({
      ...item,
      relativeTimeAr: formatRelativeArabicTime(item.pubDateMs, now),
    }));
  } catch {
    return [];
  }
}

function saveCachedNews(items: MarketNewsItem[]): void {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }
}

export async function fetchLiveMarketNews(): Promise<{
  items: MarketNewsItem[];
  fromCache: boolean;
}> {
  if (typeof navigator === 'undefined' || navigator.onLine) {
    // Tier 1: Server proxy
    try {
      const res = await fetch('/api/live-rates?news=1', {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as { items?: MarketNewsItem[] };
        if (Array.isArray(data.items) && data.items.length > 0) {
          saveCachedNews(data.items);
          return { items: data.items, fromCache: false };
        }
      }
    } catch {
      // Try CORS proxy fallback
    }

    // Tier 2: AllOrigins CORS proxy for Google News Arabic RSS
    try {
      const query = encodeURIComponent('أسعار الذهب في مصر OR سعر الدولار في مصر');
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=ar&gl=EG&ceid=EG:ar`;
      const res = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const wrapper = (await res.json()) as { contents?: string };
        if (wrapper.contents) {
          const parsed = parseGoogleNewsRss(wrapper.contents, 20);
          if (parsed.length > 0) {
            saveCachedNews(parsed);
            return { items: parsed, fromCache: false };
          }
        }
      }
    } catch {
      // Fall back to local cache
    }
  }

  const cached = loadCachedNews();
  if (cached.length > 0) {
    return { items: cached, fromCache: true };
  }

  throw new Error('تعذر جلب أخبار السوق المباشرة حالياً.');
}
