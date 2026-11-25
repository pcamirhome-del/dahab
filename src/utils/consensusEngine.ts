import type { CurrencyRateItem, MarketDataSnapshot, SilverRates } from '../types/market.ts';

function toPositiveNumber(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.]/g, '');
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function formatTime12hAr(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

export function computeSilverFromOunce(
  silverOunceUsd: number | null | undefined,
  saghaUsd: number
): SilverRates | undefined {
  if (
    !silverOunceUsd ||
    !Number.isFinite(silverOunceUsd) ||
    silverOunceUsd <= 5 ||
    silverOunceUsd >= 500 ||
    !Number.isFinite(saghaUsd) ||
    saghaUsd <= 0
  ) {
    return undefined;
  }

  const ozEgpSell = Number((silverOunceUsd * saghaUsd).toFixed(2));
  const ozEgpBuy = Number((ozEgpSell * 0.96).toFixed(2));
  const gram999Sell = Number((ozEgpSell / 31.1034768).toFixed(2));
  const gram999Buy = Number((gram999Sell * 0.95).toFixed(2));

  return {
    ozUsd: Number(silverOunceUsd.toFixed(2)),
    ozEgpSell,
    ozEgpBuy,
    gram999: { sell: gram999Sell, buy: gram999Buy },
    gram925: {
      sell: Number((gram999Sell * 0.925).toFixed(2)),
      buy: Number((gram999Buy * 0.925).toFixed(2)),
    },
    gram800: {
      sell: Number((gram999Sell * 0.8).toFixed(2)),
      buy: Number((gram999Buy * 0.8).toFixed(2)),
    },
  };
}

/**
 * Sanity & Outlier Guard: Ensures malformed upstream HTML never corrupts valid UI/cache state.
 */
export function validateMarketSnapshot(snapshot: MarketDataSnapshot | null): boolean {
  if (!snapshot || !snapshot.gold) return false;
  const { karat24, karat21, karat18, karat14, goldPound, ounceUsd } = snapshot.gold;

  const checkSpread = (sell: number, buy: number): boolean => {
    if (!Number.isFinite(sell) || !Number.isFinite(buy)) return false;
    if (sell <= 0 || buy <= 0) return false;
    if (buy > sell * 1.01) return false;
    const spreadRatio = (sell - buy) / sell;
    return spreadRatio >= -0.01 && spreadRatio <= 0.08;
  };

  if (
    !checkSpread(karat24.sell, karat24.buy) ||
    !checkSpread(karat21.sell, karat21.buy) ||
    !checkSpread(karat18.sell, karat18.buy) ||
    !checkSpread(karat14.sell, karat14.buy)
  ) {
    return false;
  }

  // Purity hierarchy guard: 24K > 21K > 18K > 14K > 3000
  if (
    !(
      karat24.sell > karat21.sell &&
      karat21.sell > karat18.sell &&
      karat18.sell > karat14.sell &&
      karat14.sell > 2000
    )
  ) {
    return false;
  }

  // Global ounce & Gold pound realistic bounds
  if (!Number.isFinite(ounceUsd) || ounceUsd < 500 || ounceUsd > 15000) return false;
  if (!Number.isFinite(goldPound.sell) || goldPound.sell < karat21.sell * 7.5) return false;
  if (!Number.isFinite(snapshot.saghaUsd) || snapshot.saghaUsd < 10 || snapshot.saghaUsd > 500) {
    return false;
  }
  if (!Array.isArray(snapshot.currencies) || snapshot.currencies.length === 0) return false;

  return true;
}

function buildCurrencyList(
  parsedRates: Partial<Record<CurrencyRateItem['code'], number>>,
  erRatesFromEgp: Record<string, number> | null,
  saghaUsd: number
): CurrencyRateItem[] {
  const officialUsd =
    parsedRates.USD ??
    (erRatesFromEgp?.USD ? Number((1 / erRatesFromEgp.USD).toFixed(2)) : null);

  if (!officialUsd || officialUsd <= 0) {
    return [];
  }

  const saghaFactor = saghaUsd > 0 ? saghaUsd / officialUsd : 1;

  const definitions: Array<{
    code: CurrencyRateItem['code'];
    nameAr: string;
    flag: string;
  }> = [
    { code: 'USD', nameAr: 'الدولار الأمريكي', flag: '🇺🇸' },
    { code: 'EUR', nameAr: 'اليورو الأوروبي', flag: '🇪🇺' },
    { code: 'SAR', nameAr: 'الريال السعودي', flag: '🇸🇦' },
    { code: 'AED', nameAr: 'الدرهم الإماراتي', flag: '🇦🇪' },
    { code: 'KWD', nameAr: 'الدينار الكويتي', flag: '🇰🇼' },
    { code: 'GBP', nameAr: 'الجنيه الإسترليني', flag: '🇬🇧' },
    { code: 'QAR', nameAr: 'الريال القطري', flag: '🇶🇦' },
  ];

  const items: CurrencyRateItem[] = [];

  for (const def of definitions) {
    let sell = parsedRates[def.code] ?? null;
    if (!sell && erRatesFromEgp && erRatesFromEgp[def.code] > 0) {
      sell = Number((1 / erRatesFromEgp[def.code]).toFixed(2));
    }
    if (!sell || sell <= 0) continue;

    const buy = Number((sell * 0.9982).toFixed(2));
    const saghaSell = Number((sell * saghaFactor).toFixed(2));
    const saghaBuy = Number((saghaSell * 0.994).toFixed(2));

    items.push({
      code: def.code,
      nameAr: def.nameAr,
      flag: def.flag,
      officialSell: Number(sell.toFixed(2)),
      officialBuy: buy,
      saghaSell,
      saghaBuy,
    });
  }

  return items;
}

export function parseEdahabConsensus(
  html: string,
  erRatesFromEgp: Record<string, number> | null,
  fetchedAt = Date.now(),
  silverOunceUsd?: number | null
): MarketDataSnapshot | null {
  if (!html || html.length < 400) return null;

  const extractDomKarat = (karat: string): { sell: number; buy: number } | null => {
    const blockRegex = new RegExp(
      `الذهب\\s+عيار\\s+${karat}[\\s\\S]{0,500}?بيع:\\s*<span[^>]*>([\\d.,]+)<\\/span>[\\s\\S]{0,250}?شراء:\\s*<span[^>]*>([\\d.,]+)<\\/span>`,
      'i'
    );
    const match = html.match(blockRegex);
    if (!match) return null;
    const sell = toPositiveNumber(match[1]);
    const buy = toPositiveNumber(match[2]);
    return sell && buy ? { sell, buy } : null;
  };

  const livewire24Match = html.match(/price24(?:&quot;|"):\s*([\d.]+)/i);
  const livewirePrice24 = toPositiveNumber(livewire24Match?.[1]);

  const ld24Match = html.match(/سعر الذهب عيار 24 بيع[\s\S]{0,120}?"value":\s*"([\d.]+)/i);
  const ld21Match = html.match(/سعر الذهب عيار 21 بيع[\s\S]{0,120}?"value":\s*"([\d.]+)/i);
  const ldUsdMatch = html.match(/سعر الدولار مقابل الجنيه[\s\S]{0,120}?"value":\s*"([\d.]+)/i);

  const extractProximityKarat = (karat: string): { sell: number; buy: number } | null => {
    const regex = new RegExp(`عيار\\s*${karat}([\\s\\S]{0,350})`, 'i');
    const m = html.match(regex);
    if (!m) return null;
    const plain = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const nums = [...plain.matchAll(/\b([2-9]\d{3}|1\d{4})\b/g)]
      .map((x) => Number.parseFloat(x[1]))
      .filter((n) => Number.isFinite(n) && n > 1000);
    if (nums.length >= 2) {
      return { sell: Math.max(nums[0], nums[1]), buy: Math.min(nums[0], nums[1]) };
    }
    return null;
  };

  let k24 = extractDomKarat('24') ?? extractProximityKarat('24');
  let k21 = extractDomKarat('21') ?? extractProximityKarat('21');
  let k18 = extractDomKarat('18') ?? extractProximityKarat('18');
  let k14 = extractDomKarat('14') ?? extractProximityKarat('14');

  if (!k24 && (livewirePrice24 || ld24Match?.[1])) {
    const sell = livewirePrice24 ?? toPositiveNumber(ld24Match?.[1]);
    if (sell) k24 = { sell, buy: Math.round(sell * 0.9946) };
  }
  if (!k21 && (ld21Match?.[1] || k24)) {
    const sell = toPositiveNumber(ld21Match?.[1]) ?? (k24 ? Math.round((k24.sell * 21) / 24) : null);
    if (sell) k21 = { sell, buy: Math.round(sell * 0.9945) };
  }
  if (!k18 && k21) {
    k18 = {
      sell: Math.round((k21.sell * 18) / 21),
      buy: Math.round((k21.buy * 18) / 21),
    };
  }
  if (!k14 && k21) {
    k14 = {
      sell: Math.round((k21.sell * 14) / 21),
      buy: Math.round((k21.buy * 14) / 21),
    };
  }

  if (!k24 || !k21 || !k18 || !k14) {
    return null;
  }

  const poundMatch = html.match(
    /سعر\s+الجنيه\s+الذهب[\s\S]{0,250}?<span[^>]*class="number-font"[^>]*>([\d.,]+)<\/span>/i
  );
  const poundSell = toPositiveNumber(poundMatch?.[1]) ?? Math.round(k21.sell * 8);
  const poundBuy = Math.round(k21.buy * 8);

  const ounceMatch = html.match(
    /سعر\s+الأوقية\s+عالمياً[\s\S]{0,250}?<span[^>]*class="number-font"[^>]*>([\d.,]+)<\/span>/i
  );
  const ounceUsd = toPositiveNumber(ounceMatch?.[1]);
  if (!ounceUsd) return null;

  const extractCurrency = (arabicLabel: string): number | undefined => {
    const regex = new RegExp(
      `${arabicLabel}[\\s\\S]{0,220}?<span[^>]*class="number-font"[^>]*>([\\d.,]+)<\\/span>`,
      'i'
    );
    const m = html.match(regex);
    return toPositiveNumber(m?.[1]) ?? undefined;
  };

  const parsedRates: Partial<Record<CurrencyRateItem['code'], number>> = {
    USD: extractCurrency('الدولار الأمريكي') ?? toPositiveNumber(ldUsdMatch?.[1]) ?? undefined,
    EUR: extractCurrency('اليورو'),
    SAR: extractCurrency('الريال السعودي'),
    AED: extractCurrency('الدرهم الإماراتي'),
    GBP: extractCurrency('الجنيه الإسترليني'),
    KWD: extractCurrency('الدينار الكويتي'),
    QAR: extractCurrency('الريال القطري'),
  };

  const saghaUsd = Number(((k24.sell * 31.1034768) / ounceUsd).toFixed(2));
  const ounceEgpSell = Math.round(k24.sell * 31.1034768);
  const ounceEgpBuy = Math.round(k24.buy * 31.1034768);

  const currencies = buildCurrencyList(parsedRates, erRatesFromEgp, saghaUsd);
  const silver = computeSilverFromOunce(silverOunceUsd, saghaUsd);

  const candidate: MarketDataSnapshot = {
    gold: {
      karat24: {
        karat: '24',
        label: 'ذهب عيار 24',
        purity: 'نقاء 99.9%',
        sell: k24.sell,
        buy: k24.buy,
      },
      karat21: {
        karat: '21',
        label: 'ذهب عيار 21',
        purity: 'نقاء 87.5%',
        sell: k21.sell,
        buy: k21.buy,
      },
      karat18: {
        karat: '18',
        label: 'ذهب عيار 18',
        purity: 'نقاء 75.0%',
        sell: k18.sell,
        buy: k18.buy,
      },
      karat14: {
        karat: '14',
        label: 'ذهب عيار 14',
        purity: 'نقاء 58.3%',
        sell: k14.sell,
        buy: k14.buy,
      },
      goldPound: {
        sell: poundSell,
        buy: poundBuy,
      },
      ounceUsd,
      ounceEgpSell,
      ounceEgpBuy,
    },
    silver,
    saghaUsd,
    currencies,
    source: 'eDahab (edahabapp.com)',
    sourceUrl: 'https://edahabapp.com/',
    isFallback: false,
    fetchedAt,
    lastUpdatedFormatted: formatTime12hAr(fetchedAt),
  };

  return validateMarketSnapshot(candidate) ? candidate : null;
}

export function parseFallbackEgyptGoldConsensus(
  html: string,
  ounceUsd: number,
  erRatesFromEgp: Record<string, number>,
  fetchedAt = Date.now(),
  silverOunceUsd?: number | null
): MarketDataSnapshot | null {
  if (!html || !ounceUsd || !erRatesFromEgp) return null;

  const extractFallbackKarat = (karat: string): { sell: number; buy: number } | null => {
    const regex = new RegExp(
      `عيار\\s*${karat}[\\s\\S]{0,600}?([3-9][\\d,]{3}|[1-9][\\d,]{4})[\\s\\S]{0,250}?([3-9][\\d,]{3}|[1-9][\\d,]{4})`,
      'i'
    );
    const m = html.match(regex);
    if (m) {
      const a = toPositiveNumber(m[1]);
      const b = toPositiveNumber(m[2]);
      if (a && b) {
        return { sell: Math.max(a, b), buy: Math.min(a, b) };
      }
    }
    return null;
  };

  const ld21Match = html.match(/عيار\s*21[\s\S]{0,200}?"price":"([\d.]+)"/);
  const k21 =
    extractFallbackKarat('21') ??
    (ld21Match?.[1]
      ? (() => {
          const sell = Number(ld21Match[1]);
          return { sell, buy: Math.round(sell * 0.9945) };
        })()
      : null);

  if (!k21) return null;

  const k24 = extractFallbackKarat('24') ?? {
    sell: Math.round((k21.sell * 24) / 21),
    buy: Math.round((k21.buy * 24) / 21),
  };
  const k18 = extractFallbackKarat('18') ?? {
    sell: Math.round((k21.sell * 18) / 21),
    buy: Math.round((k21.buy * 18) / 21),
  };
  const k14 = extractFallbackKarat('14') ?? {
    sell: Math.round((k21.sell * 14) / 21),
    buy: Math.round((k21.buy * 14) / 21),
  };

  const saghaUsd = Number(((k24.sell * 31.1034768) / ounceUsd).toFixed(2));
  const currencies = buildCurrencyList({}, erRatesFromEgp, saghaUsd);
  const silver = computeSilverFromOunce(silverOunceUsd, saghaUsd);

  const candidate: MarketDataSnapshot = {
    gold: {
      karat24: { karat: '24', label: 'ذهب عيار 24', purity: 'نقاء 99.9%', ...k24 },
      karat21: { karat: '21', label: 'ذهب عيار 21', purity: 'نقاء 87.5%', ...k21 },
      karat18: { karat: '18', label: 'ذهب عيار 18', purity: 'نقاء 75.0%', ...k18 },
      karat14: { karat: '14', label: 'ذهب عيار 14', purity: 'نقاء 58.3%', ...k14 },
      goldPound: {
        sell: Math.round(k21.sell * 8),
        buy: Math.round(k21.buy * 8),
      },
      ounceUsd: Number(ounceUsd.toFixed(2)),
      ounceEgpSell: Math.round(k24.sell * 31.1034768),
      ounceEgpBuy: Math.round(k24.buy * 31.1034768),
    },
    silver,
    saghaUsd,
    currencies,
    source: 'مصدر احتياطي مباشر (Gold-Price-Today & ER-API)',
    sourceUrl: 'https://egypt.gold-price-today.com/',
    isFallback: true,
    fetchedAt,
    lastUpdatedFormatted: formatTime12hAr(fetchedAt),
  };

  return validateMarketSnapshot(candidate) ? candidate : null;
}
