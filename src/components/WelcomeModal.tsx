import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue, formatDateTimeYmdHms } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { EdahabLogo } from './EdahabLogo.tsx';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketData: MarketDataSnapshot | null;
  isSyncing: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  marketData,
  isSyncing,
}) => {
  if (!isOpen) return null;

  const usdOfficial = marketData?.currencies.find((c) => c.code === 'USD')?.officialSell;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="مرحباً بك في eDahab - ملخص الأسعار اللحظية"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="relative w-full max-w-md rounded-2xl border border-[#DFC798] bg-[#1E1E1E] p-5 sm:p-6 shadow-[0_0_45px_rgba(223,199,152,0.22)] text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Left Close Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            onClose();
          }}
          aria-label="إغلاق النافذة الترحيبية"
          className="absolute top-4 left-4 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798] hover:bg-[#3A352F] transition focus-visible:outline-2 focus-visible:outline-[#DFC798]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Greeting */}
        <div className="flex flex-col items-center text-center pt-1 pb-4">
          <EdahabLogo size={54} variant="dark" className="mb-2.5" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#DFC798]">
            مرحباً بك في eDahab
          </h2>
          <p className="text-xs sm:text-sm text-[#BDBDBD] mt-1">
            ملخص الأسعار اللحظية في مصر الآن
          </p>
        </div>

        {/* Live Price Summary Cards */}
        <div className="space-y-3">
          {/* Card 1: 24K Gold Live Sell & Buy */}
          <div className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#DFC798]">سعر الذهب عيار 24 الآن</span>
              <span className="text-[11px] text-[#9E9E9E]">جنيه مصري / جرام</span>
            </div>

            {marketData ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] px-3 py-2.5 text-center">
                  <span className="block text-xs text-[#BDBDBD] mb-0.5">بيع</span>
                  <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
                    {formatCurrencyValue(marketData.gold.karat24.sell)}
                  </span>
                  <span className="block text-[11px] text-[#DFC798] font-semibold mt-0.5">
                    جنيه مصري
                  </span>
                </div>

                <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] px-3 py-2.5 text-center">
                  <span className="block text-xs text-[#BDBDBD] mb-0.5">شراء</span>
                  <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
                    {formatCurrencyValue(marketData.gold.karat24.buy)}
                  </span>
                  <span className="block text-[11px] text-[#DFC798] font-semibold mt-0.5">
                    جنيه مصري
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-lg bg-[#1E1E1E] animate-pulse" />
                <div className="h-16 rounded-lg bg-[#1E1E1E] animate-pulse" />
              </div>
            )}
          </div>

          {/* Card 2: USD vs EGP (Official Bank & Sagha USD) */}
          <div className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#DFC798]">
                سعر الدولار مقابل الجنيه المصري
              </span>
              <span className="text-[11px] text-[#9E9E9E]">USD / EGP</span>
            </div>

            {marketData ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] px-3 py-2.5 text-center">
                  <span className="block text-xs text-[#BDBDBD] mb-0.5">الدولار الرسمي</span>
                  <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
                    {usdOfficial ? formatCurrencyValue(usdOfficial, 2) : '—'}
                  </span>
                  <span className="block text-[11px] text-[#DFC798] font-semibold mt-0.5">
                    جنيه مصري
                  </span>
                </div>

                <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] px-3 py-2.5 text-center">
                  <span className="block text-xs text-[#BDBDBD] mb-0.5">دولار الصاغة</span>
                  <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
                    {formatCurrencyValue(marketData.saghaUsd, 2)}
                  </span>
                  <span className="block text-[11px] text-[#DFC798] font-semibold mt-0.5">
                    جنيه مصري
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-lg bg-[#1E1E1E] animate-pulse" />
                <div className="h-16 rounded-lg bg-[#1E1E1E] animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Footer Live Sync Status + Continue CTA */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-[#BDBDBD]">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>تحديث لحظي الآن</span>
            {isSyncing && <RefreshCw className="h-3.5 w-3.5 text-[#DFC798] animate-spin" />}
            {marketData && (
              <span className="font-mono-num text-[#DFC798]">
                · {formatDateTimeYmdHms(marketData.fetchedAt)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onClose();
            }}
            className="w-full min-h-[46px] rounded-xl bg-[#DFC798] hover:bg-[#C8A96A] text-[#1A1A1A] text-sm font-extrabold transition active:scale-[0.99]"
          >
            متابعة إلى التطبيق
          </button>
        </div>
      </div>
    </div>
  );
};
