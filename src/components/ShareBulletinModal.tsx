import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, MessageCircle, Share2, X } from 'lucide-react';
import type { MarketDataSnapshot } from '../types/market.ts';
import { formatCurrencyValue, formatDateTimeYmdHms } from '../utils/formatters.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface ShareBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: MarketDataSnapshot;
}

type CardFormat = 'story' | 'square';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderPriceCardCanvas(data: MarketDataSnapshot, format: CardFormat): string {
  const width = 1080;
  const height = format === 'story' ? 1920 : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Matte Obsidian Background
  ctx.fillStyle = '#0E0E0E';
  ctx.fillRect(0, 0, width, height);

  // Top Champagne Gold Header Banner
  const headerH = format === 'story' ? 270 : 210;
  ctx.fillStyle = '#DFC798';
  drawRoundedRect(ctx, 0, 0, width, headerH, 0);
  ctx.fill();

  const isStory = format === 'story';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '800 68px Cairo, sans-serif';
  ctx.fillText('eDahab · أسعار الذهب', width / 2, isStory ? 120 : 95);

  ctx.font = '700 30px Cairo, sans-serif';
  ctx.fillText(
    `تحديث: ${formatDateTimeYmdHms(data.fetchedAt)}`,
    width / 2,
    isStory ? 195 : 155
  );

  // Outer Gold Border Frame
  ctx.strokeStyle = 'rgba(223, 199, 152, 0.35)';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 36, headerH + 30, width - 72, height - headerH - 110, 32);
  ctx.stroke();

  // Featured 21K Card
  const featY = headerH + (isStory ? 75 : 52);
  const featH = isStory ? 250 : 175;
  ctx.fillStyle = '#1E1E1E';
  ctx.strokeStyle = '#DFC798';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 76, featY, width - 152, featH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#DFC798';
  ctx.font = '800 34px Cairo, sans-serif';
  ctx.fillText('الذهب عيار 21 (المعيار الرئيسي)', width / 2, featY + (isStory ? 62 : 48));

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${isStory ? 74 : 58}px "IBM Plex Mono", Cairo, monospace`;
  ctx.fillText(
    `${formatCurrencyValue(data.gold.karat21.sell)} جنيه`,
    width / 2,
    featY + (isStory ? 152 : 114)
  );

  ctx.fillStyle = '#BDBDBD';
  ctx.font = '700 28px Cairo, sans-serif';
  ctx.fillText(
    `سعر الشراء: ${formatCurrencyValue(data.gold.karat21.buy)} جنيه`,
    width / 2,
    featY + (isStory ? 210 : 156)
  );

  const usdOfficial = data.currencies.find((c) => c.code === 'USD')?.officialSell;
  const rows = [
    {
      label: 'عيار 24',
      value: `بيع ${formatCurrencyValue(data.gold.karat24.sell)} · شراء ${formatCurrencyValue(
        data.gold.karat24.buy
      )} ج`,
    },
    {
      label: 'عيار 18',
      value: `بيع ${formatCurrencyValue(data.gold.karat18.sell)} · شراء ${formatCurrencyValue(
        data.gold.karat18.buy
      )} ج`,
    },
    {
      label: 'عيار 14',
      value: `بيع ${formatCurrencyValue(data.gold.karat14.sell)} · شراء ${formatCurrencyValue(
        data.gold.karat14.buy
      )} ج`,
    },
    {
      label: 'الجنيه الذهب',
      value: `${formatCurrencyValue(data.gold.goldPound.sell)} جنيه`,
    },
    {
      label: 'الأونصة العالمية',
      value: `$${formatCurrencyValue(data.gold.ounceUsd)}`,
    },
    {
      label: 'الدولار (الرسمي / الصاغة)',
      value: `${usdOfficial ? formatCurrencyValue(usdOfficial, 2) : '—'} / ${formatCurrencyValue(
        data.saghaUsd,
        2
      )} ج`,
    },
  ];

  const listStartY = featY + featH + (isStory ? 46 : 24);
  const rowH = isStory ? 142 : 70;
  const rowGap = isStory ? 20 : 10;

  rows.forEach((row, idx) => {
    const y = listStartY + idx * (rowH + rowGap);
    ctx.fillStyle = '#1E1E1E';
    ctx.strokeStyle = '#2E2E2E';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 76, y, width - 152, rowH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#DFC798';
    ctx.font = `700 ${isStory ? 32 : 25}px Cairo, sans-serif`;
    ctx.fillText(row.label, width - 116, y + rowH / 2 + 10);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${isStory ? 30 : 24}px Cairo, sans-serif`;
    ctx.fillText(row.value, 116, y + rowH / 2 + 10);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9E9E9E';
  ctx.font = '600 22px Cairo, sans-serif';
  ctx.fillText('Developed by Amir Lamay | Made In Egypt', width / 2, height - 38);

  return canvas.toDataURL('image/png');
}

