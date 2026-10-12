import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Station } from '../types/station';
import { parseKmlOrKmzFile, exportStationsToKml } from '../utils/kmlParser';
import {
  X,
  Upload,
  FileCode,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  RotateCcw,
  Palette,
  Settings,
  Flame,
  Droplets,
  Wrench,
  ShieldCheck,
  Search,
  Lock,
  Image as ImageIcon,
  Check,
  Type,
  CheckSquare,
} from 'lucide-react';

export const AdminModal: React.FC = () => {
  const {
    isAdminOpen,
    setIsAdminOpen,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    stations,
    addStation,
    updateStation,
    deleteStation,
    importStations,
    clearAllStations,
    applyStationLogo,
    clearStationLogo,
    settings,
    updateSettings,
    normalizeAllStations,
    saveAllDataNow,
  } = useApp();

  // نموذج تسجيل الدخول بالرقم السري
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // التبويب النشط
  const [activeTab, setActiveTab] = useState<'kml_upload' | 'station_logos' | 'stations_crud' | 'text_control' | 'branding_settings'>('stations_crud');

  // حالة استيراد ملفات KML / KMZ
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    count?: number;
    errors?: string[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // حالة لوجو المحطات
  const [stationLogoPreview, setStationLogoPreview] = useState<string | null>(settings.defaultStationLogoUrl || null);
  const [selectedStationIdsForLogo, setSelectedStationIdsForLogo] = useState<string[]>([]);
  const [logoTargetMode, setLogoTargetMode] = useState<'all' | 'selected'>('all');
  const [stationLogoSuccess, setStationLogoSuccess] = useState(false);

  // حالة إضافة / تعديل محطة يدوياً
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [crudSearch, setCrudSearch] = useState('');

  // حالة الحذف وتأكيد الحذف بدون confirm() المحجوبة في الـ iframe
  const [stationToDelete, setStationToDelete] = useState<Station | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);

  // حالة حفظ التعديلات العامة
  const [globalSaveSuccess, setGlobalSaveSuccess] = useState<boolean>(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3000);
  };

  // نموذج محطة جديدة
  const [formData, setFormData] = useState<Omit<Station, 'id'>>({
    name: '',
    company: 'كارجاس - Cargas',
    lat: 30.0444,
    lng: 31.2357,
    address: '',
    governorate: 'القاهرة',
    city: '',
    services: {
      cngRefuel: true,
      conversionMaintenance: false,
      bpOilCenter: false,
      cylinderTesting: false,
      carWash: false,
      convenienceStore: false,
    },
    workingHours: '24 ساعة',
    status: 'active',
    pressure: '220 بار',
    phone: '',
    notes: '',
  });

  // حالة إعدادات النصوص والعناوين
  const [textSettings, setTextSettings] = useState({
    appName: settings.appName,
    appSubtitle: settings.appSubtitle,
    showFreeNavBanner: settings.showFreeNavBanner,
    freeNavBannerText: settings.freeNavBannerText,
    navButtonText: settings.navButtonText,
    closestStationButtonText: settings.closestStationButtonText,
    voiceSearchButtonText: settings.voiceSearchButtonText,
    cngLabel: settings.cngLabel,
    bpOilLabel: settings.bpOilLabel,
    maintenanceLabel: settings.maintenanceLabel,
    cylinderLabel: settings.cylinderLabel,
    moeenGreetingText: settings.moeenGreetingText,
    footerText: settings.footerText,
    showFooterCredits: settings.showFooterCredits,
    footerCreditsText: settings.footerCreditsText,
    showCompanyInfo: settings.showCompanyInfo,
    companyName: settings.companyName,
  });

  // حالة الباسورد والشعار
  const [newPin, setNewPin] = useState(settings.adminPin);

  // زر حفظ كافة التعديلات والتغييرات العامة
  const handleSaveAllChanges = () => {
    updateSettings({
      ...textSettings,
      adminPin: newPin,
    });
    saveAllDataNow();
    setGlobalSaveSuccess(true);
    showToast('تم حفظ كافة التعديلات والتغييرات بنجاح في قاعدة البيانات المحلية!');
    setTimeout(() => setGlobalSaveSuccess(false), 3500);
  };

  // تطبيق قاعدة كارجاس الكاملة وتوحيد الأسماء والخدمات وإلغاء التكرارات 1 و 2
  const handleApplyCargasRules = () => {
    normalizeAllStations();
    showToast('تم تطبيق قاعدة كارجاس: توحيد الأسماء، تفعيل تموين غاز وزيوت، وإلغاء المحطات المكررة 1 و 2!');
  };

  if (!isAdminOpen) return null;

  // شاشة تسجيل الدخول برقم المرور (PIN)
  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
        <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 text-right border border-slate-200 dark:border-slate-700" dir="rtl">
          <button
            onClick={() => setIsAdminOpen(false)}
            className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">
            لوحة تحكم مدير النظام
          </h3>
          <p className="text-xs text-slate-500 text-center mb-5">
            أدخل رمز المرور السري (الافتراضي: <strong>0000</strong>) للدخول
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ok = loginAdmin(pinInput);
              if (!ok) {
                setPinError(true);
              }
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="password"
                maxLength={10}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="رمز المرور (PIN)"
                className="w-full text-center tracking-widest text-xl font-bold py-3 bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 text-center">
                  رمز المرور غير صحيح! الرمز الافتراضي هو 0000
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow transition"
            >
              دخول الإدارة
            </button>
          </form>
        </div>
      </div>
    );
  }

  // معالجة رفع ملف KMZ أو KML
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportStatus(null);

    const result = await parseKmlOrKmzFile(file);

    if (result.success && result.stations.length > 0) {
      importStations(result.stations, importMode);
      setImportStatus({
        success: true,
        message: `تم بنجاح استخراج ${result.stations.length} محطة من ملف "${file.name}" وتحديث الخريطة فوراً!`,
        count: result.stations.length,
        errors: result.errors,
      });
      showToast(`تم استيراد ${result.stations.length} محطة بنجاح!`);
    } else {
      setImportStatus({
        success: false,
        message: 'فشل استيراد المحطات من الملف المحدد.',
        errors: result.errors.length > 0 ? result.errors : ['تأكد من احتواء الملف على علامات Placemark وإحداثيات صحيحة'],
      });
    }

    setIsProcessingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // تصدير المحطات الحالية لـ KML
  const handleExportKml = () => {
    if (stations.length === 0) {
      showToast('لا توجد محطات لتصديرها حالياً');
      return;
    }
    const kml = exportStationsToKml(stations, settings.appName);
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stations-export-${new Date().toISOString().slice(0, 10)}.kml`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف KML بنجاح!');
  };

  // تحميل لوجو المحطات المرفوع من الكمبيوتر
  const handleStationLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStationLogoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // تطبيق لوجو المحطات الجديد
  const handleApplyStationLogo = () => {
    if (!stationLogoPreview) {
      showToast('يرجى اختيار صورة اللوجو أولاً من جهازك');
      return;
    }

    if (logoTargetMode === 'all') {
      applyStationLogo(stationLogoPreview);
    } else {
      if (selectedStationIdsForLogo.length === 0) {
        showToast('يرجى تحديد محطة واحدة على الأقل');
        return;
      }
      applyStationLogo(stationLogoPreview, selectedStationIdsForLogo);
    }

    setStationLogoSuccess(true);
    setTimeout(() => setStationLogoSuccess(false), 3000);
    showToast('تم تعميم اللوجو على الخريطة بنجاح!');
  };

  // إزالة لوجو المحطات
  const handleClearStationLogo = () => {
    clearStationLogo(logoTargetMode === 'selected' ? selectedStationIdsForLogo : undefined);
    setStationLogoPreview(null);
    showToast('تمت إزالة لوجو المحطات واستعادة الأيقونات الافتراضية.');
  };

  // تحديد / إلغاء تحديد كافة المحطات لتطبيق اللوجو
  const handleToggleSelectAllForLogo = () => {
    if (selectedStationIdsForLogo.length === stations.length) {
      setSelectedStationIdsForLogo([]);
    } else {
      setSelectedStationIdsForLogo(stations.map((s) => s.id));
    }
  };

  // فتح نموذج إضافة محطة جديدة
  const handleOpenAddForm = () => {
    setEditingStation(null);
    setFormData({
      name: '',
      company: 'كارجاس - Cargas',
      lat: 30.0444,
      lng: 31.2357,
      address: '',
      governorate: 'القاهرة',
      city: '',
      services: {
        cngRefuel: true,
        conversionMaintenance: false,
        bpOilCenter: false,
        cylinderTesting: false,
        carWash: false,
        convenienceStore: false,
      },
      workingHours: '24 ساعة',
      status: 'active',
      pressure: '220 بار',
      phone: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  // فتح نموذج تعديل محطة
  const handleOpenEditForm = (st: Station) => {
    setEditingStation(st);
    setFormData({
      name: st.name,
      company: st.company,
      lat: st.lat,
      lng: st.lng,
      address: st.address,
      governorate: st.governorate,
      city: st.city || '',
      services: { ...st.services },
      workingHours: st.workingHours || '24 ساعة',
      status: st.status,
      pressure: st.pressure || '220 بار',
      phone: st.phone || '',
      notes: st.notes || '',
    });
    setIsFormOpen(true);
  };

  // حفظ المحطة
  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingStation) {
      updateStation({
        ...editingStation,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      showToast(`تم تعديل محطة "${formData.name}" بنجاح!`);
    } else {
      addStation({
        ...formData,
        id: `station-manual-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      });
      showToast(`تمت إضافة محطة "${formData.name}" بنجاح!`);
    }
    setIsFormOpen(false);
  };

  // تحميل لوجو التطبيق الرئيسي
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateSettings({ logoUrl: reader.result });
        showToast('تم تحديث شعار التطبيق الرئيسي!');
      }
    };
    reader.readAsDataURL(file);
  };

  // تصفية المحطات في جدول الإدارة
  const crudFiltered = stations.filter((s) => {
    if (!crudSearch) return true;
    const q = crudSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || s.governorate.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh] overflow-hidden text-right"
        dir="rtl"
      >
        {/* إشعار الحفظ العام العائم */}
        {globalSaveSuccess && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-2.5 rounded-2xl shadow-2xl font-black text-xs sm:text-sm flex items-center gap-2 border border-white/20 animate-bounce">
            <CheckCircle className="w-5 h-5" />
            <span>تم حفظ وتثبيت كافة التعديلات والتغييرات بنجاح!</span>
          </div>
        )}

        {/* إشعار عائم عام */}
        {adminToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-60 bg-slate-900 text-white px-5 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border border-slate-700 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{adminToast}</span>
          </div>
        )}

        {/* شريط الرأس مع زر الحفظ العام وزر الإغلاق */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-lg shadow">
              ⚙️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight flex items-center gap-2">
                لوحة تحكم مدير النظام
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  تحكم شامل
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                إدارة المحطات، تعميم اللوجو، حفظ التعديلات، وحذف المحطات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* زر حفظ التعديلات والتغييرات المطلوب في الهيدر */}
            <button
              onClick={handleSaveAllChanges}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition"
              title="حفظ وتثبيت كافة التعديلات في النظام"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات والتغييرات</span>
            </button>

            <button
              onClick={logoutAdmin}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-bold transition"
            >
              خروج
            </button>
            <button
              onClick={() => setIsAdminOpen(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* أشرطة التبويب الرئيسية */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-2 border-b border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('stations_crud')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'stations_crud'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>إدارة المحطات ({stations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kml_upload')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'kml_upload'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استيراد ملفات KMZ</span>
          </button>

          <button
            onClick={() => setActiveTab('station_logos')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'station_logos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>لوجو المحطات والخريطة</span>
          </button>

          <button
            onClick={() => setActiveTab('text_control')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'text_control'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>التحكم في النصوص والعناوين</span>
          </button>

          <button
            onClick={() => setActiveTab('branding_settings')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition ${
              activeTab === 'branding_settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>شعار التطبيق وكلمة السر</span>
          </button>
        </div>

        {/* المحتوى الداخلي للتبويبات */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ===================== التبويب 1: إدارة المحطات (CRUD وحذف المحطات) ===================== */}
          {activeTab === 'stations_crud' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={crudSearch}
                    onChange={(e) => setCrudSearch(e.target.value)}
                    placeholder="بحث سريع في المحطات..."
                    className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleApplyCargasRules}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow transition shrink-0"
                    title="توحيد جميع المحطات لتبدأ بـ كارجاس، إزالة الترقيم 1 و 2، وتفعيل تموين الغاز والزيوت"
                  >
                    <Flame className="w-4 h-4" />
                    <span>توحيد كارجاس والزيوت والغاز</span>
                  </button>

                  <button
                    onClick={handleSaveAllChanges}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow transition shrink-0"
                    title="حفظ كافة التعديلات والتغييرات فوراً في قاعدة البيانات"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات والتغييرات</span>
                  </button>

                  <button
                    onClick={handleOpenAddForm}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs shadow transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة محطة يدوياً</span>
                  </button>
                </div>
              </div>

              {/* جدول المحطات مع زر الحذف والإلغاء المباشر */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">اللوجو</th>
                        <th className="p-3">اسم المحطة</th>
                        <th className="p-3">المحافظة</th>
                        <th className="p-3">الأنشطة (Checkboxes)</th>
                        <th className="p-3">الإحداثيات</th>
                        <th className="p-3 text-center">حذف / تعديل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {crudFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            لا توجد محطات مسجلة حالياً. استخدم تبويب "استيراد ملفات KMZ" لرفع ملف محطاتك أو زر "إضافة محطة يدوياً".
                          </td>
                        </tr>
                      ) : (
                        crudFiltered.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                            <td className="p-3">
                              {st.logoUrl || settings.defaultStationLogoUrl ? (
                                <img
                                  src={st.logoUrl || settings.defaultStationLogoUrl!}
                                  alt="لوجو"
                                  className="w-8 h-8 object-contain rounded-lg border bg-white p-0.5"
                                />
                              ) : (
                                <span className="text-slate-400 text-[10px]">افتراضي</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                              {st.name}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {st.governorate}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {st.services.cngRefuel && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                                    {settings.cngLabel || 'غاز'}
                                  </span>
                                )}
                                {st.services.bpOilCenter && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">
                                    {settings.bpOilLabel || 'BP زيوت'}
                                  </span>
                                )}
                                {st.services.conversionMaintenance && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                                    {settings.maintenanceLabel || 'صيانة'}
                                  </span>
                                )}
                                {st.services.cylinderTesting && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                                    {settings.cylinderLabel || 'فحص'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                              {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditForm(st)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                                  title="تعديل المحطة"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {/* زر إلغاء وحذف المحطة الفوري */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteStation(st.id);
                                    showToast(`تم إلغاء وحذف محطة "${st.name}" بنجاح!`);
                                  }}
                                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition"
                                  title="إلغاء وحذف المحطة فوراً"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== التبويب 2: استيراد ملفات KMZ ===================== */}
          {activeTab === 'kml_upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-6 bg-slate-50 dark:bg-slate-700/30 border-2 border-dashed border-emerald-500/40 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    رفع واستيراد ملف المحطات (KMZ أو KML)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                    اختر ملف KMZ ليتم استخراج الإحداثيات وتحديث قاعدة البيانات والخريطة فوراً.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-emerald-600"
                    />
                    <span>استبدال كافة البيانات والاحتفاظ فقط بالملف المرفوع</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-emerald-600"
                    />
                    <span>دمج وإلحاق بالبيانات الموجودة</span>
                  </label>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".kml,.kmz"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="kmz-file-picker"
                  />
                  <label
                    htmlFor="kmz-file-picker"
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white cursor-pointer transition shadow-lg ${
                      isProcessingFile
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isProcessingFile ? 'جاري معالجة الملف واستخراج المحطات...' : 'اختر ملف .KMZ أو .KML من الكمبيوتر'}</span>
                  </label>
                </div>
              </div>

              {/* تقرير نتيجة الاستيراد */}
              {importStatus && (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                    importStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {importStatus.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>

                  {importStatus.errors && importStatus.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                      {importStatus.errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* زر مسح البيانات وتصفير المحطات */}
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    مسح المحطات الحالية ({stations.length} محطة)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    يمكنك مسحها والبدء بملف KMZ جديد نظيف.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportKml}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير KML</span>
                  </button>
                  <button
                    onClick={() => setShowClearAllModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح كافة المحطات الآن</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== التبويب 3: تخصيص وتعميم لوجو المحطات على الخريطة ===================== */}
          {activeTab === 'station_logos' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      رفع لوجو المحطات من جهازك وتعميمه على الخريطة
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ارفع لوجو مخصص ليظهر مباشرة داخل علامة كل محطة على الخريطة وفي بطاقات المحطات.
                    </p>
                  </div>
                </div>

                {/* منطقة اختيار اللوجو ومعاينته */}
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {stationLogoPreview ? (
                      <img src={stationLogoPreview} alt="لوجو المحطة" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow">
                      <Upload className="w-4 h-4" />
                      <span>اختر صورة اللوجو من الكمبيوتر</span>
                      <input type="file" accept="image/*" onChange={handleStationLogoUpload} className="hidden" />
                    </label>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      يدعم صيغ PNG, SVG, JPG (يفضل خلفية شفافة).
                    </span>
                  </div>

                  {stationLogoPreview && (
                    <button
                      onClick={handleClearStationLogo}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      إلغاء اللوجو
                    </button>
                  )}
                </div>

                {/* خيار التطبيق */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    نطاق تطبيق اللوجو الجديد:
                  </span>

                  <div className="flex items-center gap-4 text-xs font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="logoTargetMode"
                        value="all"
                        checked={logoTargetMode === 'all'}
                        onChange={() => setLogoTargetMode('all')}
                        className="accent-emerald-600"
                      />
                      <span>تحديد الكل وتعميم اللوجو على كافة المحطات في الشبكة ({stations.length} محطة)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="logoTargetMode"
                        value="selected"
                        checked={logoTargetMode === 'selected'}
                        onChange={() => setLogoTargetMode('selected')}
                        className="accent-emerald-600"
                      />
                      <span>تطبيق على محطات مختارة فقط ({selectedStationIdsForLogo.length} محددة)</span>
                    </label>
                  </div>

                  {/* قائمة المحطات لاختيار محدد */}
                  {logoTargetMode === 'selected' && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 text-xs">
                        <span className="text-slate-500 font-semibold">اختر المحطات المراد تغيير اللوجو لها:</span>
                        <button
                          onClick={handleToggleSelectAllForLogo}
                          className="text-emerald-600 hover:underline font-bold"
                        >
                          {selectedStationIdsForLogo.length === stations.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        {stations.map((st) => {
                          const isChecked = selectedStationIdsForLogo.includes(st.id);
                          return (
                            <label
                              key={st.id}
                              className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStationIdsForLogo([...selectedStationIdsForLogo, st.id]);
                                  } else {
                                    setSelectedStationIdsForLogo(
                                      selectedStationIdsForLogo.filter((id) => id !== st.id)
                                    );
                                  }
                                }}
                                className="w-4 h-4 accent-emerald-600 rounded"
                              />
                              <span className="font-bold text-slate-800 dark:text-white">{st.name}</span>
                              <span className="text-[10px] text-slate-400">({st.governorate})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleApplyStationLogo}
                      disabled={!stationLogoPreview}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white transition shadow ${
                        stationLogoPreview
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                          : 'bg-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>تطبيق وتعميم اللوجو فوراً على الخريطة</span>
                    </button>

                    {stationLogoSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                        <CheckCircle className="w-4 h-4" /> تم تعميم اللوجو وتحديث علامات الخريطة بنجاح!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== التبويب 4: التحكم الكامل في كافة النصوص والعناوين ===================== */}
          {activeTab === 'text_control' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-600">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Type className="w-4 h-4 text-emerald-600" />
                      التحكم الكامل في كافة الكلمات والعناوين الظاهرة للمستخدم
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      يمكنك كمدير للنظام تعديل أي كلمة، تسمية، زر، أو إخفاء أي عبارة تماماً من صفحات المستخدمين.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveAllChanges}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ التعديلات</span>
                  </button>
                </div>

                {/* 1. اسم التطبيق والوصف */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم التطبيق في الهيدر:
                    </label>
                    <input
                      type="text"
                      value={textSettings.appName}
                      onChange={(e) => setTextSettings({ ...textSettings, appName: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الوصف الفرعي في الهيدر:
                    </label>
                    <input
                      type="text"
                      value={textSettings.appSubtitle}
                      onChange={(e) => setTextSettings({ ...textSettings, appSubtitle: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>

                {/* 2. شريط الملاحة والتوجيه العلوي */}
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      الشريط التوضيحي العلوي (شريط الملاحة المجانية):
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={textSettings.showFreeNavBanner}
                        onChange={(e) => setTextSettings({ ...textSettings, showFreeNavBanner: e.target.checked })}
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <span>{textSettings.showFreeNavBanner ? 'ظاهر للمستخدم' : 'مخفي تماماً'}</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={textSettings.freeNavBannerText}
                    onChange={(e) => setTextSettings({ ...textSettings, freeNavBannerText: e.target.value })}
                    placeholder="نص الشريط العلوي..."
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600"
                  />
                </div>

                {/* 3. أسماء الأنشطة والخدمات الأربعة */}
                <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    تسميات الأنشطة الأربعة (أزرار الفلترة وشارات البطاقات):
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">نشاط الغاز الطبيعي:</label>
                      <input
                        type="text"
                        value={textSettings.cngLabel}
                        onChange={(e) => setTextSettings({ ...textSettings, cngLabel: e.target.value })}
                        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">نشاط الزيوت:</label>
                      <input
                        type="text"
                        value={textSettings.bpOilLabel}
                        onChange={(e) => setTextSettings({ ...textSettings, bpOilLabel: e.target.value })}
                        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">نشاط الصيانة والتحويل:</label>
                      <input
                        type="text"
                        value={textSettings.maintenanceLabel}
                        onChange={(e) => setTextSettings({ ...textSettings, maintenanceLabel: e.target.value })}
                        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">نشاط فحص الأسطوانات:</label>
                      <input
                        type="text"
                        value={textSettings.cylinderLabel}
                        onChange={(e) => setTextSettings({ ...textSettings, cylinderLabel: e.target.value })}
                        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. نصوص أزرار الإجراءات */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نص زر الملاحة:
                    </label>
                    <input
                      type="text"
                      value={textSettings.navButtonText}
                      onChange={(e) => setTextSettings({ ...textSettings, navButtonText: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نص زر أقرب محطة:
                    </label>
                    <input
                      type="text"
                      value={textSettings.closestStationButtonText}
                      onChange={(e) => setTextSettings({ ...textSettings, closestStationButtonText: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نص زر البحث الصوتي:
                    </label>
                    <input
                      type="text"
                      value={textSettings.voiceSearchButtonText}
                      onChange={(e) => setTextSettings({ ...textSettings, voiceSearchButtonText: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>

                {/* 5. نص ترحيب المساعد الذكي مُعين */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رسالة الترحيب المنطوقة للمساعد الذكي "مُعين":
                  </label>
                  <textarea
                    rows={2}
                    value={textSettings.moeenGreetingText}
                    onChange={(e) => setTextSettings({ ...textSettings, moeenGreetingText: e.target.value })}
                    className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 leading-relaxed"
                  />
                </div>

                {/* 6. التحكم في ظهور أو إخفاء شركة عزوتي وحقوق التطوير */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        إظهار أو إخفاء اسم الشركة والمطور:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        مخفية افتراضياً ويمكنك إظهارها أو إلغاؤها بضغطة زر واحدة.
                      </span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                      <input
                        type="checkbox"
                        checked={textSettings.showFooterCredits}
                        onChange={(e) => setTextSettings({ ...textSettings, showFooterCredits: e.target.checked })}
                        className="w-5 h-5 accent-emerald-600 rounded"
                      />
                      <span>{textSettings.showFooterCredits ? 'مُفعل وظاهر' : 'مخفي تماماً'}</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">نص حقوق التذييل الرئيسي (Footer):</label>
                    <input
                      type="text"
                      value={textSettings.footerText}
                      onChange={(e) => setTextSettings({ ...textSettings, footerText: e.target.value })}
                      className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>

                  {textSettings.showFooterCredits && (
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">نص بيانات المطور والشركة:</label>
                      <input
                        type="text"
                        value={textSettings.footerCreditsText}
                        onChange={(e) => setTextSettings({ ...textSettings, footerCreditsText: e.target.value })}
                        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                      />
                    </div>
                  )}
                </div>

                {/* زر الحفظ النهائي للنصوص */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveAllChanges}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>تطبيق وحفظ كافة النصوص والعناوين</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== التبويب 5: لوجو التطبيق وكلمة السر ===================== */}
          {activeTab === 'branding_settings' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600" />
                  شعار التطبيق الرئيسي (Header Logo)
                </h4>

                <div>
                  <div className="flex items-center gap-3">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="w-14 h-14 object-contain rounded-2xl border p-1 bg-white shadow"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow">
                        ⛽
                      </div>
                    )}
                    <div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold cursor-pointer transition">
                        <Upload className="w-4 h-4" />
                        <span>رفع شعار التطبيق من الكمبيوتر</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {settings.logoUrl && (
                        <button
                          onClick={() => {
                            updateSettings({ logoUrl: null });
                            showToast('تمت استعادة الشعار الافتراضي');
                          }}
                          className="text-xs text-rose-600 hover:underline block mt-1"
                        >
                          استعادة الشعار الافتراضي
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* رمز المرور السري (الباسورد 0000 مع إمكانية التعديل) */}
              <div className="bg-slate-50 dark:bg-slate-700/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  كلمة السر لمدير النظام (Admin PIN)
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  تُطلب هذه الكلمة عند النقر 5 مرات على شعار التطبيق. الباسورد الافتراضي هو <strong>0000</strong>، ويمكنك تغييره هنا في أي وقت.
                </p>
                <div className="max-w-xs">
                  <input
                    type="text"
                    maxLength={10}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="0000"
                    className="w-full py-2 px-3 text-sm font-mono tracking-widest text-center font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>

              {/* زر الحفظ العام */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAllChanges}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ كلمة السر وإعدادات الشعار</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===================== نافذة تأكيد حذف محطة فردية ===================== */}
        {stationToDelete && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 text-right border border-slate-200 dark:border-slate-700" dir="rtl">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white text-center mb-1">
                تأكيد حذف المحطة
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 text-center mb-5 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف محطة <strong>"{stationToDelete.name}"</strong> نهائياً من قاعدة البيانات والخريطة؟
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    deleteStation(stationToDelete.id);
                    showToast(`تم حذف محطة "${stationToDelete.name}" بنجاح!`);
                    setStationToDelete(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  نعم، تأكيد الحذف
                </button>
                <button
                  onClick={() => setStationToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== نافذة تأكيد مسح كافة المحطات ===================== */}
        {showClearAllModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 text-right border border-slate-200 dark:border-slate-700" dir="rtl">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white text-center mb-1">
                مسح كافة المحطات الحالية
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 text-center mb-5 leading-relaxed">
                هل أنت متأكد من مسح جميع المحطات ({stations.length} محطة)؟ سيتم تصفير البيانات للبدء برفع ملف KMZ جديد.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearAllStations();
                    setShowClearAllModal(false);
                    showToast('تم مسح وتصفير كافة المحطات بنجاح!');
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  نعم، مسح الكل الآن
                </button>
                <button
                  onClick={() => setShowClearAllModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== مودال إضافة وتعديل محطة ===================== */}
        {isFormOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 text-right overflow-y-auto max-h-[85vh]" dir="rtl">
              <button
                onClick={() => setIsFormOpen(false)}
                className="absolute left-4 top-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4">
                {editingStation ? 'تعديل بيانات المحطة والأنشطة' : 'إضافة محطة جديدة يدوياً'}
              </h3>

              <form onSubmit={handleSaveStation} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">اسم المحطة:</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: كارجاس - محطة النزهة"
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">الشركة المشغلة:</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="كارجاس، غازتك، طاقة..."
                      className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">المحافظة:</label>
                    <input
                      type="text"
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      placeholder="القاهرة، الجيزة، الإسكندرية..."
                      className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">العنوان التفصيلي:</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="الشارع، المعلم الرئيسي، الحي..."
                    className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">خط العرض (Latitude):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">خط الطول (Longitude):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 font-mono"
                    />
                  </div>
                </div>

                {/* مربعات اختيار الأنشطة (Checkboxes) */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 space-y-2.5">
                  <span className="font-bold block text-slate-800 dark:text-white">
                    الأنشطة والخدمات المتاحة بالمحطة (Checkboxes):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-700 dark:text-emerald-300">
                      <input
                        type="checkbox"
                        checked={formData.services.cngRefuel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, cngRefuel: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <span>{settings.cngLabel || 'تموين غاز'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-700 dark:text-blue-300">
                      <input
                        type="checkbox"
                        checked={formData.services.bpOilCenter}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, bpOilCenter: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>{settings.bpOilLabel || 'مركز زيوت BP'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-700 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={formData.services.conversionMaintenance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, conversionMaintenance: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-amber-600 rounded"
                      />
                      <span>{settings.maintenanceLabel || 'صيانة وتحويل'}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-700 dark:text-purple-300">
                      <input
                        type="checkbox"
                        checked={formData.services.cylinderTesting}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            services: { ...formData.services, cylinderTesting: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-purple-600 rounded"
                      />
                      <span>{settings.cylinderLabel || 'فحص أسطوانات'}</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  {/* زر حذف المحطة من داخل شاشة التعديل */}
                  {editingStation && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteStation(editingStation.id);
                        setIsFormOpen(false);
                        showToast(`تم إلغاء وحذف محطة "${editingStation.name}" بنجاح!`);
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold border border-rose-200 transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف وإلغاء هذه المحطة</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 mr-auto">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                    >
                      حفظ المحطة
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
