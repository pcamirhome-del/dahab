import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="تثبيت تطبيق eDahab"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تثبيت</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="تثبيت التطبيق على آيفون"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/20 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">تثبيت iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label="دليل التثبيت على iOS"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-amber-500/25 bg-white dark:bg-[#131A2A] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تثبيت eDahab على آيفون
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">1.</span>
                  <span>
                    اضغط على زر <strong>المشاركة (Share)</strong>{' '}
                    <Share className="inline h-4 w-4 mx-0.5 text-amber-500" /> في شريط Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">2.</span>
                  <span>
                    مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
