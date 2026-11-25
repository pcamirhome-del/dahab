import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLiveMarketData } from '../services/liveScraperService.ts';
import {
  appendPriceHistoryTick,
  getCachedMarketSync,
  loadPriceAlerts,
  loadPriceHistoryTicks,
  loadRefreshIntervalSetting,
  loadSoundOnMoveSetting,
  savePriceAlerts,
  saveRefreshIntervalSetting,
  saveSoundOnMoveSetting,
} from '../services/storageService.ts';
import type {
  MarketDataSnapshot,
  PriceAlertRule,
  PriceDeltaMap,
  PriceHistoryTick,
  RefreshIntervalSetting,
} from '../types/market.ts';
import { playGoldAlertChime, playSubtleCoinTick } from '../utils/audioAlert.ts';
import { formatCurrencyValue } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

export interface UseLiveRatesResult {
  marketData: MarketDataSnapshot | null;
  historyTicks: PriceHistoryTick[];
  deltaMap: PriceDeltaMap;
  priceChangeToast: string | null;
  dismissPriceChangeToast: () => void;
  isInitialLoading: boolean;
  isSyncing: boolean;
  errorMsg: string | null;
  refreshInterval: RefreshIntervalSetting;
  countdownSec: number;
  soundOnMove: boolean;
  alerts: PriceAlertRule[];
  alertBanner: string | null;
  dismissAlertBanner: () => void;
  refreshNow: (force?: boolean) => Promise<void>;
  changeRefreshInterval: (val: RefreshIntervalSetting) => void;
  toggleSoundOnMove: (enabled: boolean) => void;
  addAlert: (alert: PriceAlertRule) => void;
  deleteAlert: (id: string) => void;
}

