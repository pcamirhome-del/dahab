import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Building2, Coins, TrendingDown, TrendingUp } from 'lucide-react';
import type { CurrencyRateItem, MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';

interface CurrencyTabProps {
  data: MarketDataSnapshot;
}

export const CurrencyTab: React.FC<CurrencyTabProps> = ({ data }) => {
  const [marketMode, setMarketMode] = useState<'bank' | 'sagha'>('bank');
  const [amountInput, setAmountInput] = useState<string>('100');
  const [selectedCode, setSelectedCode] = useState<CurrencyRateItem['code']>('USD');
  const [toEgp, setToEgp] = useState<boolean>(true);

  const selectedCurrency = useMemo(
    () => data.currencies.find((c) => c.code === selectedCode) ?? data.currencies[0],
    [data.currencies, selectedCode]
  );

  const conversionResult = useMemo(() => {
    const amount = Number.parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0 || !selectedCurrency) {
      return 0;
    }
    const rate =
      marketMode === 'bank' ? selectedCurrency.officialSell : selectedCurrency.saghaSell;
    return toEgp ? amount * rate : amount / rate;
  }, [amountInput, selectedCurrency, marketMode, toEgp]);

  return (
    <div className="space-y-4">
      {/* Market Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#DFC798]">
            أسعار العملات مقابل الجنيه المصري
          </h2>
          <p className="text-xs text-[#BDBDBD]">
            دولار الصاغة المحسوب الآن:{' '}
            <span className="font-mono-num font-bold text-[#DFC798]">
              {formatCurrencyValue(data.saghaUsd, 2)} ج.م
            </span>
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#141414] border border-[#2E2E2E]"
          role="tablist"
          aria-label="نوع سعر الصرف"
        >
          <button
            type="button"
            role="tab"
            aria-selected={marketMode === 'bank'}
            onClick={() => setMarketMode('bank')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              marketMode === 'bank'
                ? 'bg-[#DFC798] text-[#1A1A1A]'
                : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>أسعار البنوك</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={marketMode === 'sagha'}
            onClick={() => setMarketMode('sagha')}
            className={`min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              marketMode === 'sagha'
                ? 'bg-[#DFC798] text-[#1A1A1A]'
                : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            <Coins className="h-3.5 w-3.5 shrink-0" />
            <span>سعر الصاغة</span>
          </button>
        </div>
      </div>

      {/* Quick Currency Converter Widget */}
      <section
        aria-label="محول العملات السريع"
        className="rounded-xl bg-[#1E1E1E] border border-[#2E2E2E] p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#DFC798]">
            محول العملات الفوري ({marketMode === 'bank' ? 'السعر الرسمي' : 'تسعير الصاغة'})
          </h3>
          <button
            type="button"
            onClick={() => setToEgp((prev) => !prev)}
            className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-[#DFC798]/40 px-2.5 py-1 text-xs font-semibold text-[#DFC798] hover:bg-[#DFC798]/10 transition"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>{toEgp ? 'من العملة إلى ج.م' : 'من ج.م إلى العملة'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label
              htmlFor="currency-amount-input"
              className="block text-xs font-medium text-[#BDBDBD] mb-1.5"
            >
              المبلغ ({toEgp ? selectedCurrency?.code : 'EGP'})
            </label>
            <input
              id="currency-amount-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#141414] px-3.5 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
              placeholder="100"
            />
          </div>

          <div>
            <label
              htmlFor="currency-code-select"
              className="block text-xs font-medium text-[#BDBDBD] mb-1.5"
            >
              العملة
            </label>
            <select
              id="currency-code-select"
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value as CurrencyRateItem['code'])}
              className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#141414] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
            >
              {data.currencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.flag} {curr.nameAr} ({curr.code})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-[#141414] border border-[#DFC798]/40 px-4 py-2.5 min-h-[44px] flex flex-col justify-center">
            <span className="text-[11px] text-[#9E9E9E]">
              القيمة المعادلة ({toEgp ? 'جنيه مصري' : selectedCurrency?.nameAr})
            </span>
            <span className="font-mono-num text-lg font-extrabold text-[#DFC798]">
              {formatCurrencyValue(conversionResult, 2)}{' '}
              <span className="text-xs font-bold">{toEgp ? 'ج.م' : selectedCurrency?.code}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Currency Rates Table */}
      <section
        aria-label="جدول أسعار العملات"
        className="rounded-xl bg-[#1E1E1E] border border-[#2E2E2E] overflow-hidden"
      >
        <div className="grid grid-cols-12 items-center px-4 py-3 bg-[#141414] border-b border-[#2E2E2E] text-xs font-bold text-[#DFC798]">
          <div className="col-span-6 sm:col-span-5">العملة</div>
          <div className="col-span-3 text-center">شراء</div>
          <div className="col-span-3 text-center">بيع</div>
          <div className="hidden sm:block sm:col-span-1 text-left">التغير</div>
        </div>

        <div className="divide-y divide-[#2E2E2E]">
          {data.currencies.map((curr) => {
            const buyRate = marketMode === 'bank' ? curr.officialBuy : curr.saghaBuy;
            const sellRate = marketMode === 'bank' ? curr.officialSell : curr.saghaSell;
            const prev = curr.prevOfficialSell;
            const diff =
              prev && marketMode === 'bank'
                ? Number((curr.officialSell - prev).toFixed(2))
                : 0;

            return (
              <div
                key={curr.code}
                className="grid grid-cols-12 items-center px-4 py-3.5 min-h-[60px] hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                    {curr.flag}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{curr.nameAr}</div>
                    <div className="text-[11px] font-mono-num text-[#9E9E9E]">
                      {curr.code} / EGP
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-center">
                  <span className="font-mono-num text-sm sm:text-base font-semibold text-[#E5E5E5]">
                    {formatCurrencyValue(buyRate, 2)}
                  </span>
                </div>

                <div className="col-span-3 text-center">
                  <span className="font-mono-num text-sm sm:text-base font-extrabold text-[#DFC798]">
                    {formatCurrencyValue(sellRate, 2)}
                  </span>
                </div>

                <div className="hidden sm:flex sm:col-span-1 justify-end">
                  {diff !== 0 ? (
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold tabular-nums-data ${
                        diff > 0 ? 'text-emerald-400' : 'text-[#E53935]'
                      }`}
                    >
                      {diff > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  ) : (
                    <span className="text-xs text-[#666]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
