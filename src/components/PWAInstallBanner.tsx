import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      <div
        role="region"
        aria-label="تثبيت تطبيق eDahab"
        className="fixed bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-30 rounded-2xl border border-[#DFC798]/50 bg-[#1E1E1E]/95 backdrop-blur-md p-3.5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <img
            src="/pwa-192x192.png"
            alt="eDahab"
            className="h-10 w-10 rounded-xl border border-[#DFC798]/40 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#E5E5E5] leading-snug">
              ثبّت تطبيق eDahab على شاشتك الرئيسية لمتابعة الأسعار لحظياً
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-[#DFC798] px-3 py-1.5 text-xs font-extrabold text-[#1A1A1A] hover:bg-[#C8A96A] transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isIOS ? 'خطوات التثبيت' : 'تثبيت الآن'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="min-h-[36px] px-2 text-xs font-semibold text-[#9E9E9E] hover:text-white"
              >
                لاحقاً
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="إخفاء بانر التثبيت"
            className="p-1 text-[#9E9E9E] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="دليل التثبيت على iOS"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] p-6 shadow-2xl text-[#E5E5E5]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-[#DFC798]">
                تثبيت eDahab على آيفون / آيباد
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798]"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-2.5 text-sm text-[#E5E5E5] leading-relaxed">
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#DFC798]">1.</span>
                <span>
                  اضغط على زر <strong>المشاركة (Share)</strong>{' '}
                  <Share className="inline h-4 w-4 mx-0.5 text-[#DFC798]" /> في شريط Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#DFC798]">2.</span>
                <span>
                  مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#DFC798] py-2.5 text-sm font-extrabold text-[#1A1A1A] transition hover:bg-[#C8A96A]"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};
