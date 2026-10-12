import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Station, StationServices, AppSettings } from '../types/station';
import { calculateHaversineDistance } from '../utils/geo';
import { applyCargasNetworkRules, normalizeCargasStationName } from '../utils/cargasRules';

interface AppContextType {
  stations: Station[];
  filteredStations: (Station & { distance?: number })[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  userLocation: { lat: number; lng: number } | null;
  isLocating: boolean;
  locationError: string | null;
  requestUserLocation: () => Promise<{ lat: number; lng: number } | null>;
  setUserLocationManual: (lat: number, lng: number, label?: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedService: keyof StationServices | 'all';
  setSelectedService: (s: keyof StationServices | 'all') => void;
  selectedGovernorate: string;
  setSelectedGovernorate: (g: string) => void;
  selectedStation: Station | null;
  setSelectedStation: (s: Station | null) => void;
  activeMapStation: Station | null;
  setActiveMapStation: (s: Station | null) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (o: boolean) => void;
  isAdminAuthenticated: boolean;
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  isMoeenOpen: boolean;
  setIsMoeenOpen: (o: boolean) => void;
  addStation: (station: Station) => void;
  updateStation: (station: Station) => void;
  deleteStation: (id: string) => void;
  importStations: (newStations: Station[], mode: 'append' | 'replace') => void;
  clearAllStations: () => void;
  normalizeAllStations: () => void;
  saveAllDataNow: () => boolean;
  applyStationLogo: (logoUrl: string, targetStationIds?: string[]) => void;
  clearStationLogo: (targetStationIds?: string[]) => void;
  findClosestStation: (service?: keyof StationServices) => (Station & { distance?: number }) | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'كارجاس وخدمات الغاز - محطاتك',
  appSubtitle: 'المنظومة الذكية لمحطات الغاز الطبيعي، زيوت BP، الصيانة وفحص الأسطوانات',
  logoUrl: null,
  defaultStationLogoUrl: null,
  adminPin: '0000',

  // إعدادات المساعد مُعين
  enableMoeen: true,
  moeenVoiceEnabled: true,
  moeenGreetingText:
    'يا هلا بيك يا باشا! أنا "مُعين" مساعدك الذكي، معاك خطوة بخطوة عشان تدل على أقرب محطة كارجاس، تمون غاز، تغير زيت BP، أو تفحص الأسطوانة. قولي محتاج إيه وأنا تحت أمرك!',

  // النصوص والعناوين
  showFreeNavBanner: true,
  freeNavBannerText:
    'ملاحة مجانية 100%: زر "ابدأ الملاحة" يفتح تطبيق Google Maps على هاتفك مباشرة لتوجيه صوتي دقيق وفوري بدون أي رسوم!',
  navButtonText: 'ابدأ الملاحة في Google Maps',
  closestStationButtonText: 'أقرب محطة لي',
  voiceSearchButtonText: 'بحث صوتي',

  // أسماء الأنشطة القابلة للتخصيص
  cngLabel: 'تموين غاز',
  bpOilLabel: 'زيوت BP',
  maintenanceLabel: 'صيانة وتحويل',
  cylinderLabel: 'فحص أسطوانات',

  // التذييل والشركة (مخفية تماماً من صفحات المستخدم افتراضياً مع تحكم كامل للمدير)
  showFooterCredits: false,
  footerText: 'جميع الحقوق محفوظة © شبكة محطات الوقود والخدمات',
  footerCreditsText: 'تطوير وابتكار: شركة عزوتي للبرمجيات وتكنولوجيا المعلومات',
  showCompanyInfo: false,
  companyName: 'شركة عزوتي للبرمجيات وتكنولوجيا المعلومات',

  accentColor: 'emerald',
  defaultMapCenter: [30.0444, 31.2357], // القاهرة
  defaultZoom: 11,
};

const STATIONS_STORAGE_KEY = 'ezouti_gas_stations_v2';
const SETTINGS_STORAGE_KEY = 'ezouti_gas_settings_v2';
const THEME_STORAGE_KEY = 'ezouti_gas_theme_v2';
const USER_LOC_STORAGE_KEY = 'ezouti_gas_user_loc_v2';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. المحطات (تطبيق قاعدة كارجاس الكاملة: بدء الاسم بكارجاس، إلغاء أرقام 1 و 2، وتفعيل تموين غاز وزيوت)
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const saved = localStorage.getItem(STATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return applyCargasNetworkRules(parsed);
        }
      }
    } catch {}
    return []; // فارغة تماماً بناءً على طلب المستخدم للاعتماد على مستوردات KMZ
  });

  // 2. الإعدادات
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // 3. الثيم
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  // 4. موقع المستخدم (يبدأ بموقع وسط القاهرة الافتراضي لحين اكتمال التحديد التلقائي)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const savedLoc = localStorage.getItem(USER_LOC_STORAGE_KEY);
      if (savedLoc) return JSON.parse(savedLoc);
    } catch {}
    return { lat: 30.0444, lng: 31.2357 };
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 5. الفلاتر والبحث
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedService, setSelectedService] = useState<keyof StationServices | 'all'>('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');

  // 6. المحطة المحددة للمودال أو الخريطة
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activeMapStation, setActiveMapStation] = useState<Station | null>(null);

  // 7. لوحة الإدارة
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // 8. المساعد "مُعين"
  const [isMoeenOpen, setIsMoeenOpen] = useState<boolean>(false);

  // حفظ المحطات في LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(stations));
    } catch {}
  }, [stations]);

  // حفظ الإعدادات
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // حفظ الثيم
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [theme]);

  // حفظ موقع المستخدم
  useEffect(() => {
    if (userLocation) {
      try {
        localStorage.setItem(USER_LOC_STORAGE_KEY, JSON.stringify(userLocation));
      } catch {}
    }
  }, [userLocation]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const userLocationRef = useRef<{ lat: number; lng: number } | null>(userLocation);
  const isLocatingRef = useRef(false);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // تعيين الموقع الجغرافي يدوياً (للتغلب على مشاكل حجب إذن المتصفح في الـ iframe)
  const setUserLocationManual = (lat: number, lng: number, _label?: string) => {
    const loc = { lat, lng };
    setUserLocation(loc);
    setLocationError(null);
  };

  // طلب وتحديد موقع المستخدم الحالي تلقائياً وفورياً مع معالجة ذكية للأذونات والـ fallback
  const requestUserLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    // منع الاستدعاءات المتزامنة أو التكرارية التي تسبب وميض الشاشة
    if (isLocatingRef.current) {
      return userLocationRef.current;
    }
    isLocatingRef.current = true;
    setIsLocating(true);
    setLocationError(null);

    const finishSuccess = (loc: { lat: number; lng: number }) => {
      const current = userLocationRef.current;
      // تجنب التحديث إذا كان الموقع متطابقاً لمنع إعادة تصيير الخريطة والمكونات بدون داع
      if (!current || Math.abs(current.lat - loc.lat) > 0.0001 || Math.abs(current.lng - loc.lng) > 0.0001) {
        setUserLocation(loc);
      }
      setIsLocating(false);
      isLocatingRef.current = false;
      setLocationError(null);
      return loc;
    };

    // دالة الجلب الفوري التلقائي عبر عنوان الشبكة (IP Geolocation) عند حجب أذونات المتصفح أو الـ iframe
    const tryIpFallback = async () => {
      // 1. تجربة ipwho.is (سريع ومجاني ويدعم HTTPS و CORS)
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            return finishSuccess({ lat: data.latitude, lng: data.longitude });
          }
        }
      } catch {}

      // 2. تجربة ipapi.co
      try {
        const res2 = await fetch('https://ipapi.co/json/');
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && typeof data2.latitude === 'number' && typeof data2.longitude === 'number') {
            return finishSuccess({ lat: data2.latitude, lng: data2.longitude });
          }
        }
      } catch {}

      // 3. تجربة freeipapi.com
      try {
        const res3 = await fetch('https://freeipapi.com/api/json');
        if (res3.ok) {
          const data3 = await res3.json();
          if (data3 && typeof data3.latitude === 'number' && typeof data3.longitude === 'number') {
            return finishSuccess({ lat: data3.latitude, lng: data3.longitude });
          }
        }
      } catch {}

      // موقع افتراضي لوسط القاهرة عند تعذر كل الطرق
      const defaultLoc = userLocationRef.current || { lat: 30.0444, lng: 31.2357 };
      return finishSuccess(defaultLoc);
    };

    if (!('geolocation' in navigator)) {
      return tryIpFallback();
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timeoutTimer = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          const fallbackLoc = await tryIpFallback();
          resolve(fallbackLoc);
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutTimer);
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          resolve(finishSuccess(loc));
        },
        async () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeoutTimer);
          const ipLoc = await tryIpFallback();
          resolve(ipLoc);
        },
        { enableHighAccuracy: true, timeout: 2500, maximumAge: 60000 }
      );
    });
  }, []);

  // تشغيل فتح وتحديد الموقع تلقائياً فور تشغيل التطبيق لمرة واحدة فقط
  useEffect(() => {
    requestUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إدارة المصادقة للوحة التحكم برمز 0000 الافتراضي
  const loginAdmin = (pin: string): boolean => {
    if (pin.trim() === settings.adminPin.trim()) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
  };

  // العمليات على المحطات مع تطبيق قاعدة كارجاس الكاملة
  const addStation = (station: Station) => {
    const normalizedName = normalizeCargasStationName(station.name);
    const normalizedStation: Station = {
      ...station,
      name: normalizedName,
      company: 'كارجاس - Cargas',
      services: {
        ...station.services,
        cngRefuel: true,
        bpOilCenter: true,
      },
      updatedAt: new Date().toISOString(),
    };
    setStations((prev) => {
      const updated = applyCargasNetworkRules([normalizedStation, ...prev]);
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateStation = (updated: Station) => {
    const normalizedName = normalizeCargasStationName(updated.name);
    const normalizedStation: Station = {
      ...updated,
      name: normalizedName,
      company: 'كارجاس - Cargas',
      services: {
        ...updated.services,
        cngRefuel: true,
        bpOilCenter: true,
      },
      updatedAt: new Date().toISOString(),
    };

    setStations((prev) => {
      const replaced = prev.map((s) => (s.id === updated.id ? normalizedStation : s));
      const finalized = applyCargasNetworkRules(replaced);
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(finalized));
      } catch {}
      return finalized;
    });

    if (selectedStation?.id === updated.id) {
      setSelectedStation(normalizedStation);
    }
    if (activeMapStation?.id === updated.id) {
      setActiveMapStation(normalizedStation);
    }
  };

  // إلغاء وحذف المحطة بشكل مباشر وفوري ومضمون مع الحفظ اللحظي
  const deleteStation = (id: string) => {
    setStations((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedStation?.id === id) setSelectedStation(null);
    if (activeMapStation?.id === id) setActiveMapStation(null);
  };

  // مسح كافة المحطات (بناءً على طلب المستخدم لمسح البيانات التجريبية)
  const clearAllStations = () => {
    setStations([]);
    setSelectedStation(null);
    setActiveMapStation(null);
    try {
      localStorage.removeItem(STATIONS_STORAGE_KEY);
    } catch {}
  };

  // تطبيق قاعدة كارجاس على كامل المحطات الحالية (توحيد الأسماء، إزالة أرقام 1 و 2، تموين غاز وزيوت)
  const normalizeAllStations = () => {
    setStations((prev) => {
      const normalized = applyCargasNetworkRules(prev);
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}
      return normalized;
    });
  };

  // حفظ فوري لكافة التعديلات والتغييرات في قاعدة البيانات المحلية
  const saveAllDataNow = (): boolean => {
    try {
      localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(stations));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  };

  // تطبيق لوجو المحطة الجديد المرفوع من الكمبيوتر وتعميمه على كافة المحطات أو المحطات المحددة
  const applyStationLogo = (logoUrl: string, targetStationIds?: string[]) => {
    if (!targetStationIds || targetStationIds.length === 0) {
      // تعميم على كافة المحطات
      setStations((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          logoUrl,
          updatedAt: new Date().toISOString(),
        }));
        try {
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      // وحفظه كلوجو افتراضي عام لأي محطات قادمة
      updateSettings({ defaultStationLogoUrl: logoUrl });
    } else {
      // تطبيق على المحطات المحددة فقط
      const idSet = new Set(targetStationIds);
      setStations((prev) => {
        const updated = prev.map((s) =>
          idSet.has(s.id) ? { ...s, logoUrl, updatedAt: new Date().toISOString() } : s
        );
        try {
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  // إزالة لوجو المحطات
  const clearStationLogo = (targetStationIds?: string[]) => {
    if (!targetStationIds || targetStationIds.length === 0) {
      setStations((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          logoUrl: undefined,
        }));
        try {
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      updateSettings({ defaultStationLogoUrl: null });
    } else {
      const idSet = new Set(targetStationIds);
      setStations((prev) => {
        const updated = prev.map((s) => (idSet.has(s.id) ? { ...s, logoUrl: undefined } : s));
        try {
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const importStations = (newStations: Station[], mode: 'append' | 'replace') => {
    // تطبيق قاعدة كارجاس وتوحيد الأسماء والخدمات
    const normalizedNew = applyCargasNetworkRules(newStations);

    const stationsWithLogo = normalizedNew.map((s) => ({
      ...s,
      logoUrl: s.logoUrl || settings.defaultStationLogoUrl || undefined,
    }));

    if (mode === 'replace') {
      const finalized = applyCargasNetworkRules(stationsWithLogo);
      setStations(finalized);
      try {
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(finalized));
      } catch {}
    } else {
      setStations((prev) => {
        const merged = applyCargasNetworkRules([...prev, ...stationsWithLogo]);
        try {
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      });
    }
  };

  // تصفية المحطات وترتيبها
  const filteredStations = useMemo(() => {
    return stations
      .map((station) => {
        let distance: number | undefined = undefined;
        if (userLocation) {
          distance = calculateHaversineDistance(
            userLocation.lat,
            userLocation.lng,
            station.lat,
            station.lng
          );
        }
        return { ...station, distance };
      })
      .filter((station) => {
        // فلتر البحث النصي
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = station.name.toLowerCase().includes(q);
          const matchAddress = station.address.toLowerCase().includes(q);
          const matchGov = station.governorate.toLowerCase().includes(q);
          const matchCity = station.city ? station.city.toLowerCase().includes(q) : false;
          const matchCompany = station.company.toLowerCase().includes(q);
          if (!matchName && !matchAddress && !matchGov && !matchCity && !matchCompany) {
            return false;
          }
        }

        // فلتر الخدمة
        if (selectedService !== 'all') {
          if (!station.services[selectedService]) {
            return false;
          }
        }

        // فلتر المحافظة
        if (selectedGovernorate !== 'all') {
          if (station.governorate !== selectedGovernorate) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return a.name.localeCompare(b.name, 'ar');
      });
  }, [stations, searchQuery, selectedService, selectedGovernorate, userLocation]);

  // إيجاد أقرب محطة
  const findClosestStation = useCallback(
    (service?: keyof StationServices): (Station & { distance?: number }) | null => {
      const candidates = service
        ? filteredStations.filter((s) => s.services[service])
        : filteredStations;

      if (candidates.length === 0) return null;

      // أول محطة هي الأقرب لأن المصفوفة مرتبة بالمسافة
      return candidates[0];
    },
    [filteredStations]
  );

  return (
    <AppContext.Provider
      value={{
        stations,
        filteredStations,
        settings,
        updateSettings,
        userLocation,
        isLocating,
        locationError,
        requestUserLocation,
        setUserLocationManual,
        searchQuery,
        setSearchQuery,
        selectedService,
        setSelectedService,
        selectedGovernorate,
        setSelectedGovernorate,
        selectedStation,
        setSelectedStation,
        activeMapStation,
        setActiveMapStation,
        isAdminOpen,
        setIsAdminOpen,
        isAdminAuthenticated,
        loginAdmin,
        logoutAdmin,
        isMoeenOpen,
        setIsMoeenOpen,
        addStation,
        updateStation,
        deleteStation,
        importStations,
        clearAllStations,
        normalizeAllStations,
        saveAllDataNow,
        applyStationLogo,
        clearStationLogo,
        findClosestStation,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
