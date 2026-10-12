import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Station } from '../types/station';
import { useApp } from '../context/AppContext';
import { getGoogleMapsNavigationUrl, formatDistance } from '../utils/geo';
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
    isLocating,
    requestUserLocation,
    setUserLocationManual,
    findClosestStation,
    theme,
    settings,
  } = useApp();

  const [mapType, setMapType] = useState<'osm' | 'voyager' | 'dark'>('voyager');
  const [isPickingLocation, setIsPickingLocation] = useState(false);

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

  // تغيير نوع خريطة الخلفية (Tiles)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // مسح الطبقات السابقة
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO';

    if (mapType === 'dark' || (mapType === 'voyager' && theme === 'dark')) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapType === 'osm') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);
  }, [mapType, theme]);

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
      // تحديد لوجو المحطة إن وجد أو اللوجو العام
      const stationLogo = station.logoUrl || settings.defaultStationLogoUrl;

      // تحديد لون وأيقونة العلامة حسب النشاط الرئيسي
      let bgColor = 'bg-emerald-600';
      let iconColor = 'text-white';
      let pinSymbol = '⚡';

      if (station.services.cylinderTesting) {
        bgColor = 'bg-purple-600';
        pinSymbol = '🛡️';
      } else if (station.services.bpOilCenter && !station.services.cngRefuel) {
        bgColor = 'bg-blue-600';
        pinSymbol = '🛢️';
      } else if (station.services.conversionMaintenance && !station.services.cngRefuel) {
        bgColor = 'bg-amber-600';
        pinSymbol = '🔧';
      } else {
        bgColor = 'bg-emerald-600';
        pinSymbol = '⛽';
      }

      const isSelected = activeMapStation?.id === station.id;

      const markerInner = stationLogo
        ? `<div class="w-11 h-11 bg-white rounded-full border-2 border-emerald-600 shadow-lg flex items-center justify-center p-1 overflow-hidden shadow-slate-900/30">
             <img src="${stationLogo}" class="w-full h-full object-contain rounded-full" alt="لوجو المحطة" />
           </div>
           <div class="w-2.5 h-2.5 bg-emerald-600 rotate-45 mx-auto -mt-1.5 border-r border-b border-white"></div>`
        : `<div class="w-10 h-10 ${bgColor} rounded-full border-2 border-white shadow-md flex items-center justify-center ${iconColor} text-base font-bold shadow-slate-900/30">
             ${pinSymbol}
           </div>
           <div class="w-2.5 h-2.5 ${bgColor} rotate-45 mx-auto -mt-1.5 border-r border-b border-white"></div>`;

      const markerHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          ${markerInner}
          ${
            station.distance !== undefined
              ? `<span class="absolute -bottom-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-bold bg-white text-slate-800 rounded shadow border border-slate-200 whitespace-nowrap">${formatDistance(station.distance)}</span>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-station-pin',
        html: markerHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 46],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([station.lat, station.lng], { icon: customIcon });

      // محتوى النافذة المنبثقة (Popup)
      const navUrl = getGoogleMapsNavigationUrl(station.lat, station.lng, station.name);

      const servicesBadges = [
        station.services.cngRefuel
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">⛽ تموين غاز</span>`
          : '',
        station.services.bpOilCenter
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">🛢️ زيوت BP</span>`
          : '',
        station.services.conversionMaintenance
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">🔧 صيانة وتحويل</span>`
          : '',
        station.services.cylinderTesting
          ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">🛡️ فحص أسطوانات</span>`
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
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          title="تحديد موقعي الحالي"
          className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur text-slate-800 dark:text-white rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-xs font-bold"
        >
          <Crosshair className={`w-4 h-4 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">موقعي الحالي</span>
        </button>

        {/* زر النقر على الخريطة لتحديد الموقع يدوياً */}
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

        {/* زر أقرب محطة غاز */}
        <button
          onClick={() => handleFindClosestQuick('cngRefuel')}
          title="أقرب محطة تموين غاز"
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600/95 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
        >
          <Flame className="w-4 h-4 text-emerald-200" />
          <span className="hidden sm:inline">أقرب محطة غاز</span>
        </button>

        {/* زر أقرب مركز فحص أسطوانات */}
        <button
          onClick={() => handleFindClosestQuick('cylinderTesting')}
          title="أقرب مركز لفحص الأسطوانات"
          className="flex items-center gap-2 px-3 py-2 bg-purple-600/95 hover:bg-purple-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
        >
          <ShieldCheck className="w-4 h-4 text-purple-200" />
          <span className="hidden sm:inline">فحص الأسطوانات</span>
        </button>

        {/* زر أقرب مركز زيوت BP */}
        <button
          onClick={() => handleFindClosestQuick('bpOilCenter')}
          title="أقرب مركز زيوت BP كاسترول"
          className="flex items-center gap-2 px-3 py-2 bg-blue-600/95 hover:bg-blue-700 text-white rounded-xl shadow-lg transition text-xs font-bold"
        >
          <Droplets className="w-4 h-4 text-blue-200" />
          <span className="hidden sm:inline">مركز زيوت BP</span>
        </button>
      </div>

      {/* زر تبديل نمط الخريطة (قمر صناعي / شوارع / هادئ) */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur p-1 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs">
          <button
            onClick={() => setMapType('voyager')}
            className={`px-2 py-1 rounded-lg font-medium transition ${
              mapType === 'voyager'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            واضحة
          </button>
          <button
            onClick={() => setMapType('osm')}
            className={`px-2 py-1 rounded-lg font-medium transition ${
              mapType === 'osm'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            OSM
          </button>
          <button
            onClick={() => setMapType('dark')}
            className={`px-2 py-1 rounded-lg font-medium transition ${
              mapType === 'dark'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            ليلي
          </button>
        </div>
      </div>

      {/* دلالات الألوان في الركن السفلي */}
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
