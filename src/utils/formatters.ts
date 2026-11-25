export function formatCurrencyValue(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatEgp(value: number, decimals = 0): string {
  return `${formatCurrencyValue(value, decimals)} ج.م`;
}

export function formatUsd(value: number, decimals = 0): string {
  return `$${formatCurrencyValue(value, decimals)}`;
}

/**
 * Formats timestamp as YYYY-MM-DD HH:MM:SS in local/Cairo readable form.
 */
export function formatDateTimeYmdHms(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export function getDigitalClock12hAr(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function getCairoMarketStatus(now: Date): { isOpen: boolean; label: string } {
  try {
    const cairoHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: 'numeric',
      hour12: false,
    }).format(now);
    const cairoDayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      weekday: 'short',
    }).format(now);
    const hour = Number.parseInt(cairoHourStr, 10);
    if (cairoDayStr === 'Fri' && (hour < 14 || hour > 22)) {
      return { isOpen: false, label: 'تحديث لحظي' };
    }
    if (hour >= 10 && hour <= 23) {
      return { isOpen: true, label: 'السوق مفتوح' };
    }
    return { isOpen: false, label: 'تداول مسائي' };
  } catch {
    return { isOpen: true, label: 'السوق مفتوح' };
  }
}