export function useLiveRates(): UseLiveRatesResult {
  const [marketData, setMarketData] = useState<MarketDataSnapshot | null>(() =>
    getCachedMarketSync()
  );
  const [historyTicks, setHistoryTicks] = useState<PriceHistoryTick[]>([]);
  const [deltaMap, setDeltaMap] = useState<PriceDeltaMap>({});
  const [priceChangeToast, setPriceChangeToast] = useState<string | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => !getCachedMarketSync());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [refreshInterval, setRefreshInterval] = useState<RefreshIntervalSetting>(() =>
    loadRefreshIntervalSetting()
  );
  const [countdownSec, setCountdownSec] = useState<number>(() => {
    const saved = loadRefreshIntervalSetting();
    return saved > 0 ? saved : 10;
  });
  const [soundOnMove, setSoundOnMove] = useState<boolean>(() => loadSoundOnMoveSetting());

  const [alerts, setAlerts] = useState<PriceAlertRule[]>([]);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const prevDisplayedRef = useRef<MarketDataSnapshot | null>(getCachedMarketSync());
  const inFlightRef = useRef<boolean>(false);
  const flashTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Load persisted alerts and history ticks on mount
  useEffect(() => {
    loadPriceAlerts().then(setAlerts);
    loadPriceHistoryTicks().then(setHistoryTicks);
  }, []);

  const evaluateAlerts = useCallback((snapshot: MarketDataSnapshot) => {
    setAlerts((prevAlerts) => {
      let changed = false;
      const updated = prevAlerts.map((rule) => {
        if (!rule.active || rule.triggeredAt) return rule;
        const currentPrice =
          rule.priceType === 'sell'
            ? snapshot.gold.karat21.sell
            : snapshot.gold.karat21.buy;
        const hit =
          rule.condition === 'above'
            ? currentPrice >= rule.targetPrice
            : currentPrice <= rule.targetPrice;

        if (hit) {
          changed = true;
          const message = `تنبيه السعر: عيار 21 (${
            rule.priceType === 'sell' ? 'بيع' : 'شراء'
          }) وصل إلى ${formatCurrencyValue(currentPrice)} ج.م`;
          setAlertBanner(message);

          if (rule.soundEnabled) {
            playGoldAlertChime();
          }
          if (
            rule.browserNotifyEnabled &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification('eDahab - منبه أسعار الذهب', {
                body: message,
                icon: '/pwa-192x192.png',
              });
            } catch {
              // Ignore
            }
          }
          return { ...rule, triggeredAt: Date.now(), active: false };
        }
        return rule;
      });

      if (changed) {
        savePriceAlerts(updated);
      }
      return changed ? updated : prevAlerts;
    });
  }, []);

  const detectAndNotifyPriceChanges = useCallback(
    (next: MarketDataSnapshot) => {
      const prev = prevDisplayedRef.current;
      prevDisplayedRef.current = next;
      if (!prev) return;

      const diffs: PriceDeltaMap = {};
      const compare = (key: string, nextVal: number, prevVal: number, precision = 0) => {
        if (!Number.isFinite(nextVal) || !Number.isFinite(prevVal)) return;
        const diff = Number((nextVal - prevVal).toFixed(precision));
        if (diff > 0) diffs[key] = { direction: 'up', diff };
        else if (diff < 0) diffs[key] = { direction: 'down', diff: Math.abs(diff) };
      };

      compare('karat24', next.gold.karat24.sell, prev.gold.karat24.sell);
      compare('karat21', next.gold.karat21.sell, prev.gold.karat21.sell);
      compare('karat18', next.gold.karat18.sell, prev.gold.karat18.sell);
      compare('karat14', next.gold.karat14.sell, prev.gold.karat14.sell);
      compare('goldPound', next.gold.goldPound.sell, prev.gold.goldPound.sell);
      compare('ounceUsd', next.gold.ounceUsd, prev.gold.ounceUsd);

      const nextUsd = next.currencies.find((c) => c.code === 'USD')?.officialSell;
      const prevUsd = prev.currencies.find((c) => c.code === 'USD')?.officialSell;
      if (nextUsd && prevUsd) {
        compare('usd', nextUsd, prevUsd, 2);
      }

      if (Object.keys(diffs).length > 0) {
        setDeltaMap(diffs);
        triggerHaptic(30);

        if (soundOnMove) {
          const primaryDir = (diffs.karat21 ?? Object.values(diffs)[0]).direction;
          playSubtleCoinTick(primaryDir);
        }

        // Priority toast message
        let toast = '';
        if (diffs.karat21) {
          toast = `تم تحديث الأسعار لحظياً: تغير سعر عيار 21 إلى ${formatCurrencyValue(
            next.gold.karat21.sell
          )} ج.م`;
        } else if (diffs.karat24) {
          toast = `تم تحديث الأسعار لحظياً: تغير سعر عيار 24 إلى ${formatCurrencyValue(
            next.gold.karat24.sell
          )} ج.م`;
        } else if (diffs.ounceUsd) {
          toast = `تم تحديث الأسعار لحظياً: تغير سعر الأونصة إلى $${formatCurrencyValue(
            next.gold.ounceUsd
          )}`;
        } else if (diffs.usd && nextUsd) {
          toast = `تم تحديث الأسعار لحظياً: تغير سعر الدولار إلى ${formatCurrencyValue(
            nextUsd,
            2
          )} ج.م`;
        } else {
          toast = `تم تحديث أسعار الذهب في مصر لحظياً (${formatCurrencyValue(
            next.gold.karat21.sell
          )} ج.م لعيار 21)`;
        }
        setPriceChangeToast(toast);

        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = window.setTimeout(() => setDeltaMap({}), 1500);

        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setPriceChangeToast(null), 4200);
      }
    },
    [soundOnMove]
  );

  const refreshNow = useCallback(
    async (force = false) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsSyncing(true);
      if (!prevDisplayedRef.current) {
        setErrorMsg(null);
      }

      try {
        const snapshot = await fetchLiveMarketData(force);
        setMarketData(snapshot);
        setErrorMsg(null);
        setCountdownSec(refreshInterval > 0 ? refreshInterval : 10);
        detectAndNotifyPriceChanges(snapshot);
        evaluateAlerts(snapshot);
        const updatedHistory = await appendPriceHistoryTick(snapshot);
        setHistoryTicks(updatedHistory);
      } catch (err) {
        if (!prevDisplayedRef.current) {
          setErrorMsg(
            err instanceof Error ? err.message : 'تعذر تحميل الأسعار المباشرة، يرجى المحاولة.'
          );
        }
      } finally {
        inFlightRef.current = false;
        setIsInitialLoading(false);
        setIsSyncing(false);
      }
    },
    [detectAndNotifyPriceChanges, evaluateAlerts, refreshInterval]
  );

  // Initial silent/immediate sync on mount
  useEffect(() => {
    refreshNow(true);
  }, []);

  // Mandatory 10-second background polling countdown (autoRefreshEnabled = true by default)
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const ticker = window.setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          refreshNow(true);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(ticker);
  }, [refreshInterval, refreshNow]);

  // Immediate sync on tab visibility return & network reconnect
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshNow(true);
      }
    };
    const handleOnline = () => {
      refreshNow(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshNow]);

  const changeRefreshInterval = (val: RefreshIntervalSetting) => {
    setRefreshInterval(val);
    saveRefreshIntervalSetting(val);
    if (val > 0) setCountdownSec(val);
  };

  const toggleSoundOnMove = (enabled: boolean) => {
    setSoundOnMove(enabled);
    saveSoundOnMoveSetting(enabled);
  };

  const addAlert = (alert: PriceAlertRule) => {
    setAlerts((prev) => {
      const next = [alert, ...prev];
      savePriceAlerts(next);
      return next;
    });
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      savePriceAlerts(next);
      return next;
    });
  };

  return {
    marketData,
    historyTicks,
    deltaMap,
    priceChangeToast,
    dismissPriceChangeToast: () => setPriceChangeToast(null),
    isInitialLoading,
    isSyncing,
    errorMsg,
    refreshInterval,
    countdownSec,
    soundOnMove,
    alerts,
    alertBanner,
    dismissAlertBanner: () => setAlertBanner(null),
    refreshNow,
    changeRefreshInterval,
    toggleSoundOnMove,
    addAlert,
    deleteAlert,
  };
}
