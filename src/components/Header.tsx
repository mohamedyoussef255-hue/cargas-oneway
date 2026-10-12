import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  Moon,
  Sun,
  Bot,
  Crosshair,
} from 'lucide-react';

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
    stations,
  } = useApp();

  // عداد نقرات فتح لوحة الإدارة السرية (5 نقرات على الشعار)
  const [logoClickCount, setLogoClickCount] = useState(0);

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
            {/* زر تحديد الموقع الحالي بالـ GPS مباشرة بدون أي قوائم منسدلة */}
            {settings.showLocationButton && (
              <button
                onClick={() => requestUserLocation(true)}
                disabled={isLocating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  userLocation
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                } active:scale-95 shadow-xs`}
                title="تحديد وتحديث موقعك الحالي بالـ GPS فوراً"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : 'text-blue-500'}`} />
                <span className="hidden sm:inline">{isLocating ? 'جارِ تحديد موقعك...' : 'موقعي'}</span>
              </button>
            )}

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
            {settings.showThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* شريط الإحصائيات المختصر تحت الهيدر */}
        {settings.showStatsBar && stations.length > 0 && (
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
