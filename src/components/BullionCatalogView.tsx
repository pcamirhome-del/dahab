import React, { useMemo, useState } from 'react';
import { Coins, Scale } from 'lucide-react';
import type { BullionBrandId, MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface BullionCatalogViewProps {
  data: MarketDataSnapshot;
}

interface BrandSchedule {
  id: BullionBrandId;
  name: string;
  barWorkmanshipPerGram: Record<number, number>;
  barCashbackPerGram: Record<number, number>;
  coinWorkmanshipPerGram: number;
  coinCashbackPerGram: number;
}

const BULLION_BRANDS: BrandSchedule[] = [
  {
    id: 'btc',
    name: 'BTC',
    barWorkmanshipPerGram: { 1: 175, 2.5: 105, 5: 72, 10: 66, 20: 62, 31.1: 58, 50: 54, 100: 50 },
    barCashbackPerGram: { 1: 27, 2.5: 27, 5: 27, 10: 27, 20: 27, 31.1: 27, 50: 27, 100: 27 },
    coinWorkmanshipPerGram: 54,
    coinCashbackPerGram: 22,
  },
  {
    id: 'swiss',
    name: 'سويس جولد',
    barWorkmanshipPerGram: { 1: 185, 2.5: 112, 5: 76, 10: 68, 20: 64, 31.1: 60, 50: 56, 100: 52 },
    barCashbackPerGram: { 1: 28, 2.5: 28, 5: 28, 10: 28, 20: 28, 31.1: 28, 50: 28, 100: 28 },
    coinWorkmanshipPerGram: 56,
    coinCashbackPerGram: 22,
  },
  {
    id: 'malaz',
    name: 'ملاذ Malaz',
    barWorkmanshipPerGram: { 1: 165, 2.5: 98, 5: 68, 10: 62, 20: 58, 31.1: 55, 50: 50, 100: 47 },
    barCashbackPerGram: { 1: 25, 2.5: 25, 5: 25, 10: 25, 20: 25, 31.1: 25, 50: 25, 100: 25 },
    coinWorkmanshipPerGram: 50,
    coinCashbackPerGram: 20,
  },
  {
    id: 'selema',
    name: 'سليمة جولد',
    barWorkmanshipPerGram: { 1: 170, 2.5: 100, 5: 70, 10: 64, 20: 60, 31.1: 56, 50: 52, 100: 48 },
    barCashbackPerGram: { 1: 26, 2.5: 26, 5: 26, 10: 26, 20: 26, 31.1: 26, 50: 26, 100: 26 },
    coinWorkmanshipPerGram: 52,
    coinCashbackPerGram: 21,
  },
];

export const BullionCatalogView: React.FC<BullionCatalogViewProps> = ({ data }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<BullionBrandId>('btc');
  const { gold } = data;
  const bullionWeights = [1, 2.5, 5, 10, 20, 31.1, 50, 100];

  const activeBrand = useMemo(
    () => BULLION_BRANDS.find((b) => b.id === selectedBrandId) ?? BULLION_BRANDS[0],
    [selectedBrandId]
  );

  const coins = [
    { name: 'ربع جنيه ذهب', grams: 2 },
    { name: 'نصف جنيه ذهب', grams: 4 },
    { name: 'جنيه ذهب كامل', grams: 8 },
  ];

  return (
    <div className="space-y-4">
      {/* Brand Selector (Max 4 buttons per row) */}
      <div>
        <span className="block text-xs font-bold text-[#DFC798] mb-2">
          الشركة المصنعة للسبائك والعملات المغلفة:
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {BULLION_BRANDS.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setSelectedBrandId(brand.id);
              }}
              className={`min-h-[42px] rounded-xl border px-1.5 py-1.5 text-[10px] sm:text-xs font-bold leading-tight break-words transition ${
                selectedBrandId === brand.id
                  ? 'border-[#DFC798] bg-[#DFC798] text-[#1A1A1A]'
                  : 'border-[#2E2E2E] bg-[#141414] text-[#E5E5E5] hover:border-[#DFC798]/50'
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>

      {/* Gold Bars Grid */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-[#DFC798] flex items-center gap-1.5">
            <Scale className="h-4 w-4" />
            سبائك {activeBrand.name} عيار 24 (نقاء 999.9)
          </span>
          <span className="text-[11px] text-[#9E9E9E]">
            الاسترداد عند البيع بالغلاف الأصلي سليم
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {bullionWeights.map((weight) => {
            const rawSell = Math.round(gold.karat24.sell * weight);
            const workFee = Math.round((activeBrand.barWorkmanshipPerGram[weight] ?? 60) * weight);
            const totalWithWork = rawSell + workFee;
            const cashbackAmount = Math.round(
              (activeBrand.barCashbackPerGram[weight] ?? 25) * weight
            );
            const buybackValue = Math.round(gold.karat24.buy * weight + cashbackAmount);

            return (
              <div
                key={weight}
                className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1.5">
                  <span className="text-xs font-extrabold text-[#DFC798]">سبيكة {weight} جم</span>
                  <span className="text-[11px] font-mono-num text-[#9E9E9E]">
                    مصنعية: {activeBrand.barWorkmanshipPerGram[weight]} ج.م/جم
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9E9E]">سعر الذهب الخام</span>
                  <span className="font-mono-num font-semibold text-[#E5E5E5]">
                    {formatCurrencyValue(rawSell)} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9E9E]">شامل المصنعية</span>
                  <span className="font-mono-num font-extrabold text-white">
                    {formatCurrencyValue(totalWithWork)} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2E2E2E]">
                  <span className="text-emerald-400 font-semibold">قيمة الاسترداد</span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {formatCurrencyValue(buybackValue)} ج.م
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coins */}
      <div className="pt-3 border-t border-[#2E2E2E]">
        <div className="text-xs font-bold text-[#DFC798] flex items-center gap-1.5 mb-2.5">
          <Coins className="h-4 w-4" />
          <span>العملات الذهبية المغلفة ({activeBrand.name} — عيار 21)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {coins.map((coin) => {
            const rawSell = Math.round(gold.karat21.sell * coin.grams);
            const totalWithWork =
              rawSell + Math.round(activeBrand.coinWorkmanshipPerGram * coin.grams);
            const buybackValue = Math.round(
              gold.karat21.buy * coin.grams + activeBrand.coinCashbackPerGram * coin.grams
            );
            return (
              <div
                key={coin.name}
                className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between border-b border-[#2E2E2E] pb-1.5">
                  <span className="text-sm font-bold text-white">{coin.name}</span>
                  <span className="text-[11px] text-[#9E9E9E]">{coin.grams} جم عيار 21</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9E9E]">السعر الخام</span>
                  <span className="font-mono-num font-semibold text-[#E5E5E5]">
                    {formatCurrencyValue(rawSell)} ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9E9E]">شامل المصنعية</span>
                  <span className="font-mono-num font-extrabold text-[#DFC798]">
                    {formatCurrencyValue(totalWithWork)} ج.م
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2E2E2E]">
                  <span className="text-emerald-400 font-semibold">قيمة الاسترداد</span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {formatCurrencyValue(buybackValue)} ج.م
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
