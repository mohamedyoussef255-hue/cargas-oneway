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

  // الخريطة والمظهر
  accentColor: 'emerald' | 'blue' | 'amber' | 'slate';
  defaultMapCenter: [number, number];
  defaultZoom: number;
}
