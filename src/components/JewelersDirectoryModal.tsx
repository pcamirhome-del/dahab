import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { loadFavoriteJewelers, saveFavoriteJewelers } from '../services/storageService.ts';
import type { GovernorateId, JewelerDirectoryEntry } from '../types/market.ts';
import { triggerHaptic } from '../utils/haptics.ts';

interface JewelersDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOVERNORATES: Array<{ id: 'all' | GovernorateId; label: string }> = [
  { id: 'all', label: 'كل المحافظات' },
  { id: 'cairo-sagha', label: 'القاهرة - الصاغة والحسين' },
  { id: 'nasr-heliopolis', label: 'مدينة نصر ومصر الجديدة' },
  { id: 'maadi', label: 'المعادي' },
  { id: 'giza-zayed', label: 'الجيزة والمهندسين والشيخ زايد' },
  { id: 'alexandria', label: 'الإسكندرية' },
  { id: 'delta-upper', label: 'الدلتا والصعيد' },
];

const OFFICIAL_HUBS: JewelerDirectoryEntry[] = [
  {
    id: 'hub-sagha-cairo',
    name: 'سوق الصاغة التاريخي — شارع المعز لدين الله',
    governorate: 'cairo-sagha',
    governorateLabel: 'القاهرة - الصاغة والحسين',
    address: 'حي الجمالية، خان الخليلي، وسط القاهرة — المركز الرئيسي لتسعير الذهب في مصر',
    mapsQuery: 'سوق الصاغة شارع المعز القاهرة',
    specialty: 'سبائك · جنيهات ذهب · مشغولات جملة وتجزئة',
  },
  {
    id: 'hub-btc-cairo',
    name: 'فروع BTC الرسمية (Bullion Trading Center)',
    governorate: 'cairo-sagha',
    governorateLabel: 'القاهرة - الصاغة والحسين',
    address: 'مجمع الصاغة بالجمالية ومراكز التوزيع المعتمدة بالقاهرة',
    phone: '15283',
    mapsQuery: 'BTC Gold Egypt الصاغة القاهرة',
    specialty: 'سبائك عيار 24 · جنيهات مغلفة · استرداد مضمون',
  },
  {
    id: 'hub-heliopolis',
    name: 'صاغة وموزعو مصر الجديدة وروكسي ومدينة نصر',
    governorate: 'nasr-heliopolis',
    governorateLabel: 'مدينة نصر ومصر الجديدة',
    address: 'شارع إبراهيم اللقاني (روكسي) ومحيط سيتي ستارز وشارع عباس العقاد',
    mapsQuery: 'محلات ذهب روكسي مصر الجديدة مدينة نصر',
    specialty: 'توكيلات السبائك المعتمدة والمشغولات الحديثة',
  },
  {
    id: 'hub-maadi',
    name: 'صاغة المعادي وموزعو السبائك',
    governorate: 'maadi',
    governorateLabel: 'المعادي',
    address: 'شارع 9 المعادي وميدان الحرية والمنطقة التجارية',
    mapsQuery: 'محلات ذهب شارع 9 المعادي القاهرة',
    specialty: 'سبائك سويس جولد وBTC · مشغولات عيار 21 و18',
  },
  {
    id: 'hub-giza-zayed',
    name: 'صاغة الجيزة والمهندسين والشيخ زايد',
    governorate: 'giza-zayed',
    governorateLabel: 'الجيزة والمهندسين والشيخ زايد',
    address: 'جامعة الدول العربية بالمهندسين، ومراكز التسوق بالشيخ زايد وأكتوبر',
    mapsQuery: 'محلات ذهب وموزعي سبائك الشيخ زايد والمهندسين',
    specialty: 'موزعون معتمدون للسبائك والعملات الذهبية',
  },
  {
    id: 'hub-alexandria',
    name: 'صاغة الإسكندرية (سوق المنشية والزنقة)',
    governorate: 'alexandria',
    governorateLabel: 'الإسكندرية',
    address: 'سوق الذهب بالمنشية وسموحة ومحطة الرمل، الإسكندرية',
    mapsQuery: 'سوق الذهب المنشية الإسكندرية',
    specialty: 'المركز الرئيسي للذهب والسبائك بالإسكندرية',
  },
  {
    id: 'hub-delta-upper',
    name: 'أسواق الصاغة الرئيسية بالدلتا والصعيد',
    governorate: 'delta-upper',
    governorateLabel: 'الدلتا والصعيد',
    address: 'طنطا (شارع الخان)، المنصورة (السكة الجديدة)، الزقازيق، أسيوط، والأقصر',
    mapsQuery: 'شارع الصاغة طنطا المنصورة مصر',
    specialty: 'مراكز تجارة الذهب عيار 21 والعملات الذهبية بالمحافظات',
  },
];

