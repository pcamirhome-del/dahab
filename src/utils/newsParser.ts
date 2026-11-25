import type { MarketNewsItem } from '../types/market.ts';

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function formatRelativeArabicTime(pubDateMs: number, nowMs = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((nowMs - pubDateMs) / 1000));
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    if (diffMin === 1) return 'منذ دقيقة';
    if (diffMin === 2) return 'منذ دقيقتين';
    if (diffMin <= 10) return `منذ ${diffMin} دقائق`;
    return `منذ ${diffMin} دقيقة`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
    return `منذ ${diffHours} ساعة`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'منذ يوم';
  if (diffDays === 2) return 'منذ يومين';
  return `منذ ${diffDays} أيام`;
}

export function parseGoogleNewsRss(xml: string, maxItems = 20): MarketNewsItem[] {
  if (!xml || !xml.includes('<item>')) return [];

  const items: MarketNewsItem[] = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  const nowMs = Date.now();

  for (const match of itemMatches) {
    if (items.length >= maxItems) break;
    const block = match[1];

    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
    const linkRaw = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? '';
    const pubRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ?? '';
    const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? '';

    const fullTitle = decodeXmlEntities(titleRaw);
    if (!fullTitle || !isSafeHttpUrl(linkRaw)) continue;

    // Strip trailing " - SourceName" from Google News titles if present
    let source = decodeXmlEntities(sourceRaw);
    let cleanTitle = fullTitle;
    const lastDashIdx = fullTitle.lastIndexOf(' - ');
    if (lastDashIdx > 10) {
      if (!source) source = fullTitle.slice(lastDashIdx + 3).trim();
      cleanTitle = fullTitle.slice(0, lastDashIdx).trim();
    }
    if (!source) source = 'أخبار الاقتصاد';

    const parsedDate = Date.parse(pubRaw);
    const pubDateMs = Number.isFinite(parsedDate) ? parsedDate : nowMs;

    const isCurrency = /دولار|عملات|البنك المركزي|الجنيه المصري|صرف|فائدة/i.test(cleanTitle);

    items.push({
      id: `${pubDateMs}-${items.length}`,
      title: cleanTitle,
      link: linkRaw,
      source,
      pubDateMs,
      relativeTimeAr: formatRelativeArabicTime(pubDateMs, nowMs),
      category: isCurrency && !/ذهب|صاغة|عيار|سبائك/i.test(cleanTitle) ? 'currency' : 'gold',
    });
  }

  return items.sort((a, b) => b.pubDateMs - a.pubDateMs);
}
