import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  Moon,
  Sun,
  Bot,
  Crosshair,
  MapPin,
  ChevronDown,
} from 'lucide-react';

const EGYPTIAN_CITIES = [
  { name: 'القاهرة - وسط البلد', lat: 30.0444, lng: 31.2357 },
  { name: 'مدينة نصر ومصر الجديدة', lat: 30.0592, lng: 31.3621 },
  { name: 'التجمع والقاهرة الجديدة', lat: 30.0165, lng: 31.4398 },
  { name: 'المعادي وحلوان', lat: 29.9723, lng: 31.2985 },
  { name: 'الجيزة والهرم', lat: 29.9982, lng: 31.1712 },
  { name: '6 أكتوبر والشيخ زايد', lat: 29.9328, lng: 30.8992 },
  { name: 'الدقي والمهندسين', lat: 30.0401, lng: 31.2034 },
  { name: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
  { name: 'طنطا والغربية', lat: 30.7865, lng: 31.0003 },
  { name: 'المنصورة والدقهلية', lat: 31.0379, lng: 31.3815 },
  { name: 'السويس', lat: 29.9576, lng: 32.5518 },
  { name: 'الإسماعيلية', lat: 30.6042, lng: 32.2723 },
  { name: 'بورسعيد', lat: 31.2653, lng: 32.3019 },
  { name: 'أسيوط', lat: 27.1809, lng: 31.1837 },
];

export const Header: React.FC = () => {
  const {
    settings,
    theme,
    toggleTheme,
    setIsAdminOpen,
    isMoeenOpen,
    setIsMoeenOpen,
    userLocation,
    isLocating,
    requestUserLocation,
    setUserLocationManual,
    stations,
  } = useApp();

  // عداد نقرات فتح لوحة الإدارة السرية (5 نقرات على الشعار)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    if (nextCount >= 5) {
      setLogoClickCount(0);
      setIsAdminOpen(true);
    } else {
      setLogoClickCount(nextCount);
      // إعادة التصفير بعد 3 ثواني
      setTimeout(() => setLogoClickCount(0), 3000);
    }
  };

  // إحصائيات سريعة للأنشطة
  const cngCount = stations.filter((s) => s.services.cngRefuel).length;
  const bpCount = stations.filter((s) => s.services.bpOilCenter).length;
  const cylinderCount = stations.filter((s) => s.services.cylinderTesting).length;

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* الجانب الأيمن: الشعار واسم التطبيق (النقر 5 مرات يفتح الإدارة بكود 0000) */}
          <div className="flex items-center gap-3 select-none">
            <div
              onClick={handleLogoClick}
              className="relative cursor-pointer group transition-transform active:scale-90"
              title="انقر هنا 5 مرات لفتح لوحة تحكم مدير النظام"
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.appName}
                  className="w-11 h-11 object-contain rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 bg-white p-1"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20 group-hover:shadow-emerald-600/30 transition">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
              )}
              {logoClickCount > 0 && (
                <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow animate-bounce">
                  {5 - logoClickCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {settings.appName}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  مجاني 100%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md">
                {settings.appSubtitle}
              </p>
            </div>
          </div>

          {/* الجانب الأيسر: الإجراءات والإعدادات للمستخدم (بدون زر الإدارة الظاهر) */}
          <div className="flex items-center gap-2">
            {/* اختيار وتحديد الموقع الجغرافي (GPS + مدن يدوية) */}
            <div className="relative">
              <button
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  userLocation
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="تحديد أو تغيير موقعك الجغرافي"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : ''}`} />
                <span className="hidden sm:inline">موقعي</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* القائمة المنسدلة لاختيار المدينة أو تشغيل الـ GPS */}
              {showLocationPicker && (
                <div
                  className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-right text-xs"
                  dir="rtl"
                >
                  <button
                    onClick={async () => {
                      setShowLocationPicker(false);
                      await requestUserLocation();
                    }}
                    className="w-full px-3 py-2 text-right font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-between border-b border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>تحديد وتحديث موقعي تلقائياً</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">تلقائي</span>
                  </button>

                  <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold">
                    أو اختر أقرب منطقة لك:
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    {EGYPTIAN_CITIES.map((city) => (
                      <button
                        key={city.name}
                        onClick={() => {
                          setUserLocationManual(city.lat, city.lng, city.name);
                          setShowLocationPicker(false);
                        }}
                        className="w-full px-3 py-1.5 text-right hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                      >
                        <span>{city.name}</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* زر فتح المساعد "مُعين" */}
            {settings.enableMoeen && (
              <button
                onClick={() => setIsMoeenOpen(!isMoeenOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition"
                title="تحدث مع مُعين"
              >
                <Bot className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">مُعين</span>
              </button>
            )}

            {/* تبديل الثيم الداكن / الفاتح */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* شريط الإحصائيات المختصر تحت الهيدر */}
        {stations.length > 0 && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 overflow-x-auto no-scrollbar">
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              شبكة المحطات: <strong className="text-emerald-600">{stations.length}</strong> محطة
            </span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">
              تموين غاز: <strong className="text-emerald-600">{cngCount}</strong>
            </span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">
              زيوت BP كاسترول: <strong className="text-blue-600">{bpCount}</strong>
            </span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">
              فحص أسطوانات: <strong className="text-purple-600">{cylinderCount}</strong>
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
