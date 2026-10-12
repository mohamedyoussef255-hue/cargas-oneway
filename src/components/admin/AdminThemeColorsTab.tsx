import React, { useState } from 'react';
import { AppSettings } from '../../types/station';
import { PRESET_PALETTES, ColorPalette, applyThemeToDocument } from '../../utils/themePalettes';
import {
  Palette,
  Sun,
  Moon,
  Sparkles,
  Check,
  Save,
  RotateCcw,
  Navigation,
  Eye,
  Flame,
  Droplets,
  ShieldCheck,
} from 'lucide-react';

interface AdminThemeColorsTabProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  showToast: (msg: string) => void;
  onSaveAll: () => void;
}

export const AdminThemeColorsTab: React.FC<AdminThemeColorsTabProps> = ({
  settings,
  updateSettings,
  theme,
  setTheme,
  showToast,
  onSaveAll,
}) => {
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>(settings.paletteId || 'cargas_emerald');
  const [primaryColor, setPrimaryColor] = useState<string>(settings.primaryColor || '#059669');
  const [secondaryColor, setSecondaryColor] = useState<string>(settings.secondaryColor || '#0d9488');
  const [accentColor, setAccentColor] = useState<string>(settings.accentColor || '#10b981');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(settings.themeMode || theme);

  // اختيار بنتونة جاهزة
  const handleSelectPalette = (palette: ColorPalette) => {
    setSelectedPaletteId(palette.id);
    setPrimaryColor(palette.primary);
    setSecondaryColor(palette.secondary);
    setAccentColor(palette.accent);

    // تطبيق فوري على كامل عناصر التطبيق
    applyThemeToDocument(palette.primary, palette.secondary, palette.accent);
    updateSettings({
      paletteId: palette.id,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
    });
    showToast(`تم تطبيق بنتونة: ${palette.name}`);
  };

  // تغيير لون مخصص يدوي
  const handleCustomColorChange = (
    type: 'primary' | 'secondary' | 'accent',
    value: string
  ) => {
    setSelectedPaletteId('custom');
    let p = primaryColor;
    let s = secondaryColor;
    let a = accentColor;

    if (type === 'primary') {
      p = value;
      setPrimaryColor(value);
    } else if (type === 'secondary') {
      s = value;
      setSecondaryColor(value);
    } else {
      a = value;
      setAccentColor(value);
    }

    applyThemeToDocument(p, s, a);
    updateSettings({
      paletteId: 'custom',
      primaryColor: p,
      secondaryColor: s,
      accentColor: a,
    });
  };

  // تبديل النظام النهاري والليلي
  const handleThemeModeChange = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
    if (mode === 'auto') {
      const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(isDark ? 'dark' : 'light');
    } else {
      setTheme(mode);
    }
    updateSettings({ themeMode: mode });
    showToast(mode === 'dark' ? 'تم تفعيل الوضع الليلي 🌙' : mode === 'light' ? 'تم تفعيل الوضع النهاري ☀️' : 'تم ضبط المظهر تلقائياً');
  };

  // استعادة الألوان الافتراضية لكارجاس
  const handleResetToDefault = () => {
    const defaultPalette = PRESET_PALETTES[0];
    handleSelectPalette(defaultPalette);
    showToast('تمت استعادة ألوان كارجاس الزمردية الافتراضية');
  };

  // حفظ وتثبيت الألوان في التخزين الدائم
  const handleSaveColors = () => {
    updateSettings({
      paletteId: selectedPaletteId,
      primaryColor,
      secondaryColor,
      accentColor,
      themeMode,
    });
    applyThemeToDocument(primaryColor, secondaryColor, accentColor);
    onSaveAll();
    showToast('تم حفظ وتثبيت بنتونة الألوان والمظهر في المنظومة بنجاح!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-right" dir="rtl">
      {/* الترويسة التعريفية */}
      <div
        className="p-5 rounded-2xl shadow-md border text-white transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          borderColor: accentColor,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-white/20 rounded-xl backdrop-blur">
                <Palette className="w-5 h-5 text-white" />
              </span>
              <h3 className="text-lg font-black tracking-tight">
                بنتونة الألوان ومظهر التطبيق الشامل
              </h3>
            </div>
            <p className="text-xs text-white/90 mt-1 max-w-xl leading-relaxed">
              تحكم كامل في هوية وألوان التطبيق والخريطة والأزرار، مع إمكانية التبديل بين النظام النهاري والليلي وتخصيص كود أي لون بدقة.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition backdrop-blur"
              title="استعادة ألوان كارجاس الأصلية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الأصل</span>
            </button>
            <button
              onClick={handleSaveColors}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black transition shadow-lg"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>تثبيت الألوان</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. تفعيل النظام النهاري والليلي (Light / Dark Mode) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                النظام النهاري والليلي (Light & Dark Mode)
              </h4>
              <p className="text-[11px] text-slate-500">
                تفعيل النمط المفضل لصفحات التطبيق والخريطة
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {theme === 'dark' ? 'الوضع الليلي نشط' : 'الوضع النهاري نشط'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* خيار الوضع النهاري */}
          <button
            onClick={() => handleThemeModeChange('light')}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
              theme === 'light' && themeMode === 'light'
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-400 bg-slate-50/50 dark:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <Sun className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  الوضع النهاري (فاتح)
                </span>
                <span className="text-[10px] text-slate-500">خلفيات بيضاء ووضوح عالي</span>
              </div>
            </div>
            {theme === 'light' && themeMode === 'light' && (
              <Check className="w-4 h-4 text-amber-600" />
            )}
          </button>

          {/* خيار الوضع الليلي */}
          <button
            onClick={() => handleThemeModeChange('dark')}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
              theme === 'dark' && themeMode === 'dark'
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-900/60 text-indigo-400 flex items-center justify-center font-bold">
                <Moon className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  الوضع الليلي (داكن)
                </span>
                <span className="text-[10px] text-slate-500">مريح للعين وموفر للطاقة</span>
              </div>
            </div>
            {theme === 'dark' && themeMode === 'dark' && (
              <Check className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* خيار تلقائي حسب جهاز المستخدم */}
          <button
            onClick={() => handleThemeModeChange('auto')}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
              themeMode === 'auto'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  تلقائي ذكي
                </span>
                <span className="text-[10px] text-slate-500">حسب إعداد جهاز المستخدم</span>
              </div>
            </div>
            {themeMode === 'auto' && (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
          </button>
        </div>
      </div>

      {/* 2. بنتونة الألوان الرسمية المعتمدة (Preset Palettes) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-600" />
            <span>بنتونة الألوان الرسمية المعتمدة (اختر بنتونة لتطبيقها فوراً)</span>
          </h4>
          <p className="text-[11px] text-slate-500">
            مجموعات متناسقة معتمدة لقطاع البترول والغاز والمحطات
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_PALETTES.map((pal) => {
            const isSelected = selectedPaletteId === pal.id;
            return (
              <div
                key={pal.id}
                onClick={() => handleSelectPalette(pal)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative group ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-slate-50/40 dark:bg-slate-900/30 hover:shadow-xs'
                }`}
              >
                {/* عينات الألوان الثلاثية في البنتونة */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div
                    className="w-7 h-7 rounded-lg shadow-xs border border-black/10 shrink-0"
                    style={{ backgroundColor: pal.primary }}
                    title={`الرئيسي: ${pal.primary}`}
                  />
                  <div
                    className="w-5 h-5 rounded-lg shadow-xs border border-black/10 shrink-0"
                    style={{ backgroundColor: pal.secondary }}
                    title={`الثانوي: ${pal.secondary}`}
                  />
                  <div
                    className="w-4 h-4 rounded-lg shadow-xs border border-black/10 shrink-0"
                    style={{ backgroundColor: pal.accent }}
                    title={`التمييز: ${pal.accent}`}
                  />
                  {isSelected && (
                    <span className="mr-auto w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                </div>

                <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-1">
                  {pal.name}
                </h5>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {pal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. التخصيص اليدوي لبنتونة الألوان (Custom HEX Picker) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>التخصيص اليدوي للبنتونة (كود HEX حر)</span>
          </h4>
          <p className="text-[11px] text-slate-500">
            حدد أي كود لون مخصص بدقة بواسطة أداة اختيار الألوان أو كتابة كود الـ HEX
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
          {/* اللون الرئيسي */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              اللون الرئيسي (Primary)
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                className="w-full font-mono text-xs font-bold uppercase bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              للأزرار الرئيسية والهيدر والعلامات النشطة
            </span>
          </div>

          {/* اللون الثانوي */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              اللون الثانوي (Secondary)
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                className="w-full font-mono text-xs font-bold uppercase bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              للتدرجات والظلال والشارات المساندة
            </span>
          </div>

          {/* لون التمييز */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              لون التمييز (Accent)
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                className="w-full font-mono text-xs font-bold uppercase bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              للحلقات التفاعلية وحواف البطاقات
            </span>
          </div>
        </div>
      </div>

      {/* 4. المعاينة المباشرة للمظهر (Live Preview) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-600" />
          <span>معاينة حية للمظهر والأزرار بالألوان الجديدة</span>
        </h4>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-4">
          {/* شريط ملاحة تجريبي */}
          <div
            className="p-3 rounded-xl text-white flex items-center justify-between text-xs font-bold shadow-sm"
            style={{
              background: `linear-gradient(to left, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span>شريط الملاحة: ملاحة مجانية 100% عبر Google Maps</span>
            </div>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
              معاينة فورية
            </span>
          </div>

          {/* أزرار وشارات تجريبية */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="flex items-center gap-2 px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition"
              style={{ backgroundColor: primaryColor }}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>ابدأ الملاحة في Google Maps</span>
            </button>

            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border text-white"
              style={{
                backgroundColor: primaryColor,
                borderColor: accentColor,
              }}
            >
              <Flame className="w-3.5 h-3.5" />
              تموين غاز 220 بار
            </span>

            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border text-white"
              style={{
                backgroundColor: secondaryColor,
                borderColor: accentColor,
              }}
            >
              <Droplets className="w-3.5 h-3.5" />
              زيوت BP كاسترول
            </span>

            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border text-white"
              style={{
                backgroundColor: accentColor,
                borderColor: primaryColor,
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              فحص الأسطوانات
            </span>
          </div>
        </div>
      </div>

      {/* زر الحفظ النهائي */}
      <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
        <span className="text-xs text-emerald-900 dark:text-emerald-200 font-bold">
          الألوان تطبق فوراً وتُحفظ بصورة دائمة لكافة الزوار والمستخدمين.
        </span>

        <button
          onClick={handleSaveColors}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition"
        >
          <Save className="w-4 h-4" />
          <span>حفظ وتثبيت الألوان والمظهر الآن</span>
        </button>
      </div>
    </div>
  );
};
