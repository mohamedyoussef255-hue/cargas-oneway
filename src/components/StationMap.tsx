import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Station } from '../types/station';
import { useApp } from '../context/AppContext';
import { getGoogleMapsNavigationUrl, formatDistance } from '../utils/geo';
import { DEFAULT_CARGAS_LOGO } from '../utils/cargasLogo';
import {
  Navigation,
  Crosshair,
  Flame,
  Droplets,
  Wrench,
  ShieldCheck,
  Phone,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export type MapSystemId = 'satellite' | 'voyager' | 'osm' | 'dark' | 'topo' | 'hot';

export interface MapSystemOption {
  id: MapSystemId;
  name: string;
  badge: string;
  icon: string;
  description: string;
}

export const MAP_SYSTEMS: MapSystemOption[] = [
  {
    id: 'satellite',
    name: 'أقمار صناعية حقيقية',
    badge: 'Satellite',
    icon: '🛰️',
    description: 'صور فضائية حقيقية من أقمار Esri مع أسماء الشوارع والمدن',
  },
  {
    id: 'voyager',
    name: 'ملاحة عصرية واضحة',
    badge: 'Voyager',
    icon: '🧭',
    description: 'خريطة ناصعة وفائقة الوضوح مناسبة للقيادة والبحث النهاري',
  },
  {
    id: 'osm',
    name: 'شوارع كلاسيك OSM',
    badge: 'OpenStreetMap',
    icon: '🗺️',
    description: 'قاعدة بيانات الشوارع والمباني العالمية القياسية 100% مفتوحة',
  },
  {
    id: 'dark',
    name: 'رؤية ليلية داكنة',
    badge: 'Dark Mode',
    icon: '🌙',
    description: 'خلفية داكنة مريحة للعين في القيادة ليلاً تبرز المحطات كأضواء',
  },
  {
    id: 'topo',
    name: 'تضاريس وطبوغرافيا',
    badge: 'Topographic',
    icon: '⛰️',
    description: 'تضاريس الأرض والمرتفعات الطبيعية بدقة طبوغرافية',
  },
  {
    id: 'hot',
    name: 'شبكة نقل وطرق حيوية',
    badge: 'Transit',
    icon: '🚦',
    description: 'إبراز المحاور والطرق السريعة والميادين للتنقل السريع',
  },
];

interface StationMapProps {
  onStationSelect?: (station: Station) => void;
  className?: string;
}

export const StationMap: React.FC<StationMapProps> = ({ onStationSelect, className = '' }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  const {
    filteredStations,
    activeMapStation,
    setActiveMapStation,
    userLocation,
    userLocateTrigger,
    isLocating,
    requestUserLocation,
    setUserLocationManual,
    findClosestStation,
    theme,
    settings,
    setIsAdminOpen,
  } = useApp();

  const [mapSystem, setMapSystem] = useState<MapSystemId>(() => {
    const saved = localStorage.getItem('cargas_preferred_map_system');
    if (saved && ['satellite', 'voyager', 'osm', 'dark', 'topo', 'hot'].includes(saved)) {
      return saved as MapSystemId;
    }
    if (settings.activeMapSystem) return settings.activeMapSystem;
    return theme === 'dark' ? 'dark' : 'voyager';
  });

  const [showSystemsMenu, setShowSystemsMenu] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);

  // تحديث النظام الليلي تلقائياً عند تغيير الثيم العام إن لم يكن المستخدم اختار قمراً صناعياً أو نمطاً مخصصاً
  useEffect(() => {
    const saved = localStorage.getItem('cargas_preferred_map_system');
    if (!saved || saved === 'dark' || saved === 'voyager') {
      setMapSystem(theme === 'dark' ? 'dark' : 'voyager');
    }
  }, [theme]);

  // إنشاء الخريطة عند تحميل الصفحة
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // إعداد الخريطة
      const map = L.map(mapContainerRef.current, {
        center: [30.0444, 31.2357], // القاهرة
        zoom: 11,
        zoomControl: false,
      });

      // إضافة أدوات التحكم بالتكبير في الركن الأيسر السفلي
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      // مجموعة طبقات العلامات
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // تغيير نوع خريطة الخلفية (Tiles) بناءً على جميع أنظمة الخريطة ومفتاح الـ API
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // مسح الطبقات السابقة (TileLayers)
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapSystem === 'satellite') {
      // 1. نظام الأقمار الصناعية الفضائية Esri World Imagery عالي الدقة (صور حقيقية 100% مجاناً)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}',
        {
          attribution: 'Tiles &copy; Esri &mdash; World Imagery Community',
          maxZoom: 19,
        }
      );
      satLayer.addTo(map);

      // طبقة حدود وأسماء المدن والشوارع والمعالم فوق القمر الصناعي لسهولة القراءة باللغة العربية
      const labelsLayer = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{x}/{y}',
        {
          maxZoom: 19,
          opacity: 0.9,
        }
      );
      labelsLayer.addTo(map);
    } else if (mapSystem === 'osm') {
      // 2. نظام خريطة OpenStreetMap القياسية (الشوارع والمباني بالتفصيل)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
    } else if (mapSystem === 'dark') {
      // 3. نظام الرؤية الليلية الداكن Carto Dark Matter
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
    } else if (mapSystem === 'topo') {
      // 4. نظام التضاريس والطبوغرافيا OpenTopoMap
      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style: &copy; OpenTopoMap',
        maxZoom: 17,
        subdomains: 'abc',
      }).addTo(map);
    } else if (mapSystem === 'hot') {
      // 5. نظام الشوارع الحيوية والنقل Humanitarian OSM
      L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Humanitarian map style',
        maxZoom: 19,
      }).addTo(map);
    } else if (settings.customTileUrl) {
      // 6. خادم مخصص للبلاطات أو مفتاح API خارجي
      const tileUrl =
        settings.customTileUrl.includes('{key}') && settings.mapApiKey
          ? settings.customTileUrl.replace('{key}', settings.mapApiKey)
          : settings.customTileUrl;
      L.tileLayer(tileUrl, {
        attribution: 'Custom Map Provider',
        maxZoom: 19,
      }).addTo(map);
    } else {
      // الافتراضي: Carto Voyager الملاحة العصرية الفاتحة والواضحة جداً
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
    }
  }, [mapSystem, settings.customTileUrl, settings.mapApiKey]);

  // الاستماع للنقر على الخريطة لتحديد الموقع يدوياً
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation) {
        setUserLocationManual(e.latlng.lat, e.latlng.lng, 'موقعك المحدد على الخريطة');
        setIsPickingLocation(false);
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [isPickingLocation, setUserLocationManual]);

  // تحديث علامة ودائرة دقة موقع المستخدم (GPS Accuracy Radius)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 bg-blue-500/25 rounded-full ring-2 ring-blue-400/50"></div>
          <div class="relative w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-md flex items-center justify-center text-white">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: userHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = `
        <div class="p-2 font-bold text-center text-slate-800 text-xs">
          <div>موقعك الحالي 📍</div>
          ${userLocation.accuracy ? `<div class="text-[10px] text-blue-600 font-normal mt-0.5">دقة الإشارة: ±${Math.round(userLocation.accuracy)} متر</div>` : ''}
        </div>
      `;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        userMarkerRef.current.setPopupContent(popupContent);
      } else {
        const marker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);
        marker.bindPopup(popupContent);
        userMarkerRef.current = marker;
      }

      // رسم دائرة دقة الـ GPS
      if (userLocation.accuracy && userLocation.accuracy < 10000) {
        if (userAccuracyCircleRef.current) {
          userAccuracyCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
          userAccuracyCircleRef.current.setRadius(userLocation.accuracy);
        } else {
          userAccuracyCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
            radius: userLocation.accuracy,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map);
        }
      } else if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    }
  }, [userLocation]);

  // رسم علامات المحطات وتحديثها
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredStations.forEach((station) => {
      // تحديد لوجو المحطة مع استخدام لوجو كارجاس الرسمي المعتمد فائق الدقة
      const stationLogo = station.logoUrl || settings.defaultStationLogoUrl || DEFAULT_CARGAS_LOGO;
      const isAlmaza = station.id === 'sta-cargas-almaza' || station.name.includes('ألماظة');
      const isSelected = activeMapStation?.id === station.id;

      // تحديد رمز النشاط واللون المحيط
      let badgeBg = 'bg-emerald-600';
      let badgeBorder = 'border-emerald-400';
      let serviceIcon = '⛽';

      if (station.services.cylinderTesting) {
        badgeBg = station.services.cylinderTestingUpcoming ? 'bg-amber-600' : 'bg-purple-600';
        badgeBorder = station.services.cylinderTestingUpcoming ? 'border-amber-400' : 'border-purple-400';
        serviceIcon = station.services.cylinderTestingUpcoming ? '⏳' : '🛡️';
      } else if (station.services.bpOilCenter && !station.services.cngRefuel) {
        badgeBg = 'bg-blue-600';
        badgeBorder = 'border-blue-400';
        serviceIcon = '🛢️';
      } else if (station.services.canopyOilSales && !station.services.cngRefuel) {
        badgeBg = 'bg-cyan-600';
        badgeBorder = 'border-cyan-400';
        serviceIcon = '🧴';
      } else if (station.services.conversionMaintenance && !station.services.cngRefuel) {
        badgeBg = 'bg-amber-600';
        badgeBorder = 'border-amber-400';
        serviceIcon = '🔧';
      }

      // علامة المحطة متضمنة اللوجو الرسمي في منتصف الدائرة مع مؤشر الخدمة الدقيق
      const markerInner = `
        <div class="relative w-12 h-12 bg-white rounded-full border-2 ${
          isSelected || isAlmaza
            ? 'border-emerald-600 ring-4 ring-emerald-400/50 shadow-emerald-600/40'
            : 'border-emerald-600 shadow-slate-900/40'
        } shadow-xl flex items-center justify-center p-1 overflow-hidden">
          <img src="${stationLogo}" class="w-full h-full object-contain rounded-full select-none" alt="${station.name}" />
          <!-- شارة النشاط في الزاوية العلوية -->
          <div class="absolute -top-1 -right-1 w-5 h-5 ${badgeBg} ${badgeBorder} border-2 text-white rounded-full flex items-center justify-center text-[10px] shadow-md font-bold">
            ${serviceIcon}
          </div>
        </div>
        <!-- سن الدبوس المؤشر على الإحداثيات الجغرافية الدقيقة -->
        <div class="w-3 h-3 ${isSelected || isAlmaza ? 'bg-emerald-600' : 'bg-emerald-700'} rotate-45 mx-auto -mt-1.5 border-r border-b border-white shadow"></div>
      `;

      const markerHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : isAlmaza ? 'scale-115 hover:scale-125 z-40' : 'hover:scale-115'
        }">
          ${markerInner}
          ${
            isAlmaza
              ? `<span class="absolute -top-4 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-black bg-emerald-700 text-white rounded-md shadow-md border border-emerald-400 whitespace-nowrap animate-pulse">كارجاس ألماظة ⭐</span>`
              : ''
          }
          ${
            station.distance !== undefined
              ? `<span class="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-bold bg-white text-slate-800 rounded shadow border border-slate-200 whitespace-nowrap">${formatDistance(
                  station.distance
                )}</span>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: markerHtml,
        iconSize: [48, 56],
        iconAnchor: [24, 50],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon });

      // محتوى النافذة المنبثقة (Popup) - يبدأ الملاحة من موقع المستخدم الحقيقي
      const navUrl = getGoogleMapsNavigationUrl(station.lat, station.lng, station.name, userLocation);

      const servicesBadges = [
        station.services.cngRefuel
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">⛽ تموين غاز</span>`
          : '',
        station.services.bpOilCenter
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">🛢️ مركز زيوت BP</span>`
          : '',
        station.services.canopyOilSales
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">🧴 زيوت أسفل المظلة</span>`
          : '',
        station.services.conversionMaintenance
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">🔧 صيانة وتحويل</span>`
          : '',
        station.services.cylinderTesting
          ? station.services.cylinderTestingUpcoming
            ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">🛡️ فحص أسطوانات (قريباً)</span>`
            : `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">🛡️ فحص أسطوانات (فعلي)</span>`
          : '',
      ]
        .filter(Boolean)
        .join(' ');

      const popupHtml = `
        <div class="p-3 max-w-[280px] font-['Cairo'] text-right" dir="rtl">
          <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <div>
              <h3 class="font-bold text-sm text-slate-900 leading-tight">${station.name}</h3>
              <p class="text-xs text-emerald-600 font-semibold mt-0.5">${station.company}</p>
            </div>
            ${
              station.distance !== undefined
                ? `<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap">${formatDistance(station.distance)}</span>`
                : ''
            }
          </div>
          
          <p class="text-xs text-slate-600 mb-2 leading-relaxed flex items-center gap-1">
            <span>📍</span> ${station.address}
          </p>

          <div class="flex flex-wrap gap-1 mb-3">
            ${servicesBadges}
          </div>

          <div class="flex items-center justify-between text-xs text-slate-500 mb-3 bg-slate-50 p-1.5 rounded">
            <span>🕒 ${station.workingHours || '24 ساعة'}</span>
            <span class="text-emerald-700 font-medium">ضغط: ${station.pressure || '220 بار'}</span>
          </div>

          <a 
            href="${navUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="flex items-center justify-center gap-2 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition duration-150 no-underline"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
            ابدأ الملاحة في Google Maps
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 320,
        className: 'custom-station-popup',
      });

      marker.on('click', () => {
        setActiveMapStation(station);
        if (onStationSelect) {
          onStationSelect(station);
        }
      });

      markersLayer.addLayer(marker);
    });
  }, [filteredStations, activeMapStation, onStationSelect, setActiveMapStation, settings.defaultStationLogoUrl]);

  // التوجه إلى المحطة النشطة عند اختيارها
  useEffect(() => {
    if (!activeMapStation || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([activeMapStation.lat, activeMapStation.lng], 15, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [activeMapStation]);

  // التوجه والتركيز على موقع المستخدم فور طلبه من أي مكان بالتطبيق (الهيدر أو الخريطة)
  useEffect(() => {
    if (userLocateTrigger && userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [userLocateTrigger]);

  // التوجه لموقع المستخدم بسلاسة وبدون أي وميض
  const handleLocateUser = async () => {
    if (isLocating) return;

    // إذا كان الموقع معلوماً بالفعل، نتحرك إليه فوراً بدون انتظار الشبكة
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
    }

    const loc = await requestUserLocation(true);
    if (loc && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 14, { duration: 0.8 });
    }
  };

  // زر العثور على أقرب محطة غاز فوراً
  const handleFindClosestQuick = (service?: keyof Station['services']) => {
    if (!userLocation) {
      handleLocateUser().then(() => {
        const closest = findClosestStation(service);
        if (closest) {
          setActiveMapStation(closest);
        }
      });
      return;
    }

    const closest = findClosestStation(service);
    if (closest && mapInstanceRef.current) {
      setActiveMapStation(closest);
      mapInstanceRef.current.flyTo([closest.lat, closest.lng], 15, { duration: 1.2 });
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-inner ${className}`}>
      {/* حاوية الخريطة من Leaflet */}
      <div ref={mapContainerRef} className={`w-full h-full z-0 ${isPickingLocation ? 'cursor-crosshair' : ''}`} />

      {/* تنبيه وضع تحديد الموقع بالنقر */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-white px-4 py-2 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4" />
          <span>انقر على موقعك الآن في أي نقطة على الخريطة!</span>
          <button
            onClick={() => setIsPickingLocation(false)}
            className="px-2 py-0.5 bg-black/20 hover:bg-black/40 rounded-lg text-[10px]"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* شريط الإجراءات السريعة العائم فوق الخريطة */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 max-w-[200px] sm:max-w-none">
        {/* زر تحديد الموقع الحالي */}
        {settings.showMapLocateButton && (
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            title="تحديد موقعي الحالي"
            className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur text-slate-800 dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-xs font-bold"
          >
            <Crosshair className={`w-4 h-4 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">موقعي الحالي</span>
          </button>
        )}

        {/* زر النقر على الخريطة لتحديد الموقع يدوياً */}
        {settings.showMapPickButton && (
          <button
            onClick={() => setIsPickingLocation(!isPickingLocation)}
            title="انقر على أي نقطة في الخريطة لتحديد مكانك"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border transition text-xs font-bold ${
              isPickingLocation
                ? 'bg-amber-600 text-white animate-pulse border-amber-400 ring-2 ring-amber-300'
                : 'bg-white/95 dark:bg-slate-800/95 backdrop-blur text-slate-800 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <MapPin className={`w-4 h-4 ${isPickingLocation ? 'text-white' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">{isPickingLocation ? 'انقر بالخريطة...' : 'تحديد بالخريطة'}</span>
          </button>
        )}

        {/* زر أقرب محطة غاز */}
        {settings.showMapQuickCng && (
          <button
            onClick={() => handleFindClosestQuick('cngRefuel')}
            title="أقرب محطة تموين غاز"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600/95 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
          >
            <Flame className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">أقرب محطة غاز</span>
          </button>
        )}

        {/* زر أقرب مركز تحويل وصيانة */}
        {(settings.showMapQuickConversion ?? true) && (
          <button
            onClick={() => handleFindClosestQuick('conversionMaintenance')}
            title="أقرب مركز لتحويل وصيانة السيارات"
            className="flex items-center gap-2 px-3 py-2 bg-amber-600/95 hover:bg-amber-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
          >
            <Wrench className="w-4 h-4 text-amber-200" />
            <span className="hidden sm:inline">مراكز التحويل</span>
          </button>
        )}

        {/* زر أقرب مركز زيوت BP */}
        {settings.showMapQuickBp && (
          <button
            onClick={() => handleFindClosestQuick('bpOilCenter')}
            title="أقرب مركز زيوت BP كاسترول"
            className="flex items-center gap-2 px-3 py-2 bg-blue-600/95 hover:bg-blue-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
          >
            <Droplets className="w-4 h-4 text-blue-200" />
            <span className="hidden sm:inline">مراكز الزيوت</span>
          </button>
        )}

        {/* زر أقرب مركز فحص أسطوانات */}
        {settings.showMapQuickCylinder && (
          <button
            onClick={() => handleFindClosestQuick('cylinderTesting')}
            title="أقرب مركز لفحص الأسطوانات"
            className="flex items-center gap-2 px-3 py-2 bg-purple-600/95 hover:bg-purple-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
          >
            <ShieldCheck className="w-4 h-4 text-purple-200" />
            <span className="hidden sm:inline">فحص الأسطوانات</span>
          </button>
        )}
      </div>

      {/* محول ومستكشف أنظمة الخريطة الشامل (Satellite, OSM, Voyager, Dark, Topo, HOT) ومفتاح API */}
      {settings.showMapTypeSwitcher && (
        <div className="absolute top-4 left-4 z-20">
          <div className="relative">
            <button
              onClick={() => setShowSystemsMenu(!showSystemsMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-xs font-bold active:scale-95 cursor-pointer"
              title="تغيير نظام الخريطة (أقمار صناعية، OSM، ملاحة، رؤية ليلية، تضاريس)"
            >
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">أنظمة الخريطة</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-black">
                <span>{MAP_SYSTEMS.find((s) => s.id === mapSystem)?.icon}</span>
                <span>{MAP_SYSTEMS.find((s) => s.id === mapSystem)?.name}</span>
              </span>
            </button>

            {/* القائمة المنسدلة لجميع أنظمة الخريطة */}
            {showSystemsMenu && (
              <div
                className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 text-right z-30 animate-in fade-in zoom-in-95 duration-150"
                dir="rtl"
              >
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>أنظمة الخريطة المتاحة (6 أنظمة)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    مفتوح 100% مجاناً
                  </span>
                </div>

                <div className="py-1 space-y-1">
                  {MAP_SYSTEMS.map((sys) => {
                    const isCurrent = mapSystem === sys.id;
                    return (
                      <button
                        key={sys.id}
                        onClick={() => {
                          setMapSystem(sys.id);
                          localStorage.setItem('cargas_preferred_map_system', sys.id);
                          setShowSystemsMenu(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-right transition cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="text-xl shrink-0 mt-0.5">{sys.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs">{sys.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                                النشط ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {sys.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* زر الإعدادات ومفتاح API */}
                <div className="mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowSystemsMenu(false);
                      setIsAdminOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>ضبط أو إضافة مفتاح API للخرائط</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-xl text-[11px] shadow border border-slate-200 dark:border-slate-700">
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> تموين غاز
        </span>
        <span className="flex items-center gap-1 text-blue-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> زيوت BP
        </span>
        <span className="flex items-center gap-1 text-purple-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> فحص أسطوانات
        </span>
        <span className="flex items-center gap-1 text-amber-700 font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> تحويل وصيانة
        </span>
      </div>
    </div>
  );
};
