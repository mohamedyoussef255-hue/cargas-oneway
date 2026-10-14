import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StationServices } from '../types/station';
import {
  startVoiceRecognition,
  isSpeechRecognitionSupported,
  speakArabic,
  interpretVoiceCommand,
} from '../utils/speech';
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
    { id: 'bpOilCenter', label: settings.bpOilLabel || 'مركز زيوت BP متكامل', icon: <Droplets className="w-3.5 h-3.5" />, color: 'blue' },
    { id: 'canopyOilSales', label: settings.canopyOilLabel || 'بيع زيوت أسفل المظلة', icon: <Droplets className="w-3.5 h-3.5" />, color: 'cyan' },
    { id: 'conversionMaintenance', label: settings.maintenanceLabel || 'صيانة وتحويل', icon: <Wrench className="w-3.5 h-3.5" />, color: 'amber' },
    { id: 'cylinderTesting', label: settings.cylinderLabel || 'فحص أسطوانات', icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'purple' },
  ];

  // تفعيل البحث الصوتي الذكي وكتابة الإملاء مباشرة في خانة البحث
  const handleToggleVoiceSearch = () => {
    if (isListening) {
      speechRecognizer?.stop();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceTranscript('التعرف الصوتي غير مدعوم في هذا المتصفح');
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setVoiceTranscript('');
      }, 3000);
      return;
    }

    setIsListening(true);
    setVoiceTranscript('جاري الاستماع... تحدث الآن');

    const rec = startVoiceRecognition(
      (transcript, isFinal) => {
        setVoiceTranscript(transcript);

        // كتابة ما تم إملاؤه للصوت مباشرة ولحظياً في خانة البحث النصي
        setSearchQuery(transcript);

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

  // معالجة الأوامر والعبارات الصوتية الذكية وتحديد اسم المحطة بدقة
  const processVoiceCommand = async (phrase: string) => {
    if (!phrase || !phrase.trim()) return;

    // استخراج الأمر الصوتي واسم المحطة بالذكاء الاصطناعي والتطبيع العربي
    const result = interpretVoiceCommand(phrase, stations);

    // 1. أمر أقرب محطة
    if (result.action === 'closest') {
      if (result.serviceKey) {
        setSelectedService(result.serviceKey);
      }

      let loc = userLocation;
      if (!loc) {
        loc = await requestUserLocation();
      }

      const closest = findClosestStation(result.serviceKey);
      if (closest) {
        setActiveMapStation(closest);
        // يكتب في البحث اسم المحطة الأقرب فوراً!
        setSearchQuery(closest.name);
        setVoiceTranscript(`أقرب محطة: ${closest.name}`);
        if (settings.moeenVoiceEnabled) {
          speakArabic(`لقيتلك أقرب محطة يا باشا، ${closest.name}، تقدر تبدأ الملاحة فوراً`);
        }
      } else {
        // كتابة ما تم إملاؤه للصوت في البحث
        setSearchQuery(phrase.trim());
        if (settings.moeenVoiceEnabled) {
          speakArabic('حدد موقعك في البداية عشان أقدر أعرف أقرب محطة ليك');
        }
      }
      return;
    }

    // 2. تم التعرف على اسم محطة معينة
    if (result.action === 'station' && result.matchedStation) {
      // كتابة اسم المحطة بالضبط في خانة البحث النصي
      setSearchQuery(result.matchedStation.name);
      setVoiceTranscript(`تم العثور على: ${result.matchedStation.name}`);
      setActiveMapStation(result.matchedStation);
      if (settings.moeenVoiceEnabled) {
        speakArabic(result.feedbackText);
      }
      return;
    }

    // 3. فلتر نشاط محدد
    if (result.action === 'service') {
      if (result.serviceKey) {
        setSelectedService(result.serviceKey);
      }
      // كتابة ما تم إملاؤه في البحث
      setSearchQuery(result.searchQuery);
      setVoiceTranscript(result.feedbackText);
      if (settings.moeenVoiceEnabled) {
        speakArabic(result.feedbackText);
      }
      return;
    }

    // 4. إملاء صوتي عام: كتابة ما تم إملاؤه للصوت مباشرة في خانة البحث
    setSearchQuery(result.searchQuery);
    setVoiceTranscript(`تم البحث عن: "${result.searchQuery}"`);
    if (settings.moeenVoiceEnabled) {
      speakArabic(`تم البحث عن ${result.searchQuery}`);
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
        // كتابة اسم المحطة الأقرب في شريط البحث أيضاً
        setSearchQuery(closest.name);
      }
    }
  };

  if (!settings.showFilterBar) {
    return null;
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-3 sm:p-4 space-y-3">
      {/* الصف الأول: حقل البحث النصي مع مايك داخلي + زر البحث الصوتي + زر أقرب محطة + اختيار المحافظة */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        {/* شريط البحث النصي مع مايكروفون مدمج للكتابة اللحظية */}
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isListening
                ? '🎙️ جاري الاستماع.. تحدث وسيكتب صوتك في البحث الآن...'
                : 'ابحث بالاسم، المحافظة، الحي، أو الشارع...'
            }
            className={`w-full pl-20 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-700/60 text-slate-900 dark:text-white rounded-xl border transition ${
              isListening
                ? 'border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/40 dark:bg-rose-950/30'
                : 'border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
            }`}
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {/* مايكروفون مدمج مباشرة داخل خانة البحث للإملاء الفوري */}
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse shadow'
                  : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-600'
              }`}
              title={isListening ? 'إيقاف الاستماع' : 'إملاء صوتي: قل اسم المحطة لكتابتها في البحث فوراً'}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* زر البحث الصوتي بالذكاء الاصطناعي والميكروفون */}
        {settings.showVoiceSearchButton && (
          <button
            onClick={handleToggleVoiceSearch}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-lg ring-2 ring-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800'
            }`}
            title="إملاء صوتي: قل اسم المحطة أو 'أقرب محطة' ليكتب في البحث"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'جاري الاستماع...' : (settings.voiceSearchButtonText || 'إملاء صوتي')}</span>
          </button>
        )}

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
        {settings.showClosestButton && (
          <button
            onClick={handleFindClosestClick}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow transition shrink-0 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{settings.closestStationButtonText || 'أقرب محطة لي'}</span>
          </button>
        )}
      </div>

      {/* تنبيه الاستماع الصوتي إن كان نشطاً مع عرض ما يتم إملاؤه */}
      {isListening && (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
            <span className="font-bold">
              {voiceTranscript || 'تحدث الآن: قل مثلاً "محطة ألماظة" أو "كارجاس شبرا" أو "أقرب محطة"...'}
            </span>
          </div>
          <button
            onClick={() => {
              speechRecognizer?.stop();
              setIsListening(false);
            }}
            className="text-xs font-bold underline hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer"
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
