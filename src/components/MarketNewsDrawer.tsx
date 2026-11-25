import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, X } from 'lucide-react';
import { fetchLiveMarketNews } from '../services/newsService.ts';
import type { MarketNewsItem } from '../types/market.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface MarketNewsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketNewsDrawer: React.FC<MarketNewsDrawerProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [filter, setFilter] = useState<'all' | 'gold' | 'currency'>('all');

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLiveMarketNews();
      setItems(res.items);
      setFromCache(res.fromCache);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الأخبار.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && items.length === 0) {
      loadNews();
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.category === filter);
  }, [items, filter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="أخبار الذهب والاقتصاد لحظة بلحظة"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] shadow-2xl overflow-hidden text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#2E2E2E] space-y-3 shrink-0">
          <div className="w-10 h-1.5 bg-[#3A352F] rounded-full mx-auto sm:hidden" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DFC798]/15 text-[#DFC798]">
                <Newspaper className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#DFC798]">
                  أخبار الذهب والاقتصاد في مصر
                </h2>
                <p className="text-xs text-[#9E9E9E]">
                  {fromCache ? 'نسخة مخزنة من آخر اتصال' : 'تحديث مباشر عبر Google News RSS'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  loadNews();
                }}
                disabled={loading}
                aria-label="تحديث الأخبار"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798] disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#141414] border border-[#2E2E2E]">
            {(
              [
                { id: 'all', label: 'كل الأخبار' },
                { id: 'gold', label: 'أخبار الذهب' },
                { id: 'currency', label: 'الدولار والاقتصاد' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setFilter(tab.id);
                }}
                className={`min-h-[38px] rounded-lg px-2 py-1 text-xs font-bold transition ${
                  filter === tab.id ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading && items.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-[#141414] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && error && items.length === 0 && (
            <div className="rounded-xl border border-[#E53935]/40 bg-[#E53935]/10 p-5 text-center space-y-2">
              <p className="text-sm font-bold text-[#E53935]">{error}</p>
              <button
                type="button"
                onClick={loadNews}
                className="min-h-[40px] rounded-xl bg-[#DFC798] px-4 py-2 text-xs font-extrabold text-[#1A1A1A]"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {filteredItems.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-[#2E2E2E] bg-[#141414] p-3.5 sm:p-4 hover:border-[#DFC798]/60 transition group"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#9E9E9E] mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-[#DFC798] truncate">{item.source}</span>
                  <span aria-hidden="true">·</span>
                  <span className="shrink-0">{item.relativeTimeAr}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9E9E9E] group-hover:text-[#DFC798] transition" />
              </div>
              <h3 className="text-sm font-bold text-white leading-relaxed group-hover:text-[#DFC798] transition">
                {item.title}
              </h3>
            </a>
          ))}

          {!loading && !error && filteredItems.length === 0 && (
            <p className="text-center text-sm text-[#9E9E9E] py-8">
              لا توجد أخبار مطابقة لهذا التصنيف حالياً.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
