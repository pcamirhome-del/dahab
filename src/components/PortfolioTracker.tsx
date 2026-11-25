import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Volume2,
  Wallet,
} from 'lucide-react';
import type {
  MarketDataSnapshot,
  PortfolioItem,
  PortfolioKarat,
  PriceAlertRule,
} from '../types/market.ts';
import { playGoldAlertChime } from '../utils/audioAlert.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface PortfolioTrackerProps {
  data: MarketDataSnapshot;
  items: PortfolioItem[];
  alerts: PriceAlertRule[];
  onAddItem: (item: PortfolioItem) => void;
  onDeleteItem: (id: string) => void;
  onReplaceItems: (items: PortfolioItem[]) => void;
  onAddAlert: (alert: PriceAlertRule) => void;
  onDeleteAlert: (id: string) => void;
}

export const PortfolioTracker: React.FC<PortfolioTrackerProps> = ({
  data,
  items,
  alerts,
  onAddItem,
  onDeleteItem,
  onReplaceItems,
  onAddAlert,
  onDeleteAlert,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [karat, setKarat] = useState<PortfolioKarat>('21');
  const [quantityInput, setQuantityInput] = useState('10');
  const [buyPriceInput, setBuyPriceInput] = useState(String(data.gold.karat21.sell));

  const [alertPriceType, setAlertPriceType] = useState<'sell' | 'buy'>('sell');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [alertTargetInput, setAlertTargetInput] = useState(
    String(Math.round(data.gold.karat21.sell + 50))
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotifyEnabled, setBrowserNotifyEnabled] = useState(false);

  const getCurrentBuyRate = (k: PortfolioKarat): number => {
    switch (k) {
      case '24':
        return data.gold.karat24.buy;
      case '21':
        return data.gold.karat21.buy;
      case '18':
        return data.gold.karat18.buy;
      case '14':
        return data.gold.karat14.buy;
      case 'pound':
        return data.gold.goldPound.buy;
    }
  };

  const getSuggestedPurchaseRate = (k: PortfolioKarat): number => {
    switch (k) {
      case '24':
        return data.gold.karat24.sell;
      case '21':
        return data.gold.karat21.sell;
      case '18':
        return data.gold.karat18.sell;
      case '14':
        return data.gold.karat14.sell;
      case 'pound':
        return data.gold.goldPound.sell;
    }
  };

  const handleKaratChange = (nextKarat: PortfolioKarat) => {
    setKarat(nextKarat);
    setBuyPriceInput(String(getSuggestedPurchaseRate(nextKarat)));
  };

  const handleAddPortfolioItem = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number.parseFloat(quantityInput);
    const price = Number.parseFloat(buyPriceInput);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      return;
    }

    triggerHaptic(15);
    const karatName = karat === 'pound' ? 'جنيه ذهب' : `ذهب عيار ${karat}`;
    const weightGrams = karat === 'pound' ? qty * 8 : qty;

    onAddItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim() || karatName,
      karat,
      weightGrams,
      quantity: qty,
      purchasePricePerUnit: price,
      totalCost: Math.round(qty * price),
      createdAt: Date.now(),
    });

    setLabel('');
  };

  const handleExportJson = () => {
    triggerHaptic(15);
    const payload = JSON.stringify({ version: 1, exportedAt: Date.now(), items }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edahab-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupFeedback('تم تصدير النسخة الاحتياطية JSON بنجاح.');
    setTimeout(() => setBackupFeedback(null), 3000);
  };

  const handleExportCsv = () => {
    triggerHaptic(15);
    const header = [
      'الوصف',
      'العيار',
      'الكمية/الوزن',
      'الوزن بالجرام',
      'سعر الشراء',
      'التكلفة الإجمالية',
      'القيمة السوقية الآن',
    ];
    const rows = items.map((item) => {
      const currentVal = Math.round(item.quantity * getCurrentBuyRate(item.karat));
      return [
        `"${item.label.replace(/"/g, '""')}"`,
        item.karat === 'pound' ? 'جنيه ذهب' : `عيار ${item.karat}`,
        item.quantity,
        item.weightGrams,
        item.purchasePricePerUnit,
        item.totalCost,
        currentVal,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edahab-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupFeedback('تم تصدير ملف CSV متوافق مع Excel بنجاح.');
    setTimeout(() => setBackupFeedback(null), 3000);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { items?: unknown } | unknown[];
      const rawList = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.items)
        ? parsed.items
        : null;

      if (!rawList) {
        setBackupFeedback('صيغة الملف غير صالحة للاستيراد.');
        return;
      }

      const validKarats: PortfolioKarat[] = ['24', '21', '18', '14', 'pound'];
      const sanitized: PortfolioItem[] = [];
      for (const entry of rawList) {
        if (!entry || typeof entry !== 'object') continue;
        const obj = entry as Record<string, unknown>;
        const k = obj.karat as PortfolioKarat;
        const qty = Number(obj.quantity);
        const price = Number(obj.purchasePricePerUnit);
        if (
          validKarats.includes(k) &&
          Number.isFinite(qty) &&
          qty > 0 &&
          Number.isFinite(price) &&
          price > 0
        ) {
          sanitized.push({
            id: typeof obj.id === 'string' ? obj.id : `${Date.now()}-${Math.random()}`,
            label:
              typeof obj.label === 'string' && obj.label.trim() ? obj.label : `ذهب عيار ${k}`,
            karat: k,
            weightGrams: k === 'pound' ? qty * 8 : qty,
            quantity: qty,
            purchasePricePerUnit: price,
            totalCost: Math.round(qty * price),
            createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : Date.now(),
          });
        }
      }

      onReplaceItems(sanitized);
      setBackupFeedback(`تم استيراد ${sanitized.length} عنصر إلى محفظتك بنجاح.`);
      setTimeout(() => setBackupFeedback(null), 3500);
    } catch {
      setBackupFeedback('تعذر قراءة الملف المحدد.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number.parseFloat(alertTargetInput);
    if (!Number.isFinite(target) || target <= 0) return;
    triggerHaptic(15);

    let notifyAllowed = browserNotifyEnabled;
    if (browserNotifyEnabled && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        notifyAllowed = perm === 'granted';
      } else {
        notifyAllowed = Notification.permission === 'granted';
      }
    }

    onAddAlert({
      id: `alert-${Date.now()}`,
      karat: '21',
      priceType: alertPriceType,
      condition: alertCondition,
      targetPrice: Math.round(target),
      soundEnabled,
      browserNotifyEnabled: notifyAllowed,
      active: true,
    });
  };

  const summary = useMemo(() => {
    let totalCost = 0;
    let totalCurrentValue = 0;
    let totalGrams = 0;

    for (const item of items) {
      totalCost += item.totalCost;
      totalGrams += item.weightGrams;
      const liveUnitBuy = getCurrentBuyRate(item.karat);
      totalCurrentValue += item.quantity * liveUnitBuy;
    }

    const profitLoss = Math.round(totalCurrentValue - totalCost);
    const profitPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    return {
      totalCost: Math.round(totalCost),
      totalCurrentValue: Math.round(totalCurrentValue),
      totalGrams: Number(totalGrams.toFixed(2)),
      profitLoss,
      profitPct,
    };
  }, [items, data]);

  return (
    <div className="space-y-4">
      {/* Portfolio Valuation Summary */}
      <section className="rounded-xl bg-[#141414] border border-[#DFC798]/45 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#DFC798]" />
            <h2 className="text-base font-extrabold text-[#DFC798]">محفظتي الذهبية</h2>
          </div>
          <span className="text-xs font-mono-num font-bold text-[#BDBDBD]">
            إجمالي الوزن: {formatCurrencyValue(summary.totalGrams, 2)} جم
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] p-3">
            <span className="block text-[11px] text-[#9E9E9E]">القيمة السوقية الآن</span>
            <span className="font-mono-num text-lg font-extrabold text-[#DFC798]">
              {formatCurrencyValue(summary.totalCurrentValue)} ج.م
            </span>
          </div>

          <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] p-3">
            <span className="block text-[11px] text-[#9E9E9E]">إجمالي تكلفة الشراء</span>
            <span className="font-mono-num text-lg font-bold text-white">
              {formatCurrencyValue(summary.totalCost)} ج.م
            </span>
          </div>

          <div className="rounded-lg bg-[#1E1E1E] border border-[#2E2E2E] p-3">
            <span className="block text-[11px] text-[#9E9E9E]">الربح / الخسارة</span>
            <div
              className={`flex items-center gap-1 font-mono-num text-lg font-extrabold ${
                summary.profitLoss >= 0 ? 'text-emerald-400' : 'text-[#E53935]'
              }`}
            >
              {summary.profitLoss >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>
                {summary.profitLoss > 0 ? '+' : ''}
                {formatCurrencyValue(summary.profitLoss)} ج.م ({summary.profitPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Add Gold Piece */}
      <form
        onSubmit={handleAddPortfolioItem}
        className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-3"
      >
        <h3 className="text-sm font-bold text-[#DFC798]">إضافة قطعة ذهب أو سبيكة</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="الوصف (مثال: سبيكة BTC)"
            className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base text-white focus:border-[#DFC798] focus:outline-none"
          />
          <select
            value={karat}
            onChange={(e) => handleKaratChange(e.target.value as PortfolioKarat)}
            className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
          >
            <option value="24">عيار 24 (سبائك)</option>
            <option value="21">عيار 21 (مشغولات)</option>
            <option value="18">عيار 18</option>
            <option value="14">عيار 14</option>
            <option value="pound">جنيه ذهب (8 جم)</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            required
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            placeholder={karat === 'pound' ? 'عدد الجنيهات' : 'الوزن (جرام)'}
            className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
          />
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="any"
            required
            value={buyPriceInput}
            onChange={(e) => setBuyPriceInput(e.target.value)}
            placeholder="سعر الشراء للوحدة"
            className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#DFC798] hover:bg-[#C8A96A] text-sm font-extrabold text-[#1A1A1A] transition"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة إلى المحفظة</span>
        </button>
      </form>

      {/* Items List & Backup */}
      <div className="rounded-xl bg-[#141414] border border-[#2E2E2E] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2E2E2E] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">مقتنياتك ({items.length})</h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={items.length === 0}
              className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-[#2E2E2E] px-2.5 py-1 text-[11px] font-bold text-[#E5E5E5] hover:border-[#DFC798] disabled:opacity-40"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={items.length === 0}
              className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-[#2E2E2E] px-2.5 py-1 text-[11px] font-bold text-[#E5E5E5] hover:border-[#DFC798] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5 text-[#DFC798]" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-[#2E2E2E] px-2.5 py-1 text-[11px] font-bold text-[#E5E5E5] hover:border-[#DFC798]"
            >
              <Upload className="h-3.5 w-3.5 text-[#DFC798]" />
              <span>استيراد</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>
        </div>

        {backupFeedback && (
          <div className="px-4 py-2 bg-[#DFC798]/15 text-xs font-bold text-[#DFC798] border-b border-[#DFC798]/25">
            {backupFeedback}
          </div>
        )}

        {items.length === 0 ? (
          <p className="p-5 text-center text-xs text-[#9E9E9E]">
            محفظتك فارغة حالياً. أضف أول قطعة بالأعلى لمتابعة ربحك اللحظي.
          </p>
        ) : (
          <div className="divide-y divide-[#2E2E2E]">
            {items.map((item) => {
              const liveUnitBuy = getCurrentBuyRate(item.karat);
              const currentVal = Math.round(item.quantity * liveUnitBuy);
              const diff = currentVal - item.totalCost;
              return (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{item.label}</div>
                    <div className="text-xs text-[#9E9E9E] tabular-nums-data">
                      {item.karat === 'pound'
                        ? `${item.quantity} جنيه`
                        : `عيار ${item.karat} · ${item.quantity} جم`}{' '}
                      · تكلفة: {formatCurrencyValue(item.totalCost)} ج.م
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left">
                      <div className="font-mono-num text-sm font-bold text-white">
                        {formatCurrencyValue(currentVal)} ج.م
                      </div>
                      <div
                        className={`font-mono-num text-xs font-bold ${
                          diff >= 0 ? 'text-emerald-400' : 'text-[#E53935]'
                        }`}
                      >
                        {diff >= 0 ? '+' : ''}
                        {formatCurrencyValue(diff)} ج.م
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      aria-label={`حذف ${item.label}`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#E53935]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Alert Watcher */}
      <section className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#DFC798]" />
            <h3 className="text-sm font-bold text-[#DFC798]">منبه أسعار الذهب (عيار 21)</h3>
          </div>
          <button
            type="button"
            onClick={playGoldAlertChime}
            className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-[#2E2E2E] px-2.5 py-1 text-xs font-semibold text-[#E5E5E5] hover:border-[#DFC798]"
          >
            <Volume2 className="h-3.5 w-3.5 text-[#DFC798]" />
            <span>تجربة</span>
          </button>
        </div>

        <form onSubmit={handleCreateAlert} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="نوع السعر"
              value={alertPriceType}
              onChange={(e) => setAlertPriceType(e.target.value as 'sell' | 'buy')}
              className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
            >
              <option value="sell">سعر البيع</option>
              <option value="buy">سعر الشراء</option>
            </select>
            <select
              aria-label="شرط التنبيه"
              value={alertCondition}
              onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
              className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
            >
              <option value="above">يرتفع إلى أو أعلى</option>
              <option value="below">ينخفض إلى أو أقل</option>
            </select>
          </div>

          <input
            type="number"
            inputMode="numeric"
            min="1"
            required
            value={alertTargetInput}
            onChange={(e) => setAlertTargetInput(e.target.value)}
            placeholder="السعر المستهدف لعيار 21"
            className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num font-bold text-white focus:border-[#DFC798] focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#BDBDBD]">
            <label className="inline-flex items-center gap-2 min-h-[34px] cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#DFC798]"
              />
              <span>تنبيه صوتي</span>
            </label>
            <label className="inline-flex items-center gap-2 min-h-[34px] cursor-pointer">
              <input
                type="checkbox"
                checked={browserNotifyEnabled}
                onChange={(e) => setBrowserNotifyEnabled(e.target.checked)}
                className="h-4 w-4 accent-[#DFC798]"
              />
              <span>إشعار المتصفح</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DFC798] bg-[#DFC798]/15 text-sm font-bold text-[#DFC798] hover:bg-[#DFC798]/25 transition"
          >
            <BellRing className="h-4 w-4" />
            <span>تفعيل منبه السعر</span>
          </button>
        </form>

        {alerts.length > 0 && (
          <div className="pt-2 border-t border-[#2E2E2E] space-y-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] p-2.5 text-xs"
              >
                <div>
                  <span className="font-bold text-white">
                    عيار 21 ({al.priceType === 'sell' ? 'بيع' : 'شراء'}){' '}
                    {al.condition === 'above' ? '≥' : '≤'}{' '}
                    <span className="font-mono-num text-[#DFC798]">
                      {formatCurrencyValue(al.targetPrice)} ج.م
                    </span>
                  </span>
                  <div className="text-[11px] text-[#9E9E9E]">
                    {al.triggeredAt ? 'تم الوصول للسعر المستهدف!' : 'قيد المراقبة اللحظية'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteAlert(al.id)}
                  aria-label="حذف التنبيه"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#9E9E9E] hover:text-[#E53935]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
