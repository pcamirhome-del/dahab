import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Calculator, Scale, ShieldCheck, TrendingUp } from 'lucide-react';
import type { KaratKey, MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

export type CalcMode = 'workmanship' | 'zakat' | 'purity' | 'compare';
type CalcKaratOption = '24' | '21' | '18' | 'pound';

interface GoldCalculatorProps {
  data: MarketDataSnapshot;
  initialMode?: CalcMode;
}

const FINENESS_MAP: Record<KaratKey, { ratio: number; label: string; perMil: string }> = {
  '24': { ratio: 0.9999, label: 'عيار 24', perMil: '999.9' },
  '21': { ratio: 0.875, label: 'عيار 21', perMil: '875' },
  '18': { ratio: 0.75, label: 'عيار 18', perMil: '750' },
  '14': { ratio: 0.5833, label: 'عيار 14', perMil: '583.3' },
};

export const GoldCalculator: React.FC<GoldCalculatorProps> = ({
  data,
  initialMode = 'workmanship',
}) => {
  const [mode, setMode] = useState<CalcMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Workmanship Calculator State
  const [karatOption, setKaratOption] = useState<CalcKaratOption>('21');
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [weightInput, setWeightInput] = useState<string>('10');
  const [workmanshipInput, setWorkmanshipInput] = useState<string>('100');

  // Zakat Calculator State
  const [z24, setZ24] = useState<string>('0');
  const [z21, setZ21] = useState<string>('100');
  const [z18, setZ18] = useState<string>('0');
  const [z14, setZ14] = useState<string>('0');
  const [zPounds, setZPounds] = useState<string>('0');

  // Karat Purity Converter State
  const [purityWeightInput, setPurityWeightInput] = useState<string>('50');
  const [sourceKarat, setSourceKarat] = useState<KaratKey>('18');

  // Investment Comparison State
  const [budgetInput, setBudgetInput] = useState<string>('50000');

  const unitPrice = useMemo(() => {
    const { gold } = data;
    if (karatOption === '24') return txType === 'buy' ? gold.karat24.sell : gold.karat24.buy;
    if (karatOption === '21') return txType === 'buy' ? gold.karat21.sell : gold.karat21.buy;
    if (karatOption === '18') return txType === 'buy' ? gold.karat18.sell : gold.karat18.buy;
    return txType === 'buy' ? gold.goldPound.sell : gold.goldPound.buy;
  }, [data, karatOption, txType]);

  const calculation = useMemo(() => {
    const weight = Math.max(0, Number.parseFloat(weightInput) || 0);
    const workmanshipPerUnit =
      txType === 'buy' ? Math.max(0, Number.parseFloat(workmanshipInput) || 0) : 0;

    const effectiveGrams = karatOption === 'pound' ? weight * 8 : weight;
    const rawGoldTotal = weight * unitPrice;
    const totalWorkmanship = effectiveGrams * workmanshipPerUnit;
    const grandTotal = rawGoldTotal + totalWorkmanship;

    return {
      weight,
      effectiveGrams,
      rawGoldTotal,
      totalWorkmanship,
      grandTotal,
    };
  }, [weightInput, workmanshipInput, unitPrice, txType, karatOption]);

  const zakatStats = useMemo(() => {
    const w24 = Math.max(0, Number.parseFloat(z24) || 0);
    const w21 = Math.max(0, Number.parseFloat(z21) || 0);
    const w18 = Math.max(0, Number.parseFloat(z18) || 0);
    const w14 = Math.max(0, Number.parseFloat(z14) || 0);
    const pounds = Math.max(0, Number.parseFloat(zPounds) || 0);

    const pure24Equivalent =
      w24 +
      w21 * (21 / 24) +
      w18 * (18 / 24) +
      w14 * (14 / 24) +
      pounds * 8 * (21 / 24);

    const nisabGrams24 = 85;
    const nisabEgp = Math.round(nisabGrams24 * data.gold.karat24.buy);
    const isEligible = pure24Equivalent >= nisabGrams24;
    const zakatGrams24 = isEligible ? pure24Equivalent * 0.025 : 0;
    const zakatEgp = isEligible ? Math.round(zakatGrams24 * data.gold.karat24.buy) : 0;

    return {
      pure24Equivalent,
      nisabGrams24,
      nisabEgp,
      isEligible,
      zakatGrams24,
      zakatEgp,
      totalMarketValue: Math.round(pure24Equivalent * data.gold.karat24.buy),
    };
  }, [z24, z21, z18, z14, zPounds, data]);

  const purityConversions = useMemo(() => {
    const rawWeight = Math.max(0, Number.parseFloat(purityWeightInput) || 0);
    const srcRatio = FINENESS_MAP[sourceKarat].ratio;
    const pureGoldGrams = rawWeight * srcRatio;
    const alloyGrams = Math.max(0, rawWeight - pureGoldGrams);

    const targets: KaratKey[] = ['24', '21', '18', '14'];
    const equivalents = targets.map((k) => {
      const targetWeight = pureGoldGrams / FINENESS_MAP[k].ratio;
      const buyPrice =
        k === '24'
          ? data.gold.karat24.buy
          : k === '21'
          ? data.gold.karat21.buy
          : k === '18'
          ? data.gold.karat18.buy
          : data.gold.karat14.buy;

      return {
        karat: k,
        label: FINENESS_MAP[k].label,
        perMil: FINENESS_MAP[k].perMil,
        weightGrams: targetWeight,
        marketBuyValue: Math.round(targetWeight * buyPrice),
      };
    });

    return {
      rawWeight,
      pureGoldGrams,
      alloyGrams,
      equivalents,
    };
  }, [purityWeightInput, sourceKarat, data]);

  const comparisonStats = useMemo(() => {
    const budget = Math.max(0, Number.parseFloat(budgetInput) || 0);
    const { gold } = data;

    const btcWorkmanship = 65;
    const btcCashback = 27;
    const btcUnitCost = gold.karat24.sell + btcWorkmanship;
    const btcGrams = budget > 0 ? budget / btcUnitCost : 0;
    const btcImmediateResale = btcGrams * (gold.karat24.buy + btcCashback);

    const poundWorkmanshipPerGram = 54;
    const poundCashbackPerGram = 22;
    const poundUnitCost = gold.karat21.sell + poundWorkmanshipPerGram;
    const poundGrams = budget > 0 ? budget / poundUnitCost : 0;
    const poundCount = poundGrams / 8;
    const poundImmediateResale = poundGrams * (gold.karat21.buy + poundCashbackPerGram);

    const jewelry18Workmanship = 150;
    const jewelry18UnitCost = gold.karat18.sell + jewelry18Workmanship;
    const jewelry18Grams = budget > 0 ? budget / jewelry18UnitCost : 0;
    const jewelry18ImmediateResale = jewelry18Grams * gold.karat18.buy;

    return {
      budget,
      options: [
        {
          id: 'btc24',
          title: 'سبائك BTC عيار 24',
          badge: 'الأفضل للادخار طويل الأجل',
          grams: btcGrams,
          extraLabel: 'نقاء 999.9 · مصنعية تقديرية 65 ج.م/جم',
          cashbackNote: `كاش باك ~${btcCashback} ج.م/جم عند البيع بالغلاف`,
          resaleValue: Math.round(btcImmediateResale),
          retentionPct: budget > 0 ? (btcImmediateResale / budget) * 100 : 0,
        },
        {
          id: 'pound21',
          title: 'جنيهات ذهب عيار 21',
          badge: 'سيولة سريعة',
          grams: poundGrams,
          extraLabel: `يعادل ${poundCount.toFixed(2)} جنيه ذهب · مصنعية ~54 ج.م/جم`,
          cashbackNote: `كاش باك ~${poundCashbackPerGram} ج.م/جم عند البيع مغلفاً`,
          resaleValue: Math.round(poundImmediateResale),
          retentionPct: budget > 0 ? (poundImmediateResale / budget) * 100 : 0,
        },
        {
          id: 'jewelry18',
          title: 'مشغولات ذهب عيار 18',
          badge: 'للزينة والادخار معاً',
          grams: jewelry18Grams,
          extraLabel: 'نقاء 75% · مصنعية متوسطة 150 ج.م/جم',
          cashbackNote: 'تُخصم المصنعية بالكامل عند إعادة البيع',
          resaleValue: Math.round(jewelry18ImmediateResale),
          retentionPct: budget > 0 ? (jewelry18ImmediateResale / budget) * 100 : 0,
        },
      ],
    };
  }, [budgetInput, data]);

  const karatOptions: Array<{ id: CalcKaratOption; label: string }> = [
    { id: '24', label: 'عيار 24' },
    { id: '21', label: 'عيار 21' },
    { id: '18', label: 'عيار 18' },
    { id: 'pound', label: 'جنيه ذهب' },
  ];

  const workmanshipPresets = [60, 100, 150, 200];
  const weightPresets = karatOption === 'pound' ? [0.25, 0.5, 1, 2] : [1, 5, 10, 31.1];
  const budgetPresets = [25000, 50000, 100000, 250000];

  return (
    <div className="space-y-4">
      {/* 4-Mode Sub-navigation Tabs (Max 4 buttons in 1 row) */}
      <div
        className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#141414] border border-[#2E2E2E]"
        role="tablist"
        aria-label="أدوات حساب الذهب"
      >
        {(
          [
            { id: 'workmanship', label: 'المصنعية', Icon: Calculator },
            { id: 'zakat', label: 'زكاة الذهب', Icon: ShieldCheck },
            { id: 'purity', label: 'محول العيارات', Icon: ArrowLeftRight },
            { id: 'compare', label: 'الاستثمار', Icon: TrendingUp },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              triggerHaptic(15);
              setMode(id);
            }}
            className={`min-h-[42px] flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight break-words transition ${
              mode === id ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD] hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Mode 1: Workmanship Calculator */}
      {mode === 'workmanship' && (
        <div className="space-y-4">
          <section className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#1E1E1E] border border-[#2E2E2E]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setTxType('buy');
                }}
                className={`min-h-[42px] rounded-lg text-xs font-bold transition ${
                  txType === 'buy' ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD]'
                }`}
              >
                شراء (بالمصنعية)
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setTxType('sell');
                }}
                className={`min-h-[42px] rounded-lg text-xs font-bold transition ${
                  txType === 'sell' ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD]'
                }`}
              >
                بيع (بدون مصنعية)
              </button>
            </div>

            <div>
              <span className="block text-xs font-bold text-[#BDBDBD] mb-2">
                اختر العيار أو الوحدة
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {karatOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setKaratOption(opt.id);
                    }}
                    className={`min-h-[42px] rounded-xl border px-1 py-1.5 text-[11px] sm:text-xs font-bold leading-tight break-words transition ${
                      karatOption === opt.id
                        ? 'border-[#DFC798] bg-[#DFC798]/15 text-[#DFC798]'
                        : 'border-[#2E2E2E] bg-[#1E1E1E] text-[#BDBDBD]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="calc-weight-input" className="text-xs font-bold text-[#BDBDBD]">
                  {karatOption === 'pound' ? 'عدد الجنيهات' : 'الوزن بالجرام'}
                </label>
                <span className="text-xs text-[#DFC798] font-mono-num">
                  سعر {karatOption === 'pound' ? 'الجنيه' : 'الجرام'}:{' '}
                  {formatCurrencyValue(unitPrice)} ج.م
                </span>
              </div>
              <input
                id="calc-weight-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
                placeholder="10"
              />
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {weightPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setWeightInput(String(preset));
                    }}
                    className="min-h-[36px] rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] text-xs font-mono-num font-semibold text-[#BDBDBD] hover:border-[#DFC798]/60 hover:text-[#DFC798] transition"
                  >
                    {preset} {karatOption === 'pound' ? 'جنيه' : 'جم'}
                  </button>
                ))}
              </div>
            </div>

            {txType === 'buy' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="calc-workmanship-input"
                    className="text-xs font-bold text-[#BDBDBD]"
                  >
                    المصنعية والدمغة للجرام (جنيه)
                  </label>
                  <span className="text-[11px] text-[#9E9E9E]">
                    على {formatCurrencyValue(calculation.effectiveGrams, 2)} جم
                  </span>
                </div>
                <input
                  id="calc-workmanship-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={workmanshipInput}
                  onChange={(e) => setWorkmanshipInput(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
                  placeholder="100"
                />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {workmanshipPresets.map((fee) => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setWorkmanshipInput(String(fee));
                      }}
                      className={`min-h-[36px] rounded-lg border text-xs font-mono-num font-semibold transition ${
                        Number(workmanshipInput) === fee
                          ? 'border-[#DFC798] bg-[#DFC798]/15 text-[#DFC798]'
                          : 'border-[#2E2E2E] bg-[#1E1E1E] text-[#BDBDBD]'
                      }`}
                    >
                      {fee} ج.م
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-[#141414] border border-[#DFC798]/45 p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9E9E9E]">قيمة الذهب الخام</span>
                <span className="font-mono-num font-bold text-white">
                  {formatCurrencyValue(Math.round(calculation.rawGoldTotal))} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9E9E9E]">إجمالي المصنعية والدمغة</span>
                <span className="font-mono-num font-bold text-white">
                  {formatCurrencyValue(Math.round(calculation.totalWorkmanship))} ج.م
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#2E2E2E] flex items-baseline justify-between">
              <span className="text-xs font-bold text-[#DFC798]">
                {txType === 'buy' ? 'الإجمالي شامل المصنعية' : 'صافي قيمة البيع'}
              </span>
              <span className="font-mono-num text-2xl font-extrabold text-white">
                {formatCurrencyValue(Math.round(calculation.grandTotal))}{' '}
                <span className="text-xs text-[#DFC798]">جنيه</span>
              </span>
            </div>
          </section>
        </div>
      )}

      {/* Mode 2: Zakat */}
      {mode === 'zakat' && (
        <div className="space-y-4">
          <section className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-3">
            <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-[#BDBDBD]">نصاب الزكاة (85 جم عيار 24):</span>
              <span className="font-mono-num font-extrabold text-[#DFC798]">
                {formatCurrencyValue(zakatStats.nisabEgp)} ج.م
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'zakat-24', label: 'عيار 24 (جم)', val: z24, setter: setZ24 },
                { id: 'zakat-21', label: 'عيار 21 (جم)', val: z21, setter: setZ21 },
                { id: 'zakat-18', label: 'عيار 18 (جم)', val: z18, setter: setZ18 },
                { id: 'zakat-14', label: 'عيار 14 (جم)', val: z14, setter: setZ14 },
              ].map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="block text-xs text-[#BDBDBD] mb-1">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={f.val}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label htmlFor="zakat-pounds" className="block text-xs text-[#BDBDBD] mb-1">
                  عدد الجنيهات الذهبية (الجنيه = 8 جم عيار 21)
                </label>
                <input
                  id="zakat-pounds"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={zPounds}
                  onChange={(e) => setZPounds(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-[#141414] border border-[#DFC798]/45 p-4 space-y-2.5">
            <div
              className={`text-xs font-bold ${
                zakatStats.isEligible ? 'text-emerald-400' : 'text-[#9E9E9E]'
              }`}
            >
              {zakatStats.isEligible
                ? 'بلغ النصاب الشرعي — تجب الزكاة (2.5%)'
                : 'لم يبلغ النصاب (أقل من 85 جم عيار 24)'}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#BDBDBD]">المكافئ بالذهب الخالص (24K)</span>
              <span className="font-mono-num font-bold text-white">
                {formatCurrencyValue(zakatStats.pure24Equivalent, 2)} جرام
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#BDBDBD]">القيمة السوقية الإجمالية</span>
              <span className="font-mono-num font-bold text-white">
                {formatCurrencyValue(zakatStats.totalMarketValue)} ج.م
              </span>
            </div>
            <div className="pt-2.5 border-t border-[#2E2E2E] flex items-baseline justify-between">
              <span className="text-xs font-bold text-[#DFC798]">قيمة الزكاة المستحقة</span>
              <span className="font-mono-num text-2xl font-extrabold text-white">
                {formatCurrencyValue(zakatStats.zakatEgp)}{' '}
                <span className="text-xs text-[#DFC798]">جنيه</span>
              </span>
            </div>
          </section>
        </div>
      )}

      {/* Mode 3: Karat Purity Converter */}
      {mode === 'purity' && (
        <section className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="purity-weight-input" className="block text-xs font-bold text-[#BDBDBD] mb-1.5">
                الوزن المراد تحويله (جرام)
              </label>
              <input
                id="purity-weight-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={purityWeightInput}
                onChange={(e) => setPurityWeightInput(e.target.value)}
                className="w-full min-h-[46px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="purity-source-karat" className="block text-xs font-bold text-[#BDBDBD] mb-1.5">
                العيار الأصلي
              </label>
              <select
                id="purity-source-karat"
                value={sourceKarat}
                onChange={(e) => setSourceKarat(e.target.value as KaratKey)}
                className="w-full min-h-[46px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
              >
                <option value="24">عيار 24 (999.9)</option>
                <option value="21">عيار 21 (875)</option>
                <option value="18">عيار 18 (750)</option>
                <option value="14">عيار 14 (583.3)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              الذهب الصافي:{' '}
              <strong className="font-mono-num text-[#DFC798]">
                {purityConversions.pureGoldGrams.toFixed(2)} جم
              </strong>
            </span>
            <span>
              النحاس/المعادن:{' '}
              <strong className="font-mono-num text-white">
                {purityConversions.alloyGrams.toFixed(2)} جم
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {purityConversions.equivalents.map((eq) => (
              <div
                key={eq.karat}
                className={`rounded-xl border p-3 ${
                  eq.karat === sourceKarat
                    ? 'border-[#DFC798] bg-[#DFC798]/10'
                    : 'border-[#2E2E2E] bg-[#1E1E1E]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#DFC798]">{eq.label}</span>
                  <span className="text-[11px] font-mono-num text-[#9E9E9E]">{eq.perMil}‰</span>
                </div>
                <div className="font-mono-num text-lg font-extrabold text-white">
                  {eq.weightGrams.toFixed(2)} <span className="text-xs text-[#DFC798]">جم</span>
                </div>
                <div className="text-[11px] font-mono-num text-[#BDBDBD] mt-0.5">
                  {formatCurrencyValue(eq.marketBuyValue)} ج.م
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mode 4: Investment Comparison */}
      {mode === 'compare' && (
        <section className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-4">
          <div>
            <label htmlFor="compare-budget-input" className="block text-xs font-bold text-[#BDBDBD] mb-1.5">
              ميزانية الشراء المتاحة (جنيه مصري)
            </label>
            <input
              id="compare-budget-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
            />
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {budgetPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setBudgetInput(String(preset));
                  }}
                  className={`min-h-[36px] rounded-lg border text-[11px] font-mono-num font-semibold transition ${
                    Number(budgetInput) === preset
                      ? 'border-[#DFC798] bg-[#DFC798]/15 text-[#DFC798]'
                      : 'border-[#2E2E2E] bg-[#1E1E1E] text-[#BDBDBD]'
                  }`}
                >
                  {formatCurrencyValue(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {comparisonStats.options.map((opt, idx) => (
              <article
                key={opt.id}
                className={`rounded-xl p-3.5 border ${
                  idx === 0
                    ? 'border-[#DFC798]/60 bg-[#DFC798]/10'
                    : 'border-[#2E2E2E] bg-[#1E1E1E]'
                } space-y-2`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{opt.title}</h3>
                  <span className="text-[11px] font-bold text-[#DFC798]">{opt.badge}</span>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-[#9E9E9E]">الكمية المشتراة</span>
                  <span className="font-mono-num text-base font-extrabold text-[#DFC798]">
                    {opt.grams.toFixed(2)} جرام
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9E9E]">الاسترداد الفوري</span>
                  <span className="font-mono-num font-bold text-emerald-400">
                    {formatCurrencyValue(opt.resaleValue)} ج.م ({opt.retentionPct.toFixed(1)}%)
                  </span>
                </div>
                <p className="text-[11px] text-[#9E9E9E]">{opt.extraLabel}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
