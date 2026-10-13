import React, { useState } from 'react';
import { AppSettings } from '../../types/station';
import {
  Map,
  Key,
  Layers,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Globe2,
  Sparkles,
  Save,
  Check,
  RefreshCw,
} from 'lucide-react';

interface AdminMapApiTabProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  showToast: (msg: string) => void;
  onSaveAll: () => void;
}

export const AdminMapApiTab: React.FC<AdminMapApiTabProps> = ({
  settings,
  updateSettings,
  showToast,
  onSaveAll,
}) => {
  const [apiKey, setApiKey] = useState(settings.mapApiKey || '');
  const [mapProvider, setMapProvider] = useState<'free_osm_satellite' | 'google_maps' | 'custom'>(
    settings.mapProvider || 'free_osm_satellite'
  );
  const [customTileUrl, setCustomTileUrl] = useState(settings.customTileUrl || '');
  const [activeSystem, setActiveSystem] = useState<
    'satellite' | 'osm' | 'voyager' | 'dark' | 'topo' | 'hot'
  >(settings.activeMapSystem || 'voyager');
  const [showMapTypeSwitcher, setShowMapTypeSwitcher] = useState(
    settings.showMapTypeSwitcher ?? true
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    updateSettings({
      mapApiKey: apiKey.trim(),
      mapProvider,
      customTileUrl: customTileUrl.trim(),
      activeMapSystem: activeSystem,
      showMapTypeSwitcher,
    });
    // أيضاً حفظ تفضيل نظام الخريطة في التخزين المحلي
    localStorage.setItem('cargas_preferred_map_system', activeSystem);
    onSaveAll();
    setIsSaved(true);
    showToast('تم حفظ واعتماد إعدادات الخرائط ومفتاح API بنجاح! 🗺️');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* رأس التبويب */}
      <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
            <Map className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black">إعدادات أنظمة الخرائط ومفتاح API</h3>
            <p className="text-xs text-blue-100">
              تحكم كامل في جميع أنظمة الخريطة (أقمار صناعية، شوارع OSM، ملاحة عصرية، رؤية ليلية، تضاريس) وتخصيص مفتاح الـ API.
            </p>
          </div>
        </div>

        {/* حالة التشغيل الحالية */}
        <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>الخريطة تعمل حالياً بكامل طاقتها مجاناً وبدون أي مفتاح إجباري!</span>
          </div>
          <span className="bg-emerald-400 text-slate-900 px-2.5 py-0.5 rounded-full font-black text-[11px]">
            جاهز للاستخدام الفوري
          </span>
        </div>
      </div>

      {/* قسم إدخال مفتاح الـ API */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-700">
          <Key className="w-5 h-5 text-amber-500" />
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              مفتاح API الخاص بالخرائط (Google Maps / Mapbox / مخصص)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ضع مفتاح الـ API هنا في حال توفره أو في حالة طلبه مستقبلاً لربط مزود خارجي
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            مفتاح الـ API (API Key):
          </label>
          <div className="relative">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="مثال: AIzaSyDxxxxxxxxxxxxxxxxx أو pk.eyJ1xxxxxxxxxxxx"
              className="w-full py-2.5 px-3.5 pr-10 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Key className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {apiKey && (
              <button
                type="button"
                onClick={() => setApiKey('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-red-500 font-bold"
              >
                مسح
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
            <span>ℹ️</span>
            <span>
              إذا تُرك هذا الحقل فارغاً، يستمر التطبيق تلقائياً بالاعتماد على خوادم OpenStreetMap وأقمار Esri الصناعية فائقة الدقة مجاناً 100%.
            </span>
          </p>
        </div>

        {/* نوع مزود الخرائط */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            مزود خدمة الخرائط المعتمد:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col gap-1 text-xs ${
                mapProvider === 'free_osm_satellite'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-emerald-600" />
                  الأنظمة المفتوحة والأقمار
                </span>
                <input
                  type="radio"
                  name="mapProvider"
                  value="free_osm_satellite"
                  checked={mapProvider === 'free_osm_satellite'}
                  onChange={() => setMapProvider('free_osm_satellite')}
                  className="accent-emerald-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                مجاني 100% ولا يحتاج أي مفتاح إطلاقاً (OSM + Esri Satellite)
              </span>
            </label>

            <label
              className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col gap-1 text-xs ${
                mapProvider === 'google_maps'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-blue-600" />
                  Google Maps API
                </span>
                <input
                  type="radio"
                  name="mapProvider"
                  value="google_maps"
                  checked={mapProvider === 'google_maps'}
                  onChange={() => setMapProvider('google_maps')}
                  className="accent-blue-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                يتطلب مفتاح API صالح من Google Cloud Platform
              </span>
            </label>

            <label
              className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col gap-1 text-xs ${
                mapProvider === 'custom'
                  ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  خادم بلاطات مخصص
                </span>
                <input
                  type="radio"
                  name="mapProvider"
                  value="custom"
                  checked={mapProvider === 'custom'}
                  onChange={() => setMapProvider('custom')}
                  className="accent-purple-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Mapbox / خادم خرائط داخلي للشركة
              </span>
            </label>
          </div>
        </div>

        {/* حقل رابط الخادم المخصص عند اختياره */}
        {mapProvider === 'custom' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رابط خادم البلاطات المخصص (Tile URL Pattern):
            </label>
            <input
              type="text"
              value={customTileUrl}
              onChange={(e) => setCustomTileUrl(e.target.value)}
              placeholder="https://api.mapbox.com/styles/v1/.../tiles/{z}/{x}/{y}?access_token={key}"
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs"
            />
          </div>
        )}
      </div>

      {/* قسم جميع أنظمة الخريطة المتاحة */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-indigo-500" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                أنظمة الخرائط المتاحة في التطبيق (جميع الأنظمة مدمجة ومفعلة)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر النظام الافتراضي الذي تفتح عليه الخريطة للمستخدمين
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showMapTypeSwitcher}
              onChange={(e) => setShowMapTypeSwitcher(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <span>إظهار زر محول الأنظمة للمستخدم على الخريطة</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* 1. قمر صناعي */}
          <div
            onClick={() => setActiveSystem('satellite')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'satellite'
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                🛰️ قمر صناعي حقيقي (Satellite)
              </span>
              {activeSystem === 'satellite' && (
                <Check className="w-4 h-4 text-blue-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              صور جوية حقيقية عالية الدقة من أقمار Esri مع أسماء الشوارع والمدن.
            </p>
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold mt-auto">
              رؤية فضائية حقيقية للمحطات
            </span>
          </div>

          {/* 2. ملاحة عصرية */}
          <div
            onClick={() => setActiveSystem('voyager')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'voyager'
                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                🧭 ملاحة حديثة (Voyager)
              </span>
              {activeSystem === 'voyager' && (
                <Check className="w-4 h-4 text-emerald-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              خريطة ناصعة واضحة بتفاصيل الشوارع، مناسبة جداً للقيادة والبحث السريع.
            </p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold mt-auto">
              الأكثر وضوحاً في النهار
            </span>
          </div>

          {/* 3. شوارع OSM */}
          <div
            onClick={() => setActiveSystem('osm')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'osm'
                ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                🗺️ شوارع كلاسيك (OpenStreetMap)
              </span>
              {activeSystem === 'osm' && (
                <Check className="w-4 h-4 text-amber-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              قاعدة بيانات الشوارع والمباني العالمية القياسية 100% مفتوحة المصدر.
            </p>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-auto">
              أدق تفاصيل للمباني والأزقة
            </span>
          </div>

          {/* 4. الوضع الليلي */}
          <div
            onClick={() => setActiveSystem('dark')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'dark'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                🌙 رؤية ليلية (Dark Matter)
              </span>
              {activeSystem === 'dark' && (
                <Check className="w-4 h-4 text-indigo-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              خلفية داكنة مريحة للعين تبرز علامات المحطات والأنشطة كأضواء ساطعة.
            </p>
            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold mt-auto">
              مثالية في القيادة ليلاً
            </span>
          </div>

          {/* 5. تضاريس وطبوغرافيا */}
          <div
            onClick={() => setActiveSystem('topo')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'topo'
                ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 ring-2 ring-teal-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                ⛰️ تضاريس وطبوغرافيا (OpenTopo)
              </span>
              {activeSystem === 'topo' && (
                <Check className="w-4 h-4 text-teal-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              توضيح المرتفعات والجبال والمجاري المائية بدقة طبوغرافية عالية.
            </p>
            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold mt-auto">
              طبيعة وتضاريس الطرق
            </span>
          </div>

          {/* 6. نقل وشوارع حيوية */}
          <div
            onClick={() => setActiveSystem('hot')}
            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col gap-1.5 relative ${
              activeSystem === 'hot'
                ? 'border-rose-600 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-900 dark:text-white">
                🚦 شبكة طرق حيوية (HOT Transit)
              </span>
              {activeSystem === 'hot' && (
                <Check className="w-4 h-4 text-rose-600 font-bold" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              إبراز الطرق السريعة والمحاور والميادين بألوان واضحة للتنقل السريع.
            </p>
            <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold mt-auto">
              أسرع قراءة للطرق السريعة
            </span>
          </div>
        </div>
      </div>

      {/* زر الحفظ النهائي */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>يتم حفظ جميع التعديلات في التخزين المعتمد للمنظومة فوراً.</span>
        </div>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white transition-all shadow-lg cursor-pointer ${
            isSaved
              ? 'bg-emerald-600 shadow-emerald-600/30 ring-2 ring-emerald-400'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 hover:scale-[1.02]'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'تم حفظ واعتماد الإعدادات!' : 'حفظ إعدادات الخرائط ومفتاح API'}</span>
        </button>
      </div>
    </div>
  );
};
