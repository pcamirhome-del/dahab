import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall.ts';

interface OfflineIndicatorProps {
  isCachedData?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isCachedData }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !isCachedData) return null;

  return (
    <div
      role="status"
      className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#DFC798]/40 bg-[#1E1E1E] px-4 py-2.5 text-xs font-medium text-[#DFC798]"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-[#DFC798]" />
        <span>
          {!isOnline
            ? 'وضع عدم الاتصال — يتم عرض آخر أسعار حية تم حفظها على جهازك.'
            : 'تعذر تحديث الخادم حالياً — يتم عرض آخر بيانات محفوظة.'}
        </span>
      </div>
    </div>
  );
};
