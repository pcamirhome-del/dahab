import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BellRing,
  Calculator,
  ChevronLeft,
  Coins,
  Info,
  Menu,
  Newspaper,
  RefreshCw,
  Scale,
  Share2,
  ShieldCheck,
  Store,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { ConnectionHealthModal } from './components/ConnectionHealthModal.tsx';
import { CurrencyTab } from './components/CurrencyTable.tsx';
import { EdahabLogo } from './components/EdahabLogo.tsx';
import { FeatureModal, type ActiveFeatureSheet } from './components/FeatureModal.tsx';
import { JewelersDirectoryModal } from './components/JewelersDirectoryModal.tsx';
import { MarketNewsDrawer } from './components/MarketNewsDrawer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { PriceGapModal } from './components/PriceGapModal.tsx';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { ShareBulletinModal } from './components/ShareBulletinModal.tsx';
import { SilverView } from './components/SilverView.tsx';
import { WelcomeModal } from './components/WelcomeModal.tsx';
import { useLiveRates } from './hooks/useLiveRates.ts';
import { loadPortfolioItems, savePortfolioItems } from './services/storageService.ts';
import type { PortfolioItem, PriceChangeDelta } from './types/market.ts';
import { formatCurrencyValue, formatDateTimeYmdHms } from './utils/formatters.ts';
import { triggerHaptic } from './utils/haptics.ts';

type PrimarySegment = 'gold' | 'silver' | 'currencies';