export const JewelersDirectoryModal: React.FC<JewelersDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGov, setSelectedGov] = useState<'all' | GovernorateId>('all');
  const [savedJewelers, setSavedJewelers] = useState<JewelerDirectoryEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customGov, setCustomGov] = useState<GovernorateId>('cairo-sagha');
  const [customPhone, setCustomPhone] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  useEffect(() => {
    loadFavoriteJewelers<JewelerDirectoryEntry>().then(setSavedJewelers);
  }, []);

  const combinedEntries = useMemo(() => {
    const all = [...savedJewelers, ...OFFICIAL_HUBS];
    const q = searchQuery.trim().toLowerCase();

    return all.filter((entry) => {
      if (selectedGov !== 'all' && entry.governorate !== selectedGov) return false;
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.address.toLowerCase().includes(q) ||
        entry.governorateLabel.toLowerCase().includes(q) ||
        entry.specialty.toLowerCase().includes(q)
      );
    });
  }, [savedJewelers, searchQuery, selectedGov]);

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    triggerHaptic(15);

    const govLabel =
      GOVERNORATES.find((g) => g.id === customGov)?.label ?? 'القاهرة - الصاغة والحسين';

    const newEntry: JewelerDirectoryEntry = {
      id: `user-${Date.now()}`,
      name: customName.trim(),
      governorate: customGov,
      governorateLabel: govLabel,
      address: customAddress.trim() || govLabel,
      phone: customPhone.trim() || undefined,
      mapsQuery: `${customName.trim()} ${customAddress.trim() || govLabel}`,
      specialty: 'صائغك المفضل المحفوظ',
      isUserSaved: true,
    };

    const next = [newEntry, ...savedJewelers];
    setSavedJewelers(next);
    saveFavoriteJewelers(next);

    setCustomName('');
    setCustomPhone('');
    setCustomAddress('');
    setShowAddForm(false);
  };

  const handleDeleteCustom = (id: string) => {
    triggerHaptic(15);
    const next = savedJewelers.filter((j) => j.id !== id);
    setSavedJewelers(next);
    saveFavoriteJewelers(next);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="دليل الصاغة والموزعين في مصر"
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
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#DFC798]">
                  دليل الصاغة وموزعي السبائك
                </h2>
                <p className="text-xs text-[#9E9E9E]">
                  مناطق الصاغة المعتمدة في مصر مع إمكانية حفظ بطاقة صائغك المفضل
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-[#2E2E2E] text-[#DFC798]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="relative">
              <Search className="h-4 w-4 text-[#9E9E9E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالمنطقة أو اسم الموزع..."
                className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#141414] pr-9 pl-3 py-2 text-base text-white focus:border-[#DFC798] focus:outline-none"
              />
            </div>

            <select
              aria-label="تصفية حسب المحافظة"
              value={selectedGov}
              onChange={(e) => setSelectedGov(e.target.value as 'all' | GovernorateId)}
              className="w-full min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#141414] px-3 py-2 text-base font-semibold text-white focus:border-[#DFC798] focus:outline-none"
            >
              {GOVERNORATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DFC798]/45 bg-[#DFC798]/10 px-3 py-2 text-xs font-bold text-[#DFC798] hover:bg-[#DFC798]/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? 'إلغاء الإضافة' : 'حفظ بيانات صائغك المفضل محلياً'}</span>
          </button>

          {showAddForm && (
            <form
              onSubmit={handleSaveCustom}
              className="rounded-xl border border-[#2E2E2E] bg-[#141414] p-3.5 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="اسم المحل أو الصائغ"
                  className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base text-white focus:border-[#DFC798] focus:outline-none"
                />
                <select
                  value={customGov}
                  onChange={(e) => setCustomGov(e.target.value as GovernorateId)}
                  className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base text-white focus:border-[#DFC798] focus:outline-none"
                >
                  {GOVERNORATES.filter((g) => g.id !== 'all').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="رقم الهاتف (اختياري)"
                  className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base font-mono-num text-white focus:border-[#DFC798] focus:outline-none"
                />
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="العنوان التفصيلي"
                  className="min-h-[44px] rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-base text-white focus:border-[#DFC798] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] rounded-xl bg-[#DFC798] text-xs sm:text-sm font-extrabold text-[#1A1A1A] hover:bg-[#C8A96A] transition"
              >
                حفظ في دليلك الشخصي
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {combinedEntries.map((entry) => {
            const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              entry.mapsQuery
            )}`;
            return (
              <article
                key={entry.id}
                className={`rounded-xl border p-4 space-y-2.5 ${
                  entry.isUserSaved
                    ? 'border-[#DFC798]/50 bg-[#DFC798]/10'
                    : 'border-[#2E2E2E] bg-[#141414]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#DFC798]">{entry.governorateLabel}</div>
                    <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      {entry.name}
                    </h3>
                  </div>

                  {entry.isUserSaved && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(entry.id)}
                      aria-label={`حذف ${entry.name}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#9E9E9E] hover:text-[#E53935]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#BDBDBD] leading-relaxed">{entry.address}</p>
                <p className="text-[11px] text-[#9E9E9E]">{entry.specialty}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-xs font-bold text-[#E5E5E5] hover:border-[#DFC798]/60 transition"
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#DFC798]" />
                    <span>الموقع على الخريطة</span>
                  </a>

                  {entry.phone && (
                    <a
                      href={`tel:${entry.phone.replace(/[^\d+]/g, '')}`}
                      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#DFC798] px-3.5 py-1.5 text-xs font-extrabold text-[#1A1A1A] hover:bg-[#C8A96A] transition"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span className="font-mono-num">{entry.phone}</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}

          {combinedEntries.length === 0 && (
            <p className="text-center text-sm text-[#9E9E9E] py-8">
              لا توجد نتائج مطابقة لبحثك.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
