import React from 'react';
import {
  Activity,
  Bell,
  Calculator,
  Coins,
  Info,
  Newspaper,
  Scale,
  ShieldCheck,
  Store,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';
import type {
  MarketDataSnapshot,
  PortfolioItem,
  PriceAlertRule,
  PriceHistoryTick,
} from '../types/market.ts';
import { triggerHaptic } from '../utils/haptics.ts';
import { BullionCatalogView } from './BullionCatalogView.tsx';
import { GoldCalculator, type CalcMode } from './GoldCalculator.tsx';
import { GoldPriceChart } from './GoldPriceChart.tsx';
import { PortfolioTracker } from './PortfolioTracker.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export type ActiveFeatureSheet =
  | null
  | { type: 'chart' }
  | { type: 'calculator'; mode: CalcMode }
  | { type: 'analytics' }
  | { type: 'bullion' }
  | { type: 'portfolio' }
  | { type: 'more' };

interface FeatureModalProps {
  sheet: ActiveFeatureSheet;
  onClose: () => void;
  onOpenSheet: (next: ActiveFeatureSheet) => void;
  onOpenNews: () => void;
  onOpenDirectory: () => void;
  onOpenHealth: () => void;
  marketData: MarketDataSnapshot | null;
  historyTicks: PriceHistoryTick[];
  portfolioItems: PortfolioItem[];
  alerts: PriceAlertRule[];
  onAddItem: (item: PortfolioItem) => void;
  onDeleteItem: (id: string) => void;
  onReplaceItems: (items: PortfolioItem[]) => void;
  onAddAlert: (alert: PriceAlertRule) => void;
  onDeleteAlert: (id: string) => void;
  soundOnMove: boolean;
  onToggleSoundOnMove: (enabled: boolean) => void;
}

export const FeatureModal: React.FC<FeatureModalProps> = ({
  sheet,
  onClose,
  onOpenSheet,
  onOpenNews,
  onOpenDirectory,
  onOpenHealth,
  marketData,
  historyTicks,
  portfolioItems,
  alerts,
  onAddItem,
  onDeleteItem,
  onReplaceItems,
  onAddAlert,
  onDeleteAlert,
  soundOnMove,
  onToggleSoundOnMove,
}) => {
  if (!sheet) return null;

  const getTitle = () => {
    switch (sheet.type) {
      case 'chart':
        return 'مؤشرات حركة الذهب اللحظية';
      case 'calculator':
        if (sheet.mode === 'zakat') return 'حاسبة زكاة الذهب الشرعية';
        if (sheet.mode === 'purity') return 'محول العيارات والسبك';
        if (sheet.mode === 'compare') return 'مقارنة الاستثمار في الذهب';
        return 'حاسبة الذهب والمصنعية';
      case 'analytics':
        return 'تحليلات ومميزات eDahab الحصرية';
      case 'bullion':
        return 'السبائك والعملات الذهبية (جدول الاسترداد)';
      case 'portfolio':
        return 'محفظتي الذهبية ومنبه الأسعار';
      case 'more':
        return 'المزيد من أدوات وإعدادات eDahab';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={getTitle()}
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] shadow-2xl overflow-hidden text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#2E2E2E] shrink-0">
          <div className="w-10 h-1.5 bg-[#3A352F] rounded-full mx-auto sm:hidden mb-3" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-extrabold text-[#DFC798]">{getTitle()}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798] hover:bg-[#3A352F]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {sheet.type === 'chart' && marketData && (
            <GoldPriceChart ticks={historyTicks} current21Sell={marketData.gold.karat21.sell} />
          )}

          {sheet.type === 'calculator' && marketData && (
            <GoldCalculator data={marketData} initialMode={sheet.mode} />
          )}

          {sheet.type === 'analytics' && marketData && (
            <div className="space-y-5">
              <GoldPriceChart ticks={historyTicks} current21Sell={marketData.gold.karat21.sell} />
              <GoldCalculator data={marketData} initialMode="compare" />
            </div>
          )}

          {sheet.type === 'bullion' && marketData && <BullionCatalogView data={marketData} />}

          {sheet.type === 'portfolio' && marketData && (
            <PortfolioTracker
              data={marketData}
              items={portfolioItems}
              alerts={alerts}
              onAddItem={onAddItem}
              onDeleteItem={onDeleteItem}
              onReplaceItems={onReplaceItems}
              onAddAlert={onAddAlert}
              onDeleteAlert={onDeleteAlert}
            />
          )}

          {sheet.type === 'more' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    label: 'محفظتي والمنبه',
                    icon: Wallet,
                    action: () => onOpenSheet({ type: 'portfolio' }),
                  },
                  {
                    label: 'مؤشرات الذهب',
                    icon: Activity,
                    action: () => onOpenSheet({ type: 'chart' }),
                  },
                  {
                    label: 'حاسبة المصنعية',
                    icon: Calculator,
                    action: () => onOpenSheet({ type: 'calculator', mode: 'workmanship' }),
                  },
                  {
                    label: 'حاسبة الزكاة',
                    icon: ShieldCheck,
                    action: () => onOpenSheet({ type: 'calculator', mode: 'zakat' }),
                  },
                  {
                    label: 'محول العيارات',
                    icon: Scale,
                    action: () => onOpenSheet({ type: 'calculator', mode: 'purity' }),
                  },
                  {
                    label: 'السبائك والكاش باك',
                    icon: Coins,
                    action: () => onOpenSheet({ type: 'bullion' }),
                  },
                  {
                    label: 'أخبار السوق',
                    icon: Newspaper,
                    action: () => {
                      onClose();
                      onOpenNews();
                    },
                  },
                  {
                    label: 'دليل الصاغة',
                    icon: Store,
                    action: () => {
                      onClose();
                      onOpenDirectory();
                    },
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        item.action();
                      }}
                      className="min-h-[50px] flex items-center gap-2.5 rounded-xl border border-[#2E2E2E] bg-[#141414] px-3.5 py-2.5 text-xs sm:text-sm font-bold text-white hover:border-[#DFC798]/60 transition text-right"
                    >
                      <Icon className="h-4 w-4 text-[#DFC798] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sound toggle + Health Settings */}
              <div className="space-y-2.5 pt-2 border-t border-[#2E2E2E]">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-[#2E2E2E] bg-[#141414] px-4 py-3 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="h-4 w-4 text-[#DFC798]" />
                    <span className="text-xs font-bold text-white">
                      تنبيه صوتي عند تغيّر السعر لحظياً
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundOnMove}
                    onChange={(e) => {
                      triggerHaptic(15);
                      onToggleSoundOnMove(e.target.checked);
                    }}
                    className="h-5 w-5 accent-[#DFC798]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHealth();
                  }}
                  className="w-full min-h-[46px] flex items-center justify-between rounded-xl border border-[#2E2E2E] bg-[#141414] px-4 py-2.5 text-xs font-bold text-[#DFC798] hover:border-[#DFC798]/60 transition"
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>إعدادات المزامنة التلقائية وحالة الاتصال</span>
                  </span>
                  <Bell className="h-4 w-4" />
                </button>

                <div className="flex justify-center pt-1">
                  <PWAInstallButton />
                </div>
              </div>

              <footer className="pt-3 border-t border-[#2E2E2E] text-center">
                <p className="text-xs font-bold text-[#DFC798]">
                  Developed by Amir Lamay | Made In Egypt
                </p>
              </footer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
