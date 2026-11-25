import React from 'react';
import { Activity, Clock, Server, Volume2, X } from 'lucide-react';
import type { MarketDataSnapshot, RefreshIntervalSetting } from '../types/market.ts';
import { formatDateTimeYmdHms } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface ConnectionHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketData: MarketDataSnapshot | null;
  refreshInterval: RefreshIntervalSetting;
  onChangeRefreshInterval: (val: RefreshIntervalSetting) => void;
  soundOnMove: boolean;
  onToggleSoundOnMove: (enabled: boolean) => void;
}

export const ConnectionHealthModal: React.FC<ConnectionHealthModalProps> = ({
  isOpen,
  onClose,
  marketData,
  refreshInterval,
  onChangeRefreshInterval,
  soundOnMove,
  onToggleSoundOnMove,
}) => {
  if (!isOpen) return null;

  const intervals: Array<{ val: RefreshIntervalSetting; label: string }> = [
    { val: 10, label: '10 ثوانٍ' },
    { val: 30, label: '30 ثانية' },
    { val: 60, label: '60 ثانية' },
    { val: 0, label: 'يدوي فقط' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="حالة الاتصال وإعدادات التحديث"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] p-5 sm:p-6 shadow-2xl space-y-5 text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-[#3A352F] rounded-full mx-auto sm:hidden" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DFC798]/15 text-[#DFC798]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#DFC798]">
                حالة الاتصال والمزامنة اللحظية
              </h3>
              <p className="text-xs text-[#9E9E9E]">فحص جودة المصدر وإعدادات التحديث التلقائي</p>
            </div>
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

        {/* Live Metrics */}
        <div className="space-y-2.5 rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9E9E9E] flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-[#DFC798]" />
              المصدر النشط
            </span>
            <span className="font-bold text-white text-left">
              {marketData?.source ?? 'جاري الاتصال...'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9E9E9E]">زمن الاستجابة (Latency)</span>
            <span className="font-mono-num font-bold text-emerald-400">
              {marketData?.latencyMs ? `${marketData.latencyMs} ms` : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#9E9E9E] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#DFC798]" />
              آخر مزامنة ناجحة
            </span>
            <span className="font-mono-num font-bold text-white">
              {marketData ? formatDateTimeYmdHms(marketData.fetchedAt) : '—'}
            </span>
          </div>
        </div>

        {/* Refresh Interval Toggle (4 buttons max in 1 row) */}
        <div>
          <span className="block text-xs font-bold text-[#DFC798] mb-2">
            معدل التحديث التلقائي
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {intervals.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onChangeRefreshInterval(opt.val);
                }}
                className={`min-h-[42px] rounded-xl border px-1 text-[11px] font-bold leading-tight break-words transition ${
                  refreshInterval === opt.val
                    ? 'border-[#DFC798] bg-[#DFC798] text-[#1A1A1A]'
                    : 'border-[#2E2E2E] bg-[#141414] text-[#E5E5E5] hover:border-[#DFC798]/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Sound on Price Change */}
        <label className="flex items-center justify-between gap-3 rounded-xl border border-[#2E2E2E] bg-[#141414] px-4 py-3 cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-[#DFC798]" />
            <div>
              <span className="block text-xs font-bold text-white">
                نغمة تنبيه عند تغيّر السعر
              </span>
              <span className="block text-[11px] text-[#9E9E9E]">
                صوت عملة خفيف فور صعود أو هبوط الأسعار
              </span>
            </div>
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

        <p className="text-center text-[11px] text-[#9E9E9E] pt-1">
          Developed by Amir Lamay | Made In Egypt
        </p>
      </div>
    </div>
  );
};
