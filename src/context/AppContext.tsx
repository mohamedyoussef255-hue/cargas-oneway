import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Station, StationServices, AppSettings } from '../types/station';
import { calculateHaversineDistance } from '../utils/geo';
import { applyCargasNetworkRules, normalizeCargasStationName } from '../utils/cargasRules';
import { INITIAL_STATIONS } from '../data/initialStations';
import { applyThemeToDocument } from '../utils/themePalettes';
import { DEFAULT_CARGAS_LOGO, APP_PRIMARY_LOGO, STATION_NETWORK_LOGO } from '../utils/cargasLogo';
import { normalizeArabicText } from '../utils/speech';
import {
  saveStationsToIDB,
  getStationsFromIDB,
  saveSettingsToIDB,
  getSettingsFromIDB,
} from '../utils/idbStorage';

interface AppContextType {
  stations: Station[];
  filteredStations: (Station & { distance?: number })[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  userLocateTrigger: number;
  isLocating: boolean;
  locationError: string | null;
  requestUserLocation: (force?: boolean) => Promise<{ lat: number; lng: number; accuracy?: number } | null>;
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
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'أقرب محطة كارجاس',
  appSubtitle: 'المنظومة الذكية لتحديد أقرب محطة غاز طبيعي، صيانة، زيوت وفحص أسطوانات',
  logoUrl: APP_PRIMARY_LOGO,
  defaultStationLogoUrl: STATION_NETWORK_LOGO,
  adminPin: '0000',

  // إعدادات المساعد مُعين (تم إلغاؤه وإخفاؤه بناءً على طلبك مع إمكانية التفعيل من لوحة المدير)
  enableMoeen: false,
  moeenVoiceEnabled: false,
  moeenGreetingText:
    'يا هلا بيك يا باشا! أنا "مُعين" مساعدك الذكي، معاك خطوة بخطوة عشان تدل على أقرب محطة كارجاس، تمون غاز، تغير زيت BP، أو تفحص الأسطوانة. قولي محتاج إيه وأنا تحت أمرك!',

  // التحكم في ظهور وإخفاء الأيقونات وعناصر الواجهة
  showLocationButton: true,
  showThemeToggle: true,
  showStatsBar: true,
  showFilterBar: true,
  showClosestButton: true,
  showVoiceSearchButton: true,
  showMapLocateButton: true,
  showMapPickButton: true,
  showMapQuickCng: true,
  showMapQuickCylinder: true,
  showMapQuickBp: true,
  showMapQuickConversion: true,
  showMapTypeSwitcher: true,
  showStationCards: true,

  // النصوص والعناوين
  showFreeNavBanner: true,
  freeNavBannerText:
    'ملاحة مجانية 100%: زر "ابدأ الملاحة" يفتح تطبيق Google Maps على هاتفك مباشرة لتوجيه صوتي دقيق وفوري بدون أي رسوم!',
  navButtonText: 'ابدأ الملاحة في Google Maps',
  closestStationButtonText: 'أقرب محطة لي',
  voiceSearchButtonText: 'بحث صوتي',

  // أسماء الأنشطة القابلة للتخصيص
  cngLabel: 'تموين غاز',
  bpOilLabel: 'مركز زيوت BP متكامل',
  canopyOilLabel: 'بيع زيوت أسفل المظلة',
  maintenanceLabel: 'صيانة وتحويل',
  cylinderLabel: 'فحص أسطوانات',

  // التذييل والشركة (مخفية تماماً من صفحات المستخدم افتراضياً مع تحكم كامل للمدير)
  showFooterCredits: false,
  footerText: 'جميع الحقوق محفوظة © شبكة محطات الوقود والخدمات',
  footerCreditsText: 'تطوير وابتكار: شركة عزوتي للبرمجيات وتكنولوجيا المعلومات',
  showCompanyInfo: false,
  companyName: 'شركة عزوتي للبرمجيات وتكنولوجيا المعلومات',

  // بنتونة الألوان ومظهر التطبيق الشامل
  paletteId: 'cargas_emerald',
  primaryColor: '#059669',
  secondaryColor: '#0d9488',
  accentColor: '#10b981',
  themeMode: 'light',

  defaultMapCenter: [30.0444, 31.2357], // القاهرة
  defaultZoom: 11,
  mapApiKey: '',
  mapProvider: 'free_osm_satellite',
  customTileUrl: '',
  activeMapSystem: 'voyager',
};

const STATIONS_STORAGE_KEY = 'ezouti_gas_stations_v2';
const SETTINGS_STORAGE_KEY = 'ezouti_gas_settings_v2';
const THEME_STORAGE_KEY = 'ezouti_gas_theme_v2';
const USER_LOC_STORAGE_KEY = 'ezouti_gas_user_loc_v2';
const USER_DATA_FLAG_KEY = 'ezouti_gas_user_has_custom_data_v2';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. المحطات (اعتماد وحفظ بيانات المستخدم المرفوعة نهائياً ومنع إرجاع البيانات الافتراضية)
  const [stations, setStations] = useState<Station[]>(() => {
    try {
      const hasUserData = localStorage.getItem(USER_DATA_FLAG_KEY);
      const saved = localStorage.getItem(STATIONS_STORAGE_KEY);

      // دالة تدقيق المواقع الجغرافية للمحطات الرئيسية كألماظة
      const fixAlmazaCoords = (list: Station[]): Station[] =>
        list.map((s) => {
          if (
            s.id === 'sta-cargas-almaza' ||
            (s.name.includes('ألماظة') && (Math.abs(s.lat - 30.0831566) > 0.001 || Math.abs(s.lng - 31.3515105) > 0.001))
          ) {
            return {
              ...s,
              lat: 30.0831566,
              lng: 31.3515105,
              address: '312 شارع اللواء محمد إبراهيم الشيخ، ألماظة، مصر الجديدة، القاهرة (بجوار مستشفى الجلاء وطريق المطار)',
            };
          }
          return s;
        });

      // إذا كان المستخدم قام برفع بيانات أو حفظها أو مسحها سابقاً، نعتمد ما حفظه 100%
      if (hasUserData === 'true' && saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return fixAlmazaCoords(parsed);
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return fixAlmazaCoords(parsed);
        }
      }
    } catch {}
    return INITIAL_STATIONS;
  });

  // 2. الإعدادات (معين ملغي افتراضياً كما طُلب)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          logoUrl: parsed.logoUrl || APP_PRIMARY_LOGO,
          defaultStationLogoUrl: parsed.defaultStationLogoUrl || STATION_NETWORK_LOGO,
          // إلغاء معين افتراضياً بناء على أمر المستخدم "الغي معين"
          enableMoeen: parsed.enableMoeen === true && parsed._explicitAdminMoeen ? true : false,
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // استرجاع البيانات والنسخ الاحتياطية من التخزين العميق IndexedDB في حال تم تفريغ الكاش
  useEffect(() => {
    let isMounted = true;
    async function restoreFromIDB() {
      try {
        const [idbStations, idbSettings] = await Promise.all([
          getStationsFromIDB(),
          getSettingsFromIDB(),
        ]);
        if (!isMounted) return;

        if (idbStations && idbStations.length > 0) {
          setStations((current) => {
            // إذا كانت الذاكرة المؤقتة فارغة أو أقل من بيانات IndexedDB المعتمدة
            if (current.length === 0 || (current === INITIAL_STATIONS && idbStations.length > 0)) {
              return idbStations;
            }
            return current;
          });
        }

        if (idbSettings) {
          setSettings((current) => ({
            ...current,
            ...idbSettings,
            logoUrl: idbSettings.logoUrl || current.logoUrl || APP_PRIMARY_LOGO,
            defaultStationLogoUrl:
              idbSettings.defaultStationLogoUrl || current.defaultStationLogoUrl || STATION_NETWORK_LOGO,
          }));
        }
      } catch (err) {
        console.warn('IDB restore error:', err);
      }
    }
    restoreFromIDB();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. الثيم (النهاري والليلي)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.themeMode === 'dark' || parsed.themeMode === 'light') {
          return parsed.themeMode;
        }
      }
    } catch {}
    return 'light';
  });

  // 4. موقع المستخدم (يبدأ بنقاء null حتى يتم التقاط موقع المستخدم الفعلي بالـ GPS أو الملاحة)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(() => {
    try {
      const savedLoc = localStorage.getItem(USER_LOC_STORAGE_KEY);
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          // استبعاد إحداثيات وسط البلد الافتراضية القديمة لضمان عدم توجيه الملاحة خطأً لوسط البلد
          const isOldDowntown = Math.abs(parsed.lat - 30.0444) < 0.001 && Math.abs(parsed.lng - 31.2357) < 0.001;
          if (!isOldDowntown) return parsed;
        }
      }
    } catch {}
    return null;
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

  // حفظ المحطات في التخزين المزدوج (LocalStorage + IndexedDB الدائم)
  useEffect(() => {
    try {
      localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
      localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(stations));
    } catch {}
    saveStationsToIDB(stations);
  }, [stations]);

  // حفظ الإعدادات في التخزين المزدوج (LocalStorage + IndexedDB الدائم)
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
    saveSettingsToIDB(settings);
  }, [settings]);

  // تطبيق بنتونة الألوان على كامل عناصر وصفحات التطبيق فور تغييرها
  useEffect(() => {
    applyThemeToDocument(settings.primaryColor, settings.secondaryColor, settings.accentColor);
  }, [settings.primaryColor, settings.secondaryColor, settings.accentColor]);

  // تطبيق وحفظ الثيم (النهاري والليلي) على مستوى الـ DOM بالكامل (html + body)
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      const root = document.documentElement;
      const body = document.body;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        if (body) {
          body.classList.add('dark');
          body.setAttribute('data-theme', 'dark');
        }
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        if (body) {
          body.classList.remove('dark');
          body.setAttribute('data-theme', 'light');
        }
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
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setSettings((s) => ({ ...s, themeMode: next }));
      return next;
    });
  };

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setSettings((s) => ({ ...s, themeMode: newTheme }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.themeMode && (newSettings.themeMode === 'light' || newSettings.themeMode === 'dark')) {
        setTheme(newSettings.themeMode);
      }
      return updated;
    });
  };

  const userLocationRef = useRef<{ lat: number; lng: number; accuracy?: number } | null>(userLocation);
  const isLocatingRef = useRef(false);
  const [userLocateTrigger, setUserLocateTrigger] = useState<number>(0);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // تعيين الموقع الجغرافي يدوياً (للتغلب على مشاكل حجب إذن المتصفح في الـ iframe)
  const setUserLocationManual = (lat: number, lng: number, _label?: string) => {
    const loc = { lat, lng, accuracy: 15 };
    setUserLocation(loc);
    setLocationError(null);
    setUserLocateTrigger(Date.now());
  };

  // طلب وتحديد موقع المستخدم الحالي بالـ GPS الحقيقي مع تعدد مسارات الإنقاذ والـ Fallback
  const requestUserLocation = useCallback(async (force = false): Promise<{ lat: number; lng: number; accuracy?: number } | null> => {
    if (isLocatingRef.current && !force) {
      return userLocationRef.current;
    }
    isLocatingRef.current = true;
    setIsLocating(true);
    setLocationError(null);

    const finishSuccess = (loc: { lat: number; lng: number; accuracy?: number }, isRealGps = false) => {
      setUserLocation(loc);
      setIsLocating(false);
      isLocatingRef.current = false;
      setLocationError(null);
      if (force || isRealGps) {
        setUserLocateTrigger(Date.now());
      }
      return loc;
    };

    // جلب احتياطي سريع متعدد المصادر عبر عناوين الشبكة IP بالتوازي
    const tryIpFallback = async () => {
      try {
        const fetchIpwhois = async () => {
          const res = await fetch('https://ipwho.is/');
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (!data || !data.success || typeof data.latitude !== 'number') throw new Error();
          return { lat: data.latitude, lng: data.longitude, accuracy: 2500, country: data.country_code };
        };

        const fetchBigData = async () => {
          const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (!data || typeof data.latitude !== 'number') throw new Error();
          return { lat: data.latitude, lng: data.longitude, accuracy: 3000, country: data.countryCode };
        };

        const fetchFreeIp = async () => {
          const res = await fetch('https://freeipapi.com/api/json');
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (!data || typeof data.latitude !== 'number') throw new Error();
          return { lat: data.latitude, lng: data.longitude, accuracy: 3000, country: data.countryCode };
        };

        const ipLoc = await Promise.any([fetchIpwhois(), fetchBigData(), fetchFreeIp()]);
        if (ipLoc) {
          const isWithinEgypt = ipLoc.lat >= 21.9 && ipLoc.lat <= 32.0 && ipLoc.lng >= 24.5 && ipLoc.lng <= 37.0;
          const finalLoc = isWithinEgypt
            ? { lat: ipLoc.lat, lng: ipLoc.lng, accuracy: ipLoc.accuracy }
            : { lat: 30.0444, lng: 31.2357, accuracy: 4000 };
          return finishSuccess(finalLoc, false);
        }
      } catch {}

      const defaultLoc = userLocationRef.current || { lat: 30.0444, lng: 31.2357, accuracy: 5000 };
      return finishSuccess(defaultLoc, false);
    };

    if (!('geolocation' in navigator)) {
      return tryIpFallback();
    }

    return new Promise((resolve) => {
      let resolved = false;

      // مؤقت مرن: بعد 4 ثوانٍ إذا لم يرد الـ GPS بعد، نضع موقعاً تقريبياً مبدئياً دون إلغاء التقاط الـ GPS الحقيقي
      const softTimer = setTimeout(async () => {
        if (!resolved) {
          const interim = await tryIpFallback();
          resolve(interim);
        }
      }, 4000);

      const onGpsSuccess = (pos: GeolocationPosition) => {
        clearTimeout(softTimer);
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        // الموقع الحقيقي بالـ GPS يُعتمد دائماً وفوراً
        finishSuccess(loc, true);
        if (!resolved) {
          resolved = true;
          resolve(loc);
        }
      };

      // فحص أذونات المتصفح إن وُجدت
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
          if (status.state === 'denied') {
            setLocationError('تم حظر صلاحية الموقع (GPS) في المتصفح. يمكنك السماح بالوصول من أيقونة القفل/الموقع في شريط العنوان أو تحديد موقعك عبر زر "تحديد بالخريطة".');
          }
        }).catch(() => {});
      }

      // 1. طلب GPS عالي الدقة (Hardware GPS / Mobile)
      navigator.geolocation.getCurrentPosition(
        onGpsSuccess,
        (err) => {
          if (err.code === 1) {
            setLocationError('تم حظر إذن الموقع للمتصفح. يرجى تفعيل إذن الموقع من شريط المتصفح أو النقر على "تحديد بالخريطة".');
          }
          // 2. إذا فشل عالي الدقة (أو انتهى وقته في الأماكن المغلقة / اللابتوب)، نجرب فوراً الدقة العادية
          navigator.geolocation.getCurrentPosition(
            onGpsSuccess,
            async () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(softTimer);
                const fallback = await tryIpFallback();
                resolve(fallback);
              }
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }, []);

  // تشغيل تحديد الموقع التلقائي ومراقبة تحسن إشارة الـ GPS في الخلفية
  useEffect(() => {
    requestUserLocation();

    // تشغيل مراقب GPS مستمر لتحديث الموقع فور التقاط الأقمار الصناعية بدقة
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const loc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            const current = userLocationRef.current;
            if (!current) {
              setUserLocation(loc);
              setUserLocateTrigger(Date.now());
            } else {
              const dist = calculateHaversineDistance(current.lat, current.lng, loc.lat, loc.lng);
              // تحديث فوري إذا تحرك أكثر من 30 متراً أو زادت الدقة
              if (dist > 0.03 || (loc.accuracy && current.accuracy && loc.accuracy < current.accuracy / 2)) {
                setUserLocation(loc);
              }
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10000 }
        );
      } catch {}
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
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

  // العمليات على المحطات مع حفظ واعتماد دائم
  const addStation = (station: Station) => {
    const normalizedName = normalizeCargasStationName(station.name);
    const normalizedStation: Station = {
      ...station,
      name: normalizedName,
      company: station.company || 'كارجاس - Cargas',
      services: {
        ...station.services,
      },
      updatedAt: new Date().toISOString(),
    };
    setStations((prev) => {
      const updated = [normalizedStation, ...prev];
      try {
        localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
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
      company: updated.company || 'كارجاس - Cargas',
      services: {
        ...updated.services,
      },
      updatedAt: new Date().toISOString(),
    };

    setStations((prev) => {
      const replaced = prev.map((s) => (s.id === updated.id ? normalizedStation : s));
      try {
        localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(replaced));
      } catch {}
      return replaced;
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
        localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedStation?.id === id) setSelectedStation(null);
    if (activeMapStation?.id === id) setActiveMapStation(null);
  };

  // مسح كافة المحطات واعتماد المسح نهائياً دون استدعاء أي بيانات افتراضية
  const clearAllStations = () => {
    setStations([]);
    setSelectedStation(null);
    setActiveMapStation(null);
    try {
      localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
      localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify([]));
    } catch {}
  };

  // تطبيق قاعدة كارجاس على كامل المحطات الحالية (توحيد الأسماء، إزالة أرقام 1 و 2)
  const normalizeAllStations = () => {
    setStations((prev) => {
      const normalized = applyCargasNetworkRules(prev);
      try {
        localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(normalized));
      } catch {}
      return normalized;
    });
  };

  // حفظ فوري لكافة التعديلات والتغييرات في قاعدة البيانات المحلية والتخزين الدائم واعتمادها نهائياً
  const saveAllDataNow = (): boolean => {
    try {
      localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
      localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(stations));
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage error, relying on IndexedDB:', e);
    }
    saveStationsToIDB(stations);
    saveSettingsToIDB(settings);
    return true;
  };

  // تطبيق لوجو المحطة الجديد المرفوع وتعميمه على كافة المحطات أو المحطات المحددة
  const applyStationLogo = (logoUrl: string, targetStationIds?: string[]) => {
    if (!targetStationIds || targetStationIds.length === 0) {
      // تعميم على كافة المحطات: يتم تحديث اللوجو الافتراضي العام في الإعدادات
      // وتفريغ الحقول الفردية لترث اللوجو تلقائياً دون تضخيم حجم البيانات أو كسر حد التخزين
      updateSettings({ defaultStationLogoUrl: logoUrl });
      setStations((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          logoUrl: undefined, // يرث تلقائياً settings.defaultStationLogoUrl
          updatedAt: new Date().toISOString(),
        }));
        try {
          localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        saveStationsToIDB(updated);
        return updated;
      });
    } else {
      // تطبيق على المحطات المحددة فقط
      const idSet = new Set(targetStationIds);
      setStations((prev) => {
        const updated = prev.map((s) =>
          idSet.has(s.id) ? { ...s, logoUrl, updatedAt: new Date().toISOString() } : s
        );
        try {
          localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        saveStationsToIDB(updated);
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
          localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        saveStationsToIDB(updated);
        return updated;
      });
      updateSettings({ defaultStationLogoUrl: null });
    } else {
      const idSet = new Set(targetStationIds);
      setStations((prev) => {
        const updated = prev.map((s) => (idSet.has(s.id) ? { ...s, logoUrl: undefined } : s));
        try {
          localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        saveStationsToIDB(updated);
        return updated;
      });
    }
  };

  // استيراد واعتماد المحطات المرفوعة نهائياً في التطبيق
  const importStations = (newStations: Station[], mode: 'append' | 'replace') => {
    const sanitized = newStations.map((s) => ({
      ...s,
      company: s.company || 'كارجاس - Cargas',
    }));

    if (mode === 'replace') {
      setStations(sanitized);
      try {
        localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
        localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(sanitized));
      } catch {}
      saveStationsToIDB(sanitized);
    } else {
      setStations((prev) => {
        const merged = [...prev, ...sanitized];
        try {
          localStorage.setItem(USER_DATA_FLAG_KEY, 'true');
          localStorage.setItem(STATIONS_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        saveStationsToIDB(merged);
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
        // فلتر البحث النصي الذكي بالتطبيع العربي
        if (searchQuery.trim()) {
          const normQ = normalizeArabicText(searchQuery);
          const rawQ = searchQuery.toLowerCase().trim();

          const normName = normalizeArabicText(station.name);
          const normAddress = normalizeArabicText(station.address);
          const normGov = normalizeArabicText(station.governorate);
          const normCity = normalizeArabicText(station.city || '');
          const normCompany = normalizeArabicText(station.company);
          const normNotes = normalizeArabicText(station.notes || '');

          const matchesNorm =
            normName.includes(normQ) ||
            normAddress.includes(normQ) ||
            normGov.includes(normQ) ||
            normCity.includes(normQ) ||
            normCompany.includes(normQ) ||
            normNotes.includes(normQ);

          const matchesRaw =
            station.name.toLowerCase().includes(rawQ) ||
            station.address.toLowerCase().includes(rawQ) ||
            station.governorate.toLowerCase().includes(rawQ);

          if (!matchesNorm && !matchesRaw) {
            // فحص الكلمات المفردة إذا كانت جملة بحث مركبة
            const words = normQ.split(' ').filter((w) => w.length >= 2 && !['محطة', 'محطه', 'كارجاس'].includes(w));
            const hasMatchingWord =
              words.length > 0 &&
              words.some((w) =>
                normName.includes(w) ||
                normAddress.includes(w) ||
                normGov.includes(w) ||
                normCity.includes(w)
              );

            if (!hasMatchingWord) {
              return false;
            }
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
        userLocateTrigger,
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
        setTheme: handleSetTheme,
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
