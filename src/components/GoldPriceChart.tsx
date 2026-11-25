import React, { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import type { PriceHistoryTick } from '../types/market.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface GoldPriceChartProps {
  ticks: PriceHistoryTick[];
  current21Sell: number;
}

type Timeframe = '24h' | '7d' | '30d';

export const GoldPriceChart: React.FC<GoldPriceChartProps> = ({ ticks, current21Sell }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const filteredTicks = useMemo(() => {
    const now = Date.now();
    const windowMs =
      timeframe === '24h'
        ? 24 * 60 * 60 * 1000
        : timeframe === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    const list = ticks.filter((t) => t.timestamp >= now - windowMs);
    if (list.length === 0) {
      return [
        {
          timestamp: now,
          karat21Sell: current21Sell,
          karat21Buy: current21Sell,
          karat24Sell: Math.round((current21Sell * 24) / 21),
          ounceUsd: 0,
        },
      ];
    }
    return list;
  }, [ticks, timeframe, current21Sell]);

  const stats = useMemo(() => {
    const values = filteredTicks.map((t) => t.karat21Sell);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    return { min, max, first, last, change };
  }, [filteredTicks]);

  const chartGeometry = useMemo(() => {
    const width = 640;
    const height = 190;
    const padX = 14;
    const padY = 20;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const range = stats.max - stats.min;
    const effectiveMin = range === 0 ? stats.min - 10 : stats.min - range * 0.15;
    const effectiveMax = range === 0 ? stats.max + 10 : stats.max + range * 0.15;
    const span = Math.max(1, effectiveMax - effectiveMin);

    const points = filteredTicks.map((tick, idx) => {
      const x =
        filteredTicks.length === 1
          ? width / 2
          : padX + (idx / (filteredTicks.length - 1)) * innerW;
      const y = padY + innerH - ((tick.karat21Sell - effectiveMin) / span) * innerH;
      return { x, y, tick };
    });

    if (points.length === 1) {
      const p = points[0];
      const linePath = `M ${padX} ${p.y} L ${width - padX} ${p.y}`;
      const areaPath = `${linePath} L ${width - padX} ${height - 6} L ${padX} ${height - 6} Z`;
      return { width, height, points, linePath, areaPath };
    }

    const linePath = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const lastP = points[points.length - 1];
    const firstP = points[0];
    const areaPath = `${linePath} L ${lastP.x.toFixed(1)} ${height - 6} L ${firstP.x.toFixed(
      1
    )} ${height - 6} Z`;

    return { width, height, points, linePath, areaPath };
  }, [filteredTicks, stats]);

  const activePoint =
    hoverIndex !== null && chartGeometry.points[hoverIndex]
      ? chartGeometry.points[hoverIndex]
      : chartGeometry.points[chartGeometry.points.length - 1];

  const formatTickTime = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        month: timeframe === '24h' ? undefined : 'short',
        day: timeframe === '24h' ? undefined : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(ts));
    } catch {
      return '';
    }
  };

  const handlePointer = (clientX: number, rect: DOMRect) => {
    if (chartGeometry.points.length <= 1) {
      setHoverIndex(0);
      return;
    }
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = relX / rect.width;
    const idx = Math.round(ratio * (chartGeometry.points.length - 1));
    setHoverIndex(Math.max(0, Math.min(chartGeometry.points.length - 1, idx)));
  };

  return (
    <section
      aria-label="مؤشر حركة الذهب عيار 21"
      className="rounded-xl bg-[#141414] border border-[#2E2E2E] p-4 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DFC798]/15 text-[#DFC798]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#DFC798]">
              مؤشر حركة الذهب (عيار 21)
            </h2>
            <p className="text-xs text-[#9E9E9E]">
              يُسجّل تلقائياً مع كل تحديث لحظي ({filteredTicks.length} قراءة مسجلة)
            </p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#1E1E1E] border border-[#2E2E2E]">
          {(
            [
              { id: '24h', label: '24 ساعة' },
              { id: '7d', label: 'أسبوع' },
              { id: '30d', label: 'شهر' },
            ] as const
          ).map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setTimeframe(tf.id);
                setHoverIndex(null);
              }}
              className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                timeframe === tf.id
                  ? 'bg-[#DFC798] text-[#1A1A1A]'
                  : 'text-[#BDBDBD] hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected / Latest Tooltip Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-baseline gap-2">
          <span className="font-mono-num text-xl font-extrabold text-white">
            {formatCurrencyValue(activePoint.tick.karat21Sell)} ج.م
          </span>
          <span className="text-[#9E9E9E]">{formatTickTime(activePoint.tick.timestamp)}</span>
        </div>

        <div className="flex items-center gap-3 text-[#9E9E9E] font-mono-num">
          <span>الأدنى: {formatCurrencyValue(stats.min)}</span>
          <span aria-hidden="true">·</span>
          <span>الأعلى: {formatCurrencyValue(stats.max)}</span>
        </div>
      </div>

      {/* Responsive SVG Area Chart */}
      <div
        className="relative w-full touch-pan-y select-none"
        onMouseMove={(e) => handlePointer(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchMove={(e) => {
          if (e.touches[0]) {
            handlePointer(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
          }
        }}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            handlePointer(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
          }
        }}
      >
        <svg
          viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
          className="w-full h-44 sm:h-52 overflow-visible"
          role="img"
          aria-label="رسم بياني لسعر الذهب عيار 21"
        >
          <defs>
            <linearGradient id="edahabGoldArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DFC798" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#DFC798" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line
            x1="14"
            y1="20"
            x2={chartGeometry.width - 14}
            y2="20"
            stroke="#2E2E2E"
            strokeDasharray="4 4"
          />
          <line
            x1="14"
            y1={chartGeometry.height / 2}
            x2={chartGeometry.width - 14}
            y2={chartGeometry.height / 2}
            stroke="#2E2E2E"
            strokeDasharray="4 4"
          />
          <line
            x1="14"
            y1={chartGeometry.height - 20}
            x2={chartGeometry.width - 14}
            y2={chartGeometry.height - 20}
            stroke="#2E2E2E"
            strokeDasharray="4 4"
          />

          <path d={chartGeometry.areaPath} fill="url(#edahabGoldArea)" />

          <path
            d={chartGeometry.linePath}
            fill="none"
            stroke="#DFC798"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {activePoint && (
            <>
              <line
                x1={activePoint.x}
                y1="14"
                x2={activePoint.x}
                y2={chartGeometry.height - 6}
                stroke="#DFC798"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#DFC798"
                stroke="#141414"
                strokeWidth="2.5"
              />
            </>
          )}
        </svg>
      </div>

      {filteredTicks.length <= 2 && (
        <p className="text-[11px] text-[#9E9E9E]">
          يتم تسجيل القراءات الحية الفعلية تلقائياً كل 10 ثوانٍ في قاعدة بيانات المتصفح دون بيانات
          مصطنعة.
        </p>
      )}
    </section>
  );
};