export const ShareBulletinModal: React.FC<ShareBulletinModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [shareTab, setShareTab] = useState<'image' | 'text'>('image');
  const [cardFormat, setCardFormat] = useState<CardFormat>('story');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const bulletinText = useMemo(() => {
    const usdBank = data.currencies.find((c) => c.code === 'USD')?.officialSell;
    return [
      `📊 *نشرة أسعار الذهب والعملات في مصر (eDahab)*`,
      `🕒 تحديث: ${formatDateTimeYmdHms(data.fetchedAt)}`,
      ``,
      `🥇 *عيار 24:* بيع ${formatCurrencyValue(data.gold.karat24.sell)} جنيه | شراء ${formatCurrencyValue(data.gold.karat24.buy)} جنيه`,
      `✨ *عيار 21:* بيع ${formatCurrencyValue(data.gold.karat21.sell)} جنيه | شراء ${formatCurrencyValue(data.gold.karat21.buy)} جنيه`,
      `💛 *عيار 18:* بيع ${formatCurrencyValue(data.gold.karat18.sell)} جنيه | شراء ${formatCurrencyValue(data.gold.karat18.buy)} جنيه`,
      `🪙 *الجنيه الذهب:* ${formatCurrencyValue(data.gold.goldPound.sell)} جنيه`,
      `🌍 *الأونصة:* $${formatCurrencyValue(data.gold.ounceUsd)}`,
      ``,
      `💵 *دولار الصاغة:* ${formatCurrencyValue(data.saghaUsd, 2)} جنيه`,
      usdBank ? `🏦 *الدولار الرسمي:* ${formatCurrencyValue(usdBank, 2)} جنيه` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [data]);

  useEffect(() => {
    if (!isOpen || shareTab !== 'image') return;
    setImageDataUrl(renderPriceCardCanvas(data, cardFormat));
  }, [isOpen, shareTab, cardFormat, data]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    triggerHaptic(15);
    try {
      await navigator.clipboard.writeText(bulletinText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadImage = () => {
    if (!imageDataUrl) return;
    triggerHaptic(15);
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `eDahab-${cardFormat}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const handleShareImage = async () => {
    if (!imageDataUrl || !navigator.share) return;
    triggerHaptic(15);
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `eDahab-${cardFormat}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'نشرة أسعار الذهب - eDahab', files: [file] });
      } else {
        await navigator.share({ title: 'نشرة أسعار الذهب - eDahab', text: bulletinText });
      }
    } catch {
      // Cancelled
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(bulletinText)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="مشاركة نشرة الأسعار"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[#DFC798]/45 bg-[#1E1E1E] p-5 sm:p-6 shadow-2xl space-y-4 overflow-y-auto text-[#E5E5E5]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-[#3A352F] rounded-full mx-auto sm:hidden shrink-0" />

        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-base font-extrabold text-[#DFC798]">مشاركة نشرة الأسعار الآن</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#141414] border border-[#2E2E2E] shrink-0">
          <button
            type="button"
            onClick={() => setShareTab('image')}
            className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
              shareTab === 'image' ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD]'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>صورة للستوري</span>
          </button>
          <button
            type="button"
            onClick={() => setShareTab('text')}
            className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
              shareTab === 'text' ? 'bg-[#DFC798] text-[#1A1A1A]' : 'text-[#BDBDBD]'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>نشرة واتساب</span>
          </button>
        </div>

        {shareTab === 'image' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCardFormat('story')}
                className={`min-h-[38px] rounded-xl border text-xs font-bold transition ${
                  cardFormat === 'story'
                    ? 'border-[#DFC798] bg-[#DFC798]/15 text-[#DFC798]'
                    : 'border-[#2E2E2E] text-[#BDBDBD]'
                }`}
              >
                ستوري 9:16
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('square')}
                className={`min-h-[38px] rounded-xl border text-xs font-bold transition ${
                  cardFormat === 'square'
                    ? 'border-[#DFC798] bg-[#DFC798]/15 text-[#DFC798]'
                    : 'border-[#2E2E2E] text-[#BDBDBD]'
                }`}
              >
                مربع 1:1
              </button>
            </div>

            {imageDataUrl && (
              <div className="rounded-xl border border-[#2E2E2E] bg-[#0E0E0E] p-2 flex justify-center">
                <img
                  src={imageDataUrl}
                  alt="بطاقة أسعار الذهب eDahab"
                  className="max-h-72 w-auto rounded-lg object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#DFC798] hover:bg-[#C8A96A] px-3 py-2 text-xs sm:text-sm font-extrabold text-[#1A1A1A] transition"
              >
                <Download className="h-4 w-4" />
                <span>تحميل PNG</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                <button
                  type="button"
                  onClick={handleShareImage}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs sm:text-sm font-bold text-white transition"
                >
                  <Share2 className="h-4 w-4" />
                  <span>مشاركة</span>
                </button>
              ) : (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs sm:text-sm font-bold text-white transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>واتساب</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-xl bg-[#141414] border border-[#2E2E2E] p-3.5 text-xs leading-relaxed text-[#E5E5E5] font-sans max-h-60 overflow-y-auto">
              {bulletinText}
            </pre>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic(15)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs sm:text-sm font-bold text-white transition"
              >
                <MessageCircle className="h-4 w-4" />
                <span>واتساب</span>
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#DFC798] hover:bg-[#C8A96A] px-3 py-2 text-xs sm:text-sm font-extrabold text-[#1A1A1A] transition"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ النشرة'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
