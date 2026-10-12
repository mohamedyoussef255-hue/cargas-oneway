import React, { useState } from 'react';
import { Station } from '../types/station';
import { useApp } from '../context/AppContext';
import { getGoogleMapsNavigationUrl, formatDistance, copyCoordinatesToClipboard, getGoogleMapsViewUrl } from '../utils/geo';
import {
  X,
  Navigation,
  MapPin,
  Phone,
  Clock,
  Gauge,
  Flame,
  Droplets,
  Wrench,
  ShieldCheck,
  Sparkles,
  Share2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface StationDetailModalProps {
  station: (Station & { distance?: number }) | null;
  onClose: () => void;
  onFocusOnMap: (station: Station) => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({
  station,
  onClose,
  onFocusOnMap,
}) => {
  const { settings } = useApp();
  const [copied, setCopied] = useState(false);

  if (!station) return null;

  const navUrl = getGoogleMapsNavigationUrl(station.lat, station.lng, station.name);
  const viewUrl = getGoogleMapsViewUrl(station.lat, station.lng);
  const stationLogo = station.logoUrl || settings.defaultStationLogoUrl;

  const handleCopy = async () => {
    const success = await copyCoordinatesToClipboard(station.lat, station.lng);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden text-right"
        dir="rtl"
      >
        {/* رأس المودال مع خلفية متدرجة */}
        <div className="relative bg-gradient-to-l from-emerald-600 via-teal-700 to-slate-800 text-white p-6">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur">
              {station.company}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/40">
              {station.governorate}
            </span>
          </div>

          <h2 className="text-xl font-black leading-tight mb-2">{station.name}</h2>

          <div className="flex items-center gap-3 text-xs text-emerald-100">
            {station.distance !== undefined && (
              <span className="font-bold flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg">
                <Navigation className="w-3.5 h-3.5 rotate-45" />
                تبعد {formatDistance(station.distance)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {station.workingHours || '24 ساعة'}
            </span>
          </div>
        </div>

        {/* محتوى التفاصيل */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* العنوان والإحداثيات */}
          <div className="bg-slate-50 dark:bg-slate-700/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
            <div className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{station.address}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-500">
              <span>الإحداثيات: {station.lat.toFixed(5)}, {station.lng.toFixed(5)}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ الإحداثيات'}</span>
              </button>
            </div>
          </div>

          {/* الخدمات والأنشطة المتوفرة */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              الخدمات والأنشطة المتاحة بالمحطة
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${
                  station.services.cngRefuel
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
                }`}
              >
                <Flame className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settings.cngLabel || 'تموين غاز طبيعي (CNG)'}</span>
              </div>

              <div
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${
                  station.services.bpOilCenter
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
                }`}
              >
                <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{settings.bpOilLabel || 'مركز زيوت BP كاسترول'}</span>
              </div>

              <div
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${
                  station.services.conversionMaintenance
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{settings.maintenanceLabel || 'تحويل وصيانة سيارات'}</span>
              </div>

              <div
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold ${
                  station.services.cylinderTesting
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through opacity-60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{settings.cylinderLabel || 'فحص واختبار أسطوانات'}</span>
              </div>
            </div>
          </div>

          {/* البيانات التشغيلية وملاحظات */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">ضغط الغاز التشغيلي</span>
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-600" />
                {station.pressure || '220 بار قياسي'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
              <span className="text-slate-400 block mb-1">ساعات العمل</span>
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                {station.workingHours || '24 ساعة متواصلة'}
              </span>
            </div>
          </div>

          {station.notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold block mb-0.5">ملاحظات المحطة:</span>
              <p>{station.notes}</p>
            </div>
          )}

          {station.phone && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-xs">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> هاتف المحطة: {station.phone}
              </span>
              <a
                href={`tel:${station.phone}`}
                className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition"
              >
                اتصال الآن
              </a>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
          {/* زر التوجيه والملاحة الفورية عبر Google Maps */}
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition duration-150"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>{settings.navButtonText || 'ابدأ الملاحة في Google Maps'}</span>
          </a>

          <button
            onClick={() => {
              onFocusOnMap(station);
              onClose();
            }}
            className="p-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-600 transition"
            title="عرض على الخريطة التفاعلية"
          >
            <MapPin className="w-5 h-5 text-emerald-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
