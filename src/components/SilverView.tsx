import React from 'react';
import { RefreshCw, Scale } from 'lucide-react';
import type { MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue, formatUsd } from '../utils/formatters.ts';

interface SilverViewProps {
  data: MarketDataSnapshot;
  onRefresh: () => void;
  isSyncing: boolean;
}

export const SilverView: React.FC<SilverViewProps> = ({ data, onRefresh, isSyncing }) => {
  const silver = data.silver;

  if (!silver) {
    return (
      <section className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-6 text-center space-y-3">
        <p className="text-sm font-bold text-[#DFC798]">
          تعذر استلام سعر أوقية الفضة العالمية (XAG) حالياً
        </p>
        <p className="text-xs text-[#9E9E9E]">
          اضغط للتحديث الفوري لجلب السعر المباشر من البورصة العالمية.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isSyncing}
          className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-[#DFC798] px-4 py-2 text-xs font-extrabold text-[#1A1A1A]"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>تحديث أسعار الفضة</span>
        </button>
      </section>
    );
  }

  const bullionWeights = [10, 31.1, 50, 100, 250, 1000];

  return (
    <div className="space-y-3.5">
      {/* Main Silver 999 Hero Card */}
      <section className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-[#DFC798]">الفضة النقية عيار 999</h2>
          <span className="text-xs text-[#BDBDBD] font-mono-num">نقاء 99.9%</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2E2E2E]">
          <div>
            <span className="block text-xs text-[#BDBDBD] mb-1">سعر البيع</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-num text-2xl sm:text-[26px] font-extrabold text-white">
                {formatCurrencyValue(silver.gram999.sell, 2)}
              </span>
              <span className="text-xs font-semibold text-[#DFC798]">جنيه</span>
            </div>
          </div>

          <div>
            <span className="block text-xs text-[#BDBDBD] mb-1">سعر الشراء</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-num text-2xl sm:text-[26px] font-extrabold text-white">
                {formatCurrencyValue(silver.gram999.buy, 2)}
              </span>
              <span className="text-xs font-semibold text-[#DFC798]">جنيه</span>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Silver Karats 3-Column Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'عيار 999', sell: silver.gram999.sell, buy: silver.gram999.buy },
          { label: 'عيار 925', sell: silver.gram925.sell, buy: silver.gram925.buy },
          { label: 'عيار 800', sell: silver.gram800.sell, buy: silver.gram800.buy },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-2.5 sm:p-3.5 space-y-2"
          >
            <div className="text-center text-sm font-extrabold text-[#DFC798]">{item.label}</div>
            <div className="flex items-center justify-between text-xs gap-1">
              <span className="text-[#9E9E9E]">بيع</span>
              <span className="font-mono-num font-bold text-white">
                {formatCurrencyValue(item.sell, 1)} ج
              </span>
            </div>
            <div className="flex items-center justify-between text-xs gap-1">
              <span className="text-[#9E9E9E]">شراء</span>
              <span className="font-mono-num font-bold text-white">
                {formatCurrencyValue(item.buy, 1)} ج
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Silver Ounce Split Row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3.5 py-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#DFC798]">الأونصة محلياً</span>
          <span className="font-mono-num text-sm sm:text-base font-extrabold text-white">
            {formatCurrencyValue(silver.ozEgpSell, 0)} جنيه
          </span>
        </div>

        <div className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3.5 py-3 flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#DFC798]">أوقية الفضة</span>
          <span className="font-mono-num text-sm sm:text-base font-extrabold text-white">
            {formatUsd(silver.ozUsd, 2)}
          </span>
        </div>
      </div>

      {/* Silver Bullion Bars */}
      <section className="rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#DFC798] flex items-center gap-1.5">
            <Scale className="h-4 w-4" />
            <span>سبائك الفضة الاستثمارية (عيار 999)</span>
          </h3>
          <span className="text-[11px] text-[#9E9E9E]">السعر الخام بدون مصنعية</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {bullionWeights.map((w) => (
            <div
              key={w}
              className="rounded-lg border border-[#2E2E2E] bg-[#141414] px-3 py-2.5 flex items-center justify-between"
            >
              <span className="text-xs font-bold text-[#DFC798]">
                {w === 1000 ? '1 كيلوجرام' : `${w} جرام`}
              </span>
              <span className="font-mono-num text-xs sm:text-sm font-bold text-white">
                {formatCurrencyValue(Math.round(silver.gram999.sell * w))} ج.م
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
