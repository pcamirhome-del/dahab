import React from 'react';
import { X } from 'lucide-react';
import type { MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue, formatUsd } from '../utils/formatters.ts';

interface PriceGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MarketDataSnapshot;
}

export const PriceGapModal: React.FC<PriceGapModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const usdOfficial = data.currencies.find((c) => c.code === 'USD')?.officialSell ?? 0;
  const fair24Egp = usdOfficial > 0 ? (data.gold.ounceUsd / 31.1034768) * usdOfficial : 0;
  const gapPerGram24 = fair24Egp > 0 ? data.gold.karat24.sell - fair24Egp : 0;
  const gapUsdPerDollar = usdOfficial > 0 ? data.saghaUsd - usdOfficial : 0;
  const gapPct = fair24Egp > 0 ? (gapPerGram24 / fair24Egp) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="تفاصيل الفجوة السعرية ودولار الصاغة"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] p-5 sm:p-6 shadow-2xl space-y-4 text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-[#3A352F] rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#DFC798]">
              تحليل الفجوة السعرية ودولار الصاغة
            </h3>
            <p className="text-xs text-[#9E9E9E]">
              مقارنة تسعير الذهب المحلي في مصر بالسعر العالمي والدولار الرسمي
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798] hover:bg-[#3A352F]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#BDBDBD]">الأوقية العالمية (XAU/USD)</span>
            <span className="font-mono-num font-bold text-white">
              {formatUsd(data.gold.ounceUsd, 2)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#BDBDBD]">الدولار الرسمي (البنك)</span>
            <span className="font-mono-num font-bold text-white">
              {usdOfficial > 0 ? `${formatCurrencyValue(usdOfficial, 2)} ج.م` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#BDBDBD]">دولار الصاغة الفعلي</span>
            <span className="font-mono-num font-bold text-[#DFC798]">
              {formatCurrencyValue(data.saghaUsd, 2)} ج.م
            </span>
          </div>

          <div className="border-t border-[#2E2E2E] pt-2.5 flex items-center justify-between">
            <span className="text-[#BDBDBD]">السعر العادل لعيار 24 عالمياً</span>
            <span className="font-mono-num font-bold text-white">
              {fair24Egp > 0 ? `${formatCurrencyValue(fair24Egp, 2)} ج.م` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#BDBDBD]">سعر عيار 24 المحلي (بيع)</span>
            <span className="font-mono-num font-bold text-[#DFC798]">
              {formatCurrencyValue(data.gold.karat24.sell)} ج.م
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#DFC798]/35 bg-[#141414] p-4 flex items-center justify-between">
          <div>
            <span className="block text-xs text-[#BDBDBD]">الفجوة السعرية للجرام (عيار 24)</span>
            <span className="block text-[11px] text-[#9E9E9E] mt-0.5 font-mono-num">
              فرق الدولار: {gapUsdPerDollar >= 0 ? '+' : ''}
              {formatCurrencyValue(gapUsdPerDollar, 2)} ج.م ({gapPct >= 0 ? '+' : ''}
              {gapPct.toFixed(2)}%)
            </span>
          </div>
          <span
            className={`font-mono-num text-2xl font-extrabold ${
              gapPerGram24 >= 0 ? 'text-[#E53935]' : 'text-emerald-400'
            }`}
          >
            {gapPerGram24 >= 0 ? '+' : ''}
            {formatCurrencyValue(gapPerGram24, 2)}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-[#DFC798] hover:bg-[#C8A96A] text-[#1A1A1A] text-sm font-extrabold transition"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
