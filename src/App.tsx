import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { StationMap } from './components/StationMap';
import { StationCard } from './components/StationCard';
import { StationDetailModal } from './components/StationDetailModal';
import { AdminModal } from './components/AdminModal';
import { MoeenAssistant } from './components/MoeenAssistant';
import { Station } from './types/station';
import {
  Map,
  List,
  Columns,
  Navigation,
  Sparkles,
  Info,
  Flame,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    filteredStations,
    selectedStation,
    setSelectedStation,
    activeMapStation,
    setActiveMapStation,
    userLocation,
    locationError,
    requestUserLocation,
    isLocating,
    settings,
  } = useApp();

  // نمط العرض على الشاشات: خريطة + قائمة، خريطة فقط، أو قائمة فقط
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-['Cairo',sans-serif]">
      {/* رأس الصفحة مع الشعار وعداد النقرات السرية */}
      <Header />

      {/* الشريط التعريفي بالملاحة والتوجيه (يمكن للمدير إخفاؤه أو تعديل نصه بالكامل) */}
      {settings.showFreeNavBanner && (
        <div className="bg-gradient-to-l from-emerald-700 via-teal-800 to-slate-900 text-white py-2 px-4 shadow-sm text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/30 text-emerald-300">
                <Navigation className="w-3.5 h-3.5" />
              </span>
              <span>{settings.freeNavBannerText}</span>
            </div>

            {settings.showFooterCredits && (
              <span className="hidden md:inline-block text-[11px] text-emerald-200">
                {settings.footerCreditsText}
              </span>
            )}
          </div>
        </div>
      )}

      {/* تنبيه صلاحية الموقع إن وُجد */}
      {locationError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 w-full">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{locationError}</span>
            </div>
            <button
              onClick={() => requestUserLocation()}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
        {/* شريط البحث والفلاتر والبحث الصوتي */}
        <FilterBar />

        {/* أزرار تبديل وضع العرض على الموبايل والتابلت */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600 dark:text-slate-400">
            المحطات المتاحة ({filteredStations.length})
          </span>

          <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'split'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>عرض مشترك</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'map'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>الخريطة</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>القائمة</span>
            </button>
          </div>
        </div>

        {/* المساحة التفاعلية (خريطة وقائمة) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[550px]">
          {/* قسم الخريطة التفاعلية */}
          <div
            className={`transition-all duration-300 ${
              viewMode === 'map'
                ? 'col-span-12 h-[75vh]'
                : viewMode === 'list'
                ? 'hidden'
                : 'col-span-12 lg:col-span-7 h-[500px] lg:h-[720px]'
            }`}
          >
            <StationMap
              onStationSelect={(st) => {
                setSelectedStation(st);
              }}
              className="h-full border border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* قسم قائمة بطاقات المحطات */}
          <div
            className={`transition-all duration-300 ${
              viewMode === 'list'
                ? 'col-span-12'
                : viewMode === 'map'
                ? 'hidden'
                : 'col-span-12 lg:col-span-5 h-[500px] lg:h-[720px] overflow-y-auto pr-1'
            }`}
          >
            {filteredStations.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                  🔍
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  لا توجد محطات مطابقة للبحث أو الفلتر
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  جرب تغيير كلمات البحث، أو إلغاء فلاتر الأنشطة، أو رفع ملف محطات جديد من لوحة الإدارة.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isSelected={activeMapStation?.id === station.id}
                    onFocusOnMap={(st) => {
                      setActiveMapStation(st);
                      if (window.innerWidth < 1024) {
                        setViewMode('map');
                      }
                    }}
                    onViewDetails={(st) => setSelectedStation(st)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* المساعد الذكي "مُعين" */}
      <MoeenAssistant />

      {/* نافذة التفاصيل المنبثقة للمحطة */}
      <StationDetailModal
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
        onFocusOnMap={(st) => {
          setActiveMapStation(st);
          setViewMode('map');
        }}
      />

      {/* لوحة تحكم مدير النظام */}
      <AdminModal />

      {/* تذييل الصفحة الاحترافي المخصص بالكامل من لوحة الإدارة */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{settings.footerText}</span>
          {settings.showFooterCredits && (
            <span className="text-[11px] text-slate-400">
              {settings.footerCreditsText}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
