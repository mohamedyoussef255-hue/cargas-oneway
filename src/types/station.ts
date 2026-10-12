export interface StationServices {
  cngRefuel: boolean;             // تموين غاز طبيعي
  conversionMaintenance: boolean; // تحويل وصيانة سيارات
  bpOilCenter: boolean;           // مركز زيوت BP / Castrol
  cylinderTesting: boolean;       // فحص واختبار أسطوانات
  carWash?: boolean;              // غسيل سيارات
  convenienceStore?: boolean;     // سوبرماركت / كشك
  evCharging?: boolean;           // شحن سيارات كهربائية
  cafe?: boolean;                 // كافيه ومشروبات
}

export interface Station {
  id: string;
  name: string;
  company: string; // كارجاس، غازتك، ماستر غاز، طاقة، إلخ
  lat: number;
  lng: number;
  address: string;
  governorate: string;
  city?: string;
  services: StationServices;
  phone?: string;
  workingHours?: string;
  status: 'active' | 'maintenance' | 'busy' | 'closed';
  pressure?: string; // ضغط الغاز (مثلاً 220 بار)
  notes?: string;
  rating?: number;
  logoUrl?: string; // شعار مخصص للمحطة
  updatedAt?: string;
}

export interface AppSettings {
  // الهوية واللوجو
  appName: string;
  appSubtitle: string;
  logoUrl: string | null; // لوجو التطبيق الرئيسي
  defaultStationLogoUrl?: string | null; // لوجو عام لجميع المحطات على الخريطة
  adminPin: string;

  // إعدادات المساعد مُعين
  enableMoeen: boolean;
  moeenVoiceEnabled: boolean;
  moeenGreetingText: string;

  // التحكم في ظهور وإخفاء الأيقونات وعناصر الواجهة
  showLocationButton: boolean;       // أيقونة وزر موقعي (GPS)
  showThemeToggle: boolean;          // أيقونة الوضع الليلي / النهاري
  showStatsBar: boolean;             // شريط إحصائيات المحطات
  showFilterBar: boolean;            // شريط البحث والفلاتر
  showClosestButton: boolean;        // زر أقرب محطة
  showVoiceSearchButton: boolean;    // زر البحث الصوتي
  showMapLocateButton: boolean;      // زر موقعي على الخريطة
  showMapPickButton: boolean;        // زر التحديد بالخريطة
  showMapQuickCng: boolean;          // زر أقرب محطة غاز السريع على الخريطة
  showMapQuickCylinder: boolean;     // زر فحص الأسطوانات السريع على الخريطة
  showMapQuickBp: boolean;           // زر زيوت BP السريع على الخريطة
  showMapTypeSwitcher: boolean;      // أزرار نمط الخريطة
  showStationCards: boolean;         // بطاقات وقائمة المحطات

  // التحكم في نصوص وعناوين الواجهة
  showFreeNavBanner: boolean;
  freeNavBannerText: string;
  navButtonText: string;
  closestStationButtonText: string;
  voiceSearchButtonText: string;

  // تسميات الأنشطة
  cngLabel: string;
  bpOilLabel: string;
  maintenanceLabel: string;
  cylinderLabel: string;

  // التحكم في التذييل والحقوق
  showFooterCredits: boolean;
  footerText: string;
  footerCreditsText: string;
  showCompanyInfo: boolean;
  companyName: string;

  // بنتونة الألوان ومظهر التطبيق الشامل
  paletteId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: 'light' | 'dark' | 'auto';

  // الخريطة والمظهر
  defaultMapCenter: [number, number];
  defaultZoom: number;
}
