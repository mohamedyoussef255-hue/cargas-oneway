import React from 'react';
import { Station } from '../types/station';
import { useApp } from '../context/AppContext';
import { formatDistance, getGoogleMapsNavigationUrl } from '../utils/geo';
import { DEFAULT_CARGAS_LOGO } from '../utils/cargasLogo';
import {
  Navigation,
  MapPin,
  Phone,
  Flame,
  Droplets,
  Wrench,
  ShieldCheck,
  Clock,
  Gauge,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface StationCardProps {
  station: Station & { distance?: number };
  onFocusOnMap: (station: Station) => void;
  onViewDetails: (station: Station) => void;
  isSelected?: boolean;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  onFocusOnMap,
  onViewDetails,
  isSelected = false,
}) => {
  const { settings, userLocation } = useApp();
  const navUrl = getGoogleMapsNavigationUrl(station.lat, station.lng, station.name, userLocation);
  const stationLogo = station.logoUrl || settings.defaultStationLogoUrl || DEFAULT_CARGAS_LOGO;

  return (
    <div
      className={`group relative bg-white dark:bg-slate-800 rounded-2xl p-4 transition-all duration-200 border ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg bg-emerald-50/20 dark:bg-emerald-950/10'
          : 'border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-sm hover:shadow-md'
      }`}
    >
      {/* رأس البطاقة: الاسم والمسافة */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {stationLogo && (
            <img
              src={stationLogo}
              alt={station.name}
              className="w-10 h-10 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {station.company}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {station.governorate}
              </span>
            </div>

            <h3
              onClick={() => onFocusOnMap(station)}
              className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition cursor-pointer leading-snug line-clamp-1"
            >
              {station.name}
            </h3>
          </div>
        </div>

        {/* المسافة المحسوبة عبر هافرسين */}
        {station.distance !== undefined && (
          <div className="flex flex-col items-end shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800">
              <Navigation className="w-3 h-3 rotate-45" />
              {formatDistance(station.distance)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">عن موقعك</span>
          </div>
        )}
      </div>

      {/* العنوان وساعات العمل */}
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 flex items-start gap-1.5 leading-relaxed line-clamp-2">
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>{station.address}</span>
      </p>

      {/* شارات الخدمات المتاحة بالمحطة */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {station.services.cngRefuel && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <Flame className="w-3 h-3 text-emerald-600" />
            {settings.cngLabel || 'تموين غاز'}
          </span>
        )}
        {station.services.bpOilCenter && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
            <Droplets className="w-3 h-3 text-blue-600" />
            {settings.bpOilLabel || 'مركز زيوت BP متكامل'}
          </span>
        )}
        {station.services.canopyOilSales && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <Droplets className="w-3 h-3 text-cyan-600" />
            {settings.canopyOilLabel || 'بيع زيوت أسفل المظلة'}
          </span>
        )}
        {station.services.conversionMaintenance && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
            <Wrench className="w-3 h-3 text-amber-600" />
            {settings.maintenanceLabel || 'صيانة وتحويل'}
          </span>
        )}
        {station.services.cylinderTesting && (
          station.services.cylinderTestingUpcoming ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800 animate-pulse">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              <span>فحص أسطوانات (قريباً)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              <span>{settings.cylinderLabel || 'فحص أسطوانات'} (فعلي)</span>
            </span>
          )
        )}
      </div>

      {/* بيانات إضافية وسريعة: الضغط وساعات العمل */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 py-1.5 px-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          {station.workingHours || '24 ساعة'}
        </span>
        {station.pressure && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Gauge className="w-3 h-3" />
            {station.pressure}
          </span>
        )}
      </div>

      {/* أزرار الإجراءات: زر الملاحة المباشر عبر Google Maps وزر التركيز في الخريطة */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
        {/* زر التوجيه والملاحة الفوري مجاناً عبر تطبيق Google Maps الرسمي */}
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition duration-150"
          title="افتح الملاحة الصوتية الفورية في Google Maps"
        >
          <Navigation className="w-3.5 h-3.5 fill-current" />
          <span>{settings.navButtonText || 'ابدأ الملاحة'}</span>
        </a>

        {/* زر التركيز على الخريطة */}
        <button
          onClick={() => onFocusOnMap(station)}
          className="flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
          title="عرض على الخريطة التفاعلية"
        >
          <MapPin className="w-4 h-4" />
        </button>

        {/* زر التفاصيل الكاملة */}
        <button
          onClick={() => onViewDetails(station)}
          className="flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
          title="عرض كافة التفاصيل"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