const DeltaBadge: React.FC<{ delta?: PriceChangeDelta }> = ({ delta }) => {
  if (!delta) return null;
  const isUp = delta.direction === 'up';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-mono-num font-extrabold ${
        isUp ? 'text-emerald-400' : 'text-[#E53935]'
      }`}
    >
      {isUp ? '▲' : '▼'} {formatCurrencyValue(delta.diff, delta.diff % 1 !== 0 ? 2 : 0)}
    </span>
  );
};

export default function App() {
  const {
    marketData,
    historyTicks,
    deltaMap,
    priceChangeToast,
    dismissPriceChangeToast,
    isInitialLoading,
    isSyncing,
    errorMsg,
    refreshInterval,
    countdownSec,
    soundOnMove,
    alerts,
    alertBanner,
    dismissAlertBanner,
    refreshNow,
    changeRefreshInterval,
    toggleSoundOnMove,
    addAlert,
    deleteAlert,
  } = useLiveRates();

  const [activeSegment, setActiveSegment] = useState<PrimarySegment>('gold');
  const [heroKarat, setHeroKarat] = useState<'24' | '21'>('24');

  // Welcome live popup modal opens immediately on app entry
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(true);
  const [showPriceGapModal, setShowPriceGapModal] = useState<boolean>(false);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showNewsDrawer, setShowNewsDrawer] = useState<boolean>(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState<boolean>(false);
  const [activeSheet, setActiveSheet] = useState<ActiveFeatureSheet>(null);

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  // Pull-to-refresh state
  const touchStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState<number>(0);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    loadPortfolioItems().then(setPortfolioItems);
  }, []);

  const handleAddPortfolioItem = (item: PortfolioItem) => {
    setPortfolioItems((prev) => {
      const next = [item, ...prev];
      savePortfolioItems(next);
      return next;
    });
  };

  const handleDeletePortfolioItem = (id: string) => {
    setPortfolioItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      savePortfolioItems(next);
      return next;
    });
  };

  const handleReplacePortfolioItems = (next: PortfolioItem[]) => {
    setPortfolioItems(next);
    savePortfolioItems(next);
  };

  // Touch Pull-to-Refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2 && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || !e.touches[0]) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0 && window.scrollY <= 2) {
      setPullDistance(Math.min(80, delta * 0.55));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 55 && !isSyncing) {
      triggerHaptic(15);
      refreshNow(true);
    }
    touchStartYRef.current = null;
    setPullDistance(0);
  };

  const getFlashClass = (key: string) => {
    const d = deltaMap[key];
    if (!d) return '';
    return d.direction === 'up' ? 'animate-flash-up' : 'animate-flash-down';
  };

  const usdOfficial = marketData?.currencies.find((c) => c.code === 'USD')?.officialSell ?? 0;
  const fair24Egp =
    marketData && usdOfficial > 0 ? (marketData.gold.ounceUsd / 31.1034768) * usdOfficial : 0;
  const priceGap =
    marketData && fair24Egp > 0 ? Number((marketData.gold.karat24.sell - fair24Egp).toFixed(2)) : 0;

  const heroGoldItem = marketData
    ? heroKarat === '24'
      ? marketData.gold.karat24
      : marketData.gold.karat21
    : null;
  const heroFlashKey = heroKarat === '24' ? 'karat24' : 'karat21';

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-[#0E0E0E] text-[#E5E5E5] overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* A. Champagne Gold Top Header (#DFC798, rounded-b-3xl) */}
      <header className="sticky top-0 z-40 bg-[#DFC798] text-[#1A1A1A] rounded-b-3xl shadow-lg">
        <div className="mx-auto max-w-4xl px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2">
          {/* Right Side (in RTL): Bold dark title + live timestamp + 10s pulse indicator */}
          <div className="min-w-0 flex flex-col">
            <h1 className="text-[22px] sm:text-[24px] font-extrabold text-[#1A1A1A] leading-tight whitespace-nowrap">
              أسعار الذهب
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="font-mono-num text-[12px] sm:text-[13px] font-bold text-[#1A1A1A]/90">
                تحديث:{' '}
                {marketData ? formatDateTimeYmdHms(marketData.fetchedAt) : 'جاري التحميل...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-bold text-[#1A1A1A]/85">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  marketData?.isOfflineCache
                    ? 'bg-amber-700'
                    : 'bg-emerald-600 animate-pulse'
                }`}
              />
              <span>
                {marketData?.isOfflineCache
                  ? 'وضع الأوفلاين'
                  : refreshInterval === 10
                  ? `مباشر • تحديث تلقائي كل 10 ثوانٍ (${countdownSec})`
                  : refreshInterval > 0
                  ? `مباشر • تحديث كل ${refreshInterval} ث (${countdownSec})`
                  : 'تحديث يدوي'}
              </span>
            </div>
          </div>

          {/* Center: Iconic eDahab teardrop-shield emblem */}
          <div className="shrink-0 flex items-center justify-center">
            <EdahabLogo size={46} variant="header" />
          </div>

          {/* Left Side (in RTL): 3 Circular dark charcoal icon buttons (#3A352F with #DFC798 icons) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                refreshNow(true);
              }}
              aria-label="تحديث لحظي للأسعار"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#3A352F] text-[#DFC798] flex items-center justify-center hover:bg-[#2A2621] transition"
            >
              <RefreshCw className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setActiveSheet({ type: 'portfolio' });
              }}
              aria-label="محفظتي ومنبه الأسعار"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#3A352F] text-[#DFC798] flex items-center justify-center hover:bg-[#2A2621] transition"
            >
              <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setShowHealthModal(true);
              }}
              aria-label="معلومات وحالة الاتصال"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#3A352F] text-[#DFC798] flex items-center justify-center hover:bg-[#2A2621] transition"
            >
              <Info className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 8 && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-[#DFC798]">
            <RefreshCw className={`h-4 w-4 ${pullDistance >= 55 ? 'animate-spin' : ''}`} />
            <span>{pullDistance >= 55 ? 'اترك للتحديث الآن...' : 'اسحب للأسفل للتحديث'}</span>
          </div>
        </div>
      )}

      {/* Instant Floating Price-Change Mini-Toast */}
      {priceChangeToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-full border border-[#DFC798] bg-[#1E1E1E]/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-[#DFC798] shadow-2xl"
          >
            <span className="truncate">{priceChangeToast}</span>
            <button
              type="button"
              onClick={dismissPriceChangeToast}
              aria-label="إغلاق الإشعار"
              className="shrink-0 p-1 text-[#9E9E9E] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-3 sm:px-6 pt-3 pb-28 space-y-3">
        {/* Triggered Alert Banner */}
        {alertBanner && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-300"
          >
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{alertBanner}</span>
            </div>
            <button
              type="button"
              onClick={dismissAlertBanner}
              aria-label="إغلاق التنبيه"
              className="p-1 text-emerald-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <OfflineIndicator isCachedData={marketData?.isOfflineCache} />

        {/* B. Disclaimer Strip */}
        <p className="text-center text-[12px] sm:text-[13px] font-medium text-[#E5E5E5] leading-snug">
          يخصم المحل 1% إلى 2% من سعر الشراء عند شراء المصوغات
        </p>

        {/* B. 3-Way Segmented Pill Switcher (الذهب | الفضة | العملات) */}
        <div
          role="tablist"
          aria-label="الأقسام الرئيسية للأسعار"
          className="w-full rounded-full border border-[#DFC798] bg-[#121212] p-1 grid grid-cols-3 gap-1"
        >
          {(
            [
              { id: 'gold', label: 'الذهب' },
              { id: 'silver', label: 'الفضة' },
              { id: 'currencies', label: 'العملات' },
            ] as const
          ).map((seg) => (
            <button
              key={seg.id}
              type="button"
              role="tab"
              aria-selected={activeSegment === seg.id}
              onClick={() => {
                triggerHaptic(15);
                setActiveSegment(seg.id);
              }}
              className={`min-h-[40px] rounded-full text-xs sm:text-sm transition ${
                activeSegment === seg.id
                  ? 'bg-[#DFC798] text-[#1A1A1A] font-extrabold shadow-sm'
                  : 'text-[#DFC798] font-bold hover:bg-[#DFC798]/10'
              }`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Loading Skeleton */}
        {isInitialLoading && !marketData && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 h-32 rounded-xl bg-[#1E1E1E] animate-pulse" />
              <div className="col-span-1 h-32 rounded-xl bg-[#1E1E1E] animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="h-24 rounded-xl bg-[#1E1E1E] animate-pulse" />
              <div className="h-24 rounded-xl bg-[#1E1E1E] animate-pulse" />
              <div className="h-24 rounded-xl bg-[#1E1E1E] animate-pulse" />
            </div>
            <div className="h-14 rounded-xl bg-[#1E1E1E] animate-pulse" />
          </div>
        )}

        {/* Error State if offline with no cache */}
        {!isInitialLoading && !marketData && errorMsg && (
          <div className="rounded-xl border border-[#E53935]/40 bg-[#1E1E1E] p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-[#E53935] mx-auto" />
            <p className="text-sm font-bold text-[#E5E5E5]">{errorMsg}</p>
            <button
              type="button"
              onClick={() => refreshNow(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#DFC798] px-5 py-2.5 text-sm font-extrabold text-[#1A1A1A]"
            >
              <RefreshCw className="h-4 w-4" />
              <span>إعادة المحاولة الآن</span>
            </button>
          </div>
        )}

        {/* GOLD SEGMENT (Exact Official eDahab App Layout) */}
        {marketData && activeSegment === 'gold' && heroGoldItem && (
          <div className="space-y-2.5 sm:space-y-3">
            {/* C. Primary Hero Grid (2-Column Asymmetric Row: 2/3 Right + 1/3 Left) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 items-stretch">
              {/* Right Card (2/3 width - Main Karat Highlight) */}
              <article
                className={`col-span-2 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-3 sm:p-4 flex flex-col justify-between transition-colors ${getFlashClass(
                  heroFlashKey
                )}`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#DFC798]">
                      عيار {heroKarat}
                    </h2>
                    <DeltaBadge delta={deltaMap[heroFlashKey]} />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setHeroKarat((k) => (k === '24' ? '21' : '24'));
                    }}
                    aria-label="تبديل العيار الرئيسي بين 24 و 21"
                    className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-[#2E2E2E] bg-[#141414] text-[#DFC798] hover:border-[#DFC798]/60 transition"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 items-end">
                  <div>
                    <span className="block text-[11px] sm:text-xs text-[#BDBDBD]">بيع</span>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-mono-num text-[21px] sm:text-[26px] font-extrabold text-white leading-none">
                        {formatCurrencyValue(heroGoldItem.sell)}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#BDBDBD]">
                        جنيه
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] sm:text-xs text-[#BDBDBD]">شراء</span>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="font-mono-num text-[21px] sm:text-[26px] font-extrabold text-white leading-none">
                        {formatCurrencyValue(heroGoldItem.buy)}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#BDBDBD]">
                        جنيه
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              {/* Left Card (1/3 width - Price Gap / الفجوة السعرية) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setShowPriceGapModal(true);
                }}
                className="col-span-1 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] hover:border-[#DFC798]/50 p-2.5 sm:p-3.5 flex flex-col items-center justify-between text-center transition"
              >
                <span className="text-[11px] sm:text-xs font-bold text-[#E5E5E5] leading-tight">
                  الفجوة السعرية
                </span>

                <span
                  className={`font-mono-num text-lg sm:text-2xl font-extrabold leading-tight my-1 ${
                    priceGap >= 0 ? 'text-[#E53935]' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrencyValue(Math.abs(priceGap), 2)}
                </span>

                <span className="text-[11px] sm:text-[13px] font-bold text-white font-mono-num leading-tight">
                  دولار الصاغة: {formatCurrencyValue(marketData.saghaUsd, 2)}
                </span>

                <span className="text-[11px] font-bold text-[#DFC798] mt-1">اضغط للتفاصيل</span>
              </button>
            </div>

            {/* D. Secondary Karats 3-Column Row (عيار 21 | عيار 18 | عيار 14) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(
                [
                  { key: 'karat21', title: 'عيار 21', item: marketData.gold.karat21 },
                  { key: 'karat18', title: 'عيار 18', item: marketData.gold.karat18 },
                  { key: 'karat14', title: 'عيار 14', item: marketData.gold.karat14 },
                ] as const
              ).map(({ key, title, item }) => (
                <article
                  key={key}
                  className={`rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-2.5 sm:p-3.5 space-y-1.5 transition-colors ${getFlashClass(
                    key
                  )}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#DFC798]">{title}</h3>
                    <DeltaBadge delta={deltaMap[key]} />
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                    <span className="text-[#9E9E9E]">بيع</span>
                    <span className="font-mono-num font-bold text-white whitespace-nowrap">
                      {formatCurrencyValue(item.sell)} <span className="text-[10px]">جنيه</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                    <span className="text-[#9E9E9E]">شراء</span>
                    <span className="font-mono-num font-bold text-white whitespace-nowrap">
                      {formatCurrencyValue(item.buy)} <span className="text-[10px]">جنيه</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* E. Gold Pound Full-Width Bar */}
            <div
              className={`rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-4 py-3 flex items-center justify-between gap-2 transition-colors ${getFlashClass(
                'goldPound'
              )}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-[#DFC798]">
                  سعر الجنيه الذهب
                </span>
                <DeltaBadge delta={deltaMap.goldPound} />
              </div>

              <span className="font-mono-num text-base sm:text-lg font-extrabold text-white">
                {formatCurrencyValue(marketData.gold.goldPound.sell)}{' '}
                <span className="text-xs sm:text-sm font-semibold text-[#BDBDBD]">جنيه</span>
              </span>
            </div>

            {/* E. USD & Global Ounce Split Row (2 equal cards) */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div
                className={`rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 sm:px-4 py-3 flex items-center justify-between gap-1.5 transition-colors ${getFlashClass(
                  'usd'
                )}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-[#DFC798]">الدولار</span>
                  <DeltaBadge delta={deltaMap.usd} />
                </div>
                <span className="font-mono-num text-sm sm:text-base font-extrabold text-white whitespace-nowrap">
                  {usdOfficial > 0 ? formatCurrencyValue(usdOfficial, 2) : '—'}{' '}
                  <span className="text-[11px] font-semibold text-[#BDBDBD]">جنيه</span>
                </span>
              </div>

              <div
                className={`rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 sm:px-4 py-3 flex items-center justify-between gap-1.5 transition-colors ${getFlashClass(
                  'ounceUsd'
                )}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-extrabold text-[#DFC798]">الأونصة</span>
                  <DeltaBadge delta={deltaMap.ounceUsd} />
                </div>
                <span className="font-mono-num text-sm sm:text-base font-extrabold text-white whitespace-nowrap">
                  {formatCurrencyValue(marketData.gold.ounceUsd)}{' '}
                  <span className="text-[11px] font-semibold text-[#BDBDBD]">دولار</span>
                </span>
              </div>
            </div>

            {/* F. Exclusive Analytics Banner Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setActiveSheet({ type: 'analytics' });
              }}
              className="w-full min-h-[54px] rounded-xl border border-[#DFC798] bg-[#1E1E1E] hover:bg-[#24221D] px-4 py-2.5 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-2.5">
                <EdahabLogo size={32} variant="dark" />
                <span className="text-sm sm:text-base font-extrabold text-white">
                  تحليلات ومميزات حصرية
                </span>
              </div>
              <ChevronLeft className="h-5 w-5 text-[#DFC798] shrink-0" />
            </button>

            {/* G. Quick Tools Circular Icon Row (4 Golden Ring Buttons) */}
            <section
              aria-label="أدوات الذهب السريعة"
              className="pt-2 pb-1 grid grid-cols-4 gap-2 sm:gap-4"
            >
              {[
                {
                  label: 'المؤشرات',
                  Icon: TrendingUp,
                  onClick: () => setActiveSheet({ type: 'chart' }),
                },
                {
                  label: 'الحاسبة',
                  Icon: Calculator,
                  onClick: () => setActiveSheet({ type: 'calculator', mode: 'workmanship' }),
                },
                {
                  label: 'حاسبة الزكاة',
                  Icon: ShieldCheck,
                  onClick: () => setActiveSheet({ type: 'calculator', mode: 'zakat' }),
                },
                {
                  label: 'محول العيارات',
                  Icon: Scale,
                  onClick: () => setActiveSheet({ type: 'calculator', mode: 'purity' }),
                },
              ].map(({ label, Icon, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    onClick();
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <span className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#1E1E1E] border-2 border-[#C8A96A] ring-1 ring-[#DFC798]/35 ring-offset-2 ring-offset-[#0E0E0E] flex items-center justify-center text-[#DFC798] group-hover:scale-105 group-active:scale-95 transition-transform">
                    <Icon className="h-6 w-6" strokeWidth={1.9} />
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-[#E5E5E5] leading-tight text-center break-words">
                    {label}
                  </span>
                </button>
              ))}
            </section>
          </div>
        )}

        {/* SILVER SEGMENT (الفضة) */}
        {marketData && activeSegment === 'silver' && (
          <SilverView
            data={marketData}
            onRefresh={() => refreshNow(true)}
            isSyncing={isSyncing}
          />
        )}

        {/* CURRENCIES SEGMENT (العملات) */}
        {marketData && activeSegment === 'currencies' && <CurrencyTab data={marketData} />}
      </main>

      {/* Floating PWA Install Banner */}
      <PWAInstallBanner />

      {/* Welcome Live Popup Modal on App Entry */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        marketData={marketData}
        isSyncing={isSyncing}
      />

      {/* Price Gap Breakdown Modal */}
      {marketData && (
        <PriceGapModal
          isOpen={showPriceGapModal}
          onClose={() => setShowPriceGapModal(false)}
          data={marketData}
        />
      )}

      {/* Connection Health & Sound / Polling Modal */}
      <ConnectionHealthModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        marketData={marketData}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={changeRefreshInterval}
        soundOnMove={soundOnMove}
        onToggleSoundOnMove={toggleSoundOnMove}
      />

      {/* Share Bulletin & Story PNG Modal */}
      {marketData && (
        <ShareBulletinModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          data={marketData}
        />
      )}

      {/* Live Market News Drawer */}
      <MarketNewsDrawer isOpen={showNewsDrawer} onClose={() => setShowNewsDrawer(false)} />

      {/* Trusted Jewelers Directory Modal */}
      <JewelersDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
      />

      {/* Feature Sheet Modal (Chart, Calculator, Bullion, Portfolio, Analytics, More) */}
      <FeatureModal
        sheet={activeSheet}
        onClose={() => setActiveSheet(null)}
        onOpenSheet={(next) => setActiveSheet(next)}
        onOpenNews={() => setShowNewsDrawer(true)}
        onOpenDirectory={() => setShowDirectoryModal(true)}
        onOpenHealth={() => setShowHealthModal(true)}
        marketData={marketData}
        historyTicks={historyTicks}
        portfolioItems={portfolioItems}
        alerts={alerts}
        onAddItem={handleAddPortfolioItem}
        onDeleteItem={handleDeletePortfolioItem}
        onReplaceItems={handleReplacePortfolioItems}
        onAddAlert={addAlert}
        onDeleteAlert={deleteAlert}
        soundOnMove={soundOnMove}
        onToggleSoundOnMove={toggleSoundOnMove}
      />

      {/* H. Fixed Champagne Gold Bottom Navigation Bar (#C5AE82 / #DFC798) */}
      <nav
        aria-label="التنقل السفلي"
        className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#B89D69] via-[#C5AE82] to-[#DFC798] pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.55)]"
      >
        <div className="mx-auto max-w-4xl grid grid-cols-5 h-16 items-center px-1">
          {/* Right (in RTL): دليل الصاغة */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setShowDirectoryModal(true);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90 transition"
          >
            <Store className="h-[20px] w-[20px]" strokeWidth={2.2} />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
              دليل الصاغة
            </span>
          </button>

          {/* Center-Right: السبائك */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveSheet({ type: 'bullion' });
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90 transition"
          >
            <Coins className="h-[20px] w-[20px]" strokeWidth={2.2} />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
              السبائك
            </span>
          </button>

          {/* Center Floating Overlap: Circular dark-gold Share button (#9C824A, 3px solid #121212) */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                if (marketData) setShowShareModal(true);
              }}
              aria-label="مشاركة الأسعار"
              className="-mt-7 h-14 w-14 rounded-full bg-[#9C824A] border-[3px] border-[#121212] text-white shadow-xl flex items-center justify-center hover:bg-[#8B723E] active:scale-95 transition"
            >
              <Share2 className="h-6 w-6" strokeWidth={2.3} />
            </button>
          </div>

          {/* Center-Left: أخبار اقتصادية */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setShowNewsDrawer(true);
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90 transition"
          >
            <Newspaper className="h-[20px] w-[20px]" strokeWidth={2.2} />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
              أخبار اقتصادية
            </span>
          </button>

          {/* Left: المزيد */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveSheet({ type: 'more' });
            }}
            className="min-h-[44px] flex flex-col items-center justify-center gap-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] hover:opacity-90 transition"
          >
            <Menu className="h-[20px] w-[20px]" strokeWidth={2.2} />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
              المزيد
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
