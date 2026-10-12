import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StationServices } from '../types/station';
import { startVoiceRecognition, isSpeechRecognitionSupported, speakArabic } from '../utils/speech';
import {
  Search,
  Mic,
  MicOff,
  Flame,
  Droplets,
  Wrench,
  ShieldCheck,
  Compass,
  X,
  Filter,
  Check,
} from 'lucide-react';

export const FilterBar: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedService,
    setSelectedService,
    selectedGovernorate,
    setSelectedGovernorate,
    findClosestStation,
    setActiveMapStation,
    userLocation,
    requestUserLocation,
    stations,
    settings,
  } = useApp();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [speechRecognizer, setSpeechRecognizer] = useState<{ stop: () => void } | null>(null);

  // قائمة المحافظات الفريدة المستخلصة من البيانات
  const governorates = Array.from(new Set(stations.map((s) => s.governorate))).filter(Boolean);

  const serviceFilters: {
    id: keyof StationServices | 'all';
    label: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    { id: 'all', label: 'جميع المحطات', icon: <Compass className="w-3.5 h-3.5" />, color: 'emerald' },
    { id: 'cngRefuel', label: settings.cngLabel || 'تموين غاز', icon: <Flame className="w-3.5 h-3.5" />, color: 'emerald' },
    { id: 'bpOilCenter', label: settings.bpOilLabel || 'زيوت BP', icon: <Droplets className="w-3.5 h-3.5" />, color: 'blue' },
    { id: 'conversionMaintenance', label: settings.maintenanceLabel || 'صيانة وتحويل', icon: <Wrench className="w-3.5 h-3.5" />, color: 'amber' },
    { id: 'cylinderTesting', label: settings.cylinderLabel || 'فحص أسطوانات', icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'purple' },
  ];

  // تفعيل البحث الصوتي الذكي
  const handleToggleVoiceSearch = () => {
    if (isListening) {
      speechRecognizer?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      alert('التعرف الصوتي غير مدعوم في متصفحك حالياً.');
      return;
    }

    setIsListening(true);
    setVoiceTranscript('جاري الاستماع...');

    const rec = startVoiceRecognition(
      (transcript, isFinal) => {
        setVoiceTranscript(transcript);

        if (isFinal) {
          processVoiceCommand(transcript);
          setIsListening(false);
        }
      },
      (error) => {
        setVoiceTranscript(error);
        setTimeout(() => setVoiceTranscript(''), 3000);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    setSpeechRecognizer(rec);
  };

  // معالجة الأوامر والعبارات الصوتية الذكية
  const processVoiceCommand = async (phrase: string) => {
    const text = phrase.toLowerCase();

    // 1. أمر أقرب محطة عموماً
    if (text.includes('أقرب') || text.includes('اقرب')) {
      let targetService: keyof StationServices | undefined = undefined;

      if (text.includes('زيت') || text.includes('زيوت') || text.includes('bp') || text.includes('بي بي')) {
        targetService = 'bpOilCenter';
        setSelectedService('bpOilCenter');
      } else if (text.includes('فحص') || text.includes('اسطوان') || text.includes('أسطوان') || text.includes('اختبار')) {
        targetService = 'cylinderTesting';
        setSelectedService('cylinderTesting');
      } else if (text.includes('صيانة') || text.includes('تحويل') || text.includes('ورشة')) {
        targetService = 'conversionMaintenance';
        setSelectedService('conversionMaintenance');
      } else {
        targetService = 'cngRefuel';
        setSelectedService('cngRefuel');
      }

      if (!userLocation) {
        await requestUserLocation();
      }

      const closest = findClosestStation(targetService);
      if (closest) {
        setActiveMapStation(closest);
        if (settings.moeenVoiceEnabled) {
          speakArabic(`لقيتلك أقرب محطة يا باشا، ${closest.name}، تقدر تبدأ الملاحة فوراً`);
        }
      } else {
        if (settings.moeenVoiceEnabled) {
          speakArabic('حدد موقعك في البداية عشان أعرف أقرب محطة ليك');
        }
      }
      return;
    }

    // 2. فلتر حسب النشاط من الصوت
    if (text.includes('زيوت') || text.includes('بي بي') || text.includes('bp')) {
      setSelectedService('bpOilCenter');
      if (settings.moeenVoiceEnabled) speakArabic('تم تحديد مراكز زيوت بي بي كاسترول');
    } else if (text.includes('فحص') || text.includes('اسطوان') || text.includes('أسطوان')) {
      setSelectedService('cylinderTesting');
      if (settings.moeenVoiceEnabled) speakArabic('تم تحديد مراكز فحص واختبار الأسطوانات');
    } else if (text.includes('تحويل') || text.includes('صيانة')) {
      setSelectedService('conversionMaintenance');
      if (settings.moeenVoiceEnabled) speakArabic('تم تحديد مراكز الصيانة والتحويل');
    } else if (text.includes('غاز') || text.includes('تموين')) {
      setSelectedService('cngRefuel');
      if (settings.moeenVoiceEnabled) speakArabic('تم تحديد محطات تموين الغاز الطبيعي');
    } else {
      // بحث نصي عادي بما قاله المستخدم
      setSearchQuery(phrase);
    }
  };

  // زر العثور على أقرب محطة
  const handleFindClosestClick = async () => {
    let loc = userLocation;
    if (!loc) {
      loc = await requestUserLocation();
    }
    if (loc) {
      const closest = findClosestStation(selectedService === 'all' ? undefined : selectedService);
      if (closest) {
        setActiveMapStation(closest);
      }
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-3 sm:p-4 space-y-3">
      {/* الصف الأول: حقل البحث النصي + زر البحث الصوتي + زر أقرب محطة + اختيار المحافظة */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        {/* شريط البحث النصي */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم، المحافظة، الحي، أو الشارع..."
            className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* زر البحث الصوتي بالذكاء الاصطناعي والميكروفون */}
        <button
          onClick={handleToggleVoiceSearch}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 shrink-0 ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-lg ring-2 ring-rose-400'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800'
          }`}
          title="بحث صوتي: قل 'أقرب محطة' أو 'زيوت BP' أو 'فحص أسطوانات'"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isListening ? 'جاري الاستماع...' : (settings.voiceSearchButtonText || 'بحث صوتي')}</span>
        </button>

        {/* اختيار المحافظة */}
        <div className="sm:w-44 shrink-0">
          <select
            value={selectedGovernorate}
            onChange={(e) => setSelectedGovernorate(e.target.value)}
            className="w-full py-2.5 px-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">كل المحافظات ({stations.length})</option>
            {governorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        {/* زر أقرب محطة لي (Haversine) */}
        <button
          onClick={handleFindClosestClick}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow transition shrink-0"
        >
          <Compass className="w-4 h-4" />
          <span>{settings.closestStationButtonText || 'أقرب محطة لي'}</span>
        </button>
      </div>

      {/* تنبيه الاستماع الصوتي إن كان نشطاً */}
      {isListening && (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <span>{voiceTranscript || 'تحدث الآن، مثال: "أقرب محطة غاز" أو "زيوت BP"...'}</span>
          </div>
          <button
            onClick={() => setIsListening(false)}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* الصف الثاني: رقائق الفلاتر الخاصة بالأنشطة (Checkboxes / Chips) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        <span className="text-xs text-slate-400 font-semibold pl-1 shrink-0 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> الأنشطة:
        </span>
        {serviceFilters.map((f) => {
          const isActive = selectedService === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedService(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
              {isActive && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
