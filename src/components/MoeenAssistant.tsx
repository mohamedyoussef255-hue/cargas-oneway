import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { speakArabic, stopSpeaking } from '../utils/speech';
import {
  Bot,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Compass,
  Flame,
  Droplets,
  ShieldCheck,
  Send,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';

export const MoeenAssistant: React.FC = () => {
  const {
    settings,
    isMoeenOpen,
    setIsMoeenOpen,
    findClosestStation,
    setActiveMapStation,
    setSelectedService,
    userLocation,
    requestUserLocation,
  } = useApp();

  const [message, setMessage] = useState<string>(settings.moeenGreetingText);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');

  // تحديث الرسالة إذا تغيرت من الإعدادات
  useEffect(() => {
    setMessage(settings.moeenGreetingText);
  }, [settings.moeenGreetingText]);

  // نطق الرسالة الترحيبية عند الفتح إذا كان الصوت مفعلاً
  useEffect(() => {
    if (isMoeenOpen && settings.moeenVoiceEnabled) {
      speakEgyptian(message);
    }
    return () => {
      stopSpeaking();
    };
  }, [isMoeenOpen]);

  const speakEgyptian = (text: string) => {
    if (!settings.moeenVoiceEnabled) return;
    setIsSpeaking(true);
    speakArabic(text, () => setIsSpeaking(false));
  };

  const handleQuickQuestion = async (type: string) => {
    let reply = '';

    if (type === 'closest_cng') {
      setSelectedService('cngRefuel');
      let loc = userLocation;
      if (!loc) loc = await requestUserLocation();
      const closest = findClosestStation('cngRefuel');
      if (closest) {
        setActiveMapStation(closest);
        reply = `لقيتلك أقرب محطة تموين غاز طبيعي: "${closest.name}" في ${closest.governorate}، تبعد عنك حوالي ${closest.distance?.toFixed(1) || ''} كم. اضغط على زر "ابدأ الملاحة" وهتفتح خرائط جوجل مباشرة بدون أي تكلفة!`;
      } else {
        reply = 'فعّل إذن الموقع الجغرافي (GPS) عشان أقدر أحسبلك أقرب محطة غاز لمكانك الحالي بالضبط.';
      }
    } else if (type === 'bp_oils') {
      setSelectedService('bpOilCenter');
      let loc = userLocation;
      if (!loc) loc = await requestUserLocation();
      const closest = findClosestStation('bpOilCenter');
      if (closest) {
        setActiveMapStation(closest);
        reply = `تمام يا فندم! فلترتلك مراكز زيوت BP كاسترول المعتمدة، وأقرب مركز ليك هو "${closest.name}". الزيوت هناك أصلية 100% مع غيار الفلاتر وسوائل التبريد.`;
      } else {
        reply = 'تم تفعيل فلتر مراكز زيوت BP، تقدر تشوف كافة المراكز المتاحة على الخريطة وقائمتها.';
      }
    } else if (type === 'cylinder_test') {
      setSelectedService('cylinderTesting');
      let loc = userLocation;
      if (!loc) loc = await requestUserLocation();
      const closest = findClosestStation('cylinderTesting');
      if (closest) {
        setActiveMapStation(closest);
        reply = `مراكز الفحص الهيدروستاتيكي المعتمدة لأسطوانات الغاز متوفرة، وأقرب مركز هو "${closest.name}". الفحص بيتم بأعلى معايير السلامة والأمان لكارجاس وغازتك.`;
      } else {
        reply = 'تم تصفية مراكز فحص الأسطوانات الدورية المعتمدة على الخريطة.';
      }
    } else if (type === 'explain_app') {
      reply =
        'التطبيق ده معمول بخبرة وهندسة عالية ليخدمك مجاناً وبدون أي تكلفة! الخريطة شغالة بـ OpenStreetMap، ولما تدوس "ابدأ الملاحة" بيفتح تطبيق Google Maps على موبايلك للتوجيه الصوتي اللحظي. وتقدر تبحث بالصوت أو ترفع ملفات محطات KMZ/KML من لوحة تحكم الإدارة!';
    } else if (type === 'admin_guide') {
      reply =
        'لو أنت مدير النظام، اضغط 5 مرات متتالية على شعار التطبيق فوق على اليمين، واكتب كلمة السر الافتراضية "0000". هتقدر ترفع ملفات KMZ وتعدل أسماء المحطات والأنشطة بكل سهولة!';
    }

    setMessage(reply);
    speakEgyptian(reply);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const q = customInput.toLowerCase();
    let reply = '';

    if (q.includes('مين انت') || q.includes('شخصيتك') || q.includes('اسمك')) {
      reply = settings.showCompanyInfo
        ? `أنا "مُعين"، مساعدك الذكي من ${settings.companyName}. بجمع بين جدعنة ابن البلد وهندسة النظم القوية عشان أخدمك في كل مشاويرك ومحطاتك!`
        : 'أنا "مُعين"، مساعدك الذكي هنا عشان أدلك على أقرب محطة وقود وخدمات وأساعدك تبدأ الملاحة الصوتية فوراً!';
    } else if (q.includes('اقرب') || q.includes('أقرب')) {
      handleQuickQuestion('closest_cng');
      setCustomInput('');
      return;
    } else if (q.includes('زيت') || q.includes('bp') || q.includes('بي بي')) {
      handleQuickQuestion('bp_oils');
      setCustomInput('');
      return;
    } else if (q.includes('اسطوان') || q.includes('فحص')) {
      handleQuickQuestion('cylinder_test');
      setCustomInput('');
      return;
    } else {
      reply = `أنا فهمت سؤالك عن "${customInput}"، جرب تختار الفلتر المناسب من شريط الأنشطة أو استخدم زر "أقرب محطة لي" وهيتم التوجيه فوراً!`;
    }

    setMessage(reply);
    speakEgyptian(reply);
    setCustomInput('');
  };

  // إذا تم إخفاء المساعد من إعدادات الإدارة
  if (!settings.enableMoeen) return null;

  return (
    <>
      {/* زر المساعد العائم في الأسفل */}
      {!isMoeenOpen && (
        <button
          onClick={() => setIsMoeenOpen(true)}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full shadow-2xl border-2 border-white/40 active:scale-95 transition-all duration-200 group"
          title="تحدث مع مُعين - المساعد الذكي"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
              🤖
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-emerald-700 animate-pulse"></span>
          </div>
          <div className="text-right">
            <span className="text-xs font-black block leading-none">مُعيـن الذكي</span>
            <span className="text-[10px] text-emerald-100 block">شرح وملاحة صوتية</span>
          </div>
        </button>
      )}

      {/* نافذة المحادثة والشرح للمساعد مُعين */}
      {isMoeenOpen && (
        <div
          className="fixed bottom-5 left-5 z-50 w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-right animate-scale-up"
          dir="rtl"
        >
          {/* شريط الرأس */}
          <div className="bg-gradient-to-l from-emerald-600 via-teal-700 to-slate-800 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-lg shadow">
                🤖
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  مُعيـن (المساعد الذكي)
                  {settings.showCompanyInfo && (
                    <span className="text-[10px] bg-emerald-500/40 text-emerald-100 px-1.5 py-0.2 rounded font-mono">
                      {settings.companyName}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-emerald-100">ابن البلد.. يرشدك لأقرب محطة</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                    setIsSpeaking(false);
                  } else {
                    speakEgyptian(message);
                  }
                }}
                className={`p-2 rounded-xl transition ${
                  isSpeaking ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title={isSpeaking ? 'كتم الصوت' : 'تشغيل الصوت'}
              >
                {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsSpeaking(false);
                  setIsMoeenOpen(false);
                }}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* فقاعة الحديث والشرح */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 max-h-[320px] overflow-y-auto space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 text-xs font-bold">
                م
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tr-none shadow-sm border border-slate-100 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                {message}
                {isSpeaking && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>بيتكلم دلوقتي...</span>
                  </div>
                )}
              </div>
            </div>

            {/* أزرار سريعة لطرح الأسئلة الشائعة */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                اختصارات سريعة للملاحة والخدمات:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleQuickQuestion('closest_cng')}
                  className="flex items-center gap-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 rounded-xl text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition text-right"
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>أقرب محطة غاز؟</span>
                </button>
                <button
                  onClick={() => handleQuickQuestion('bp_oils')}
                  className="flex items-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-800 dark:text-blue-300 rounded-xl text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition text-right"
                >
                  <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>مراكز زيوت BP</span>
                </button>
                <button
                  onClick={() => handleQuickQuestion('cylinder_test')}
                  className="flex items-center gap-1.5 p-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-800 dark:text-purple-300 rounded-xl text-[11px] font-bold border border-purple-200 dark:border-purple-800 transition text-right"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>فحص الأسطوانات</span>
                </button>
                <button
                  onClick={() => handleQuickQuestion('explain_app')}
                  className="flex items-center gap-1.5 p-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-bold border border-amber-200 dark:border-amber-800 transition text-right"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>شرح التطبيق كامل</span>
                </button>
              </div>
            </div>
          </div>

          {/* حقل إدخال سؤال للمساعد */}
          <form onSubmit={handleCustomSubmit} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="اسأل مُعين أي سؤال عن المحطات..."
              className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition"
              title="إرسال"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
