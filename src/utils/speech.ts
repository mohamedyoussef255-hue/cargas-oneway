/**
 * أداة التعرف على الصوت والنطق باللغة العربية والمصرية
 */

// نوع متوافق لـ SpeechRecognition
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/**
 * التحقق من دعم التعرف الصوتي في المتصفح
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * بدء الاستماع الصوتي
 */
export function startVoiceRecognition(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void } | null {
  if (!isSpeechRecognitionSupported()) {
    onError('التعرف الصوتي غير مدعوم في هذا المتصفح');
    return null;
  }

  try {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;

    const recognition = new SpeechRec();
    recognition.lang = 'ar-EG'; // اللهجة المصرية
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        onTranscript(final.trim(), true);
      } else if (interim) {
        onTranscript(interim.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      let msg = 'حدث خطأ أثناء الاستماع';
      if (event.error === 'no-speech') {
        msg = 'لم يتم سماع أي صوت، حاول مرة ثانية';
      } else if (event.error === 'not-allowed') {
        msg = 'يرجى السماح بصلاحية الميكروفون';
      }
      onError(msg);
    };

    recognition.onend = () => {
      onEnd();
    };

    playChime(600, 0.1); // نغمة تنبيه لطيفة للبدء
    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  } catch (err) {
    onError('تعذر تشغيل الميكروفون');
    return null;
  }
}

/**
 * النطق بالصوت العربي الودود لمساعد "مُعين"
 */
export function speakArabic(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // إلغاء أي كلام سابق

    // تنظيف النص من الرموز والتشكيل الزائد المعيق للنطق
    const cleanText = text.replace(/[*#_~`]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-EG';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    // محاولة اختيار أفضل صوت عربي متاح
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice =
      voices.find((v) => v.lang.startsWith('ar') && (v.name.includes('Egypt') || v.name.includes('Salma') || v.name.includes('Tarik') || v.name.includes('Maged'))) ||
      voices.find((v) => v.lang.startsWith('ar')) ||
      null;

    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * إيقاف الصوت
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * عزف نغمة تنبيه صوتية بسيطة بدون ملفات خارجية (Web Audio API)
 */
export function playChime(freq = 520, duration = 0.15): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

import { Station, StationServices } from '../types/station';

/**
 * توحيد النص العربي لإجراء مقارنات وبحث ذكي دقيق (إزالة التشكيل وتوحيد الحروف المتشابهة)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
    .replace(/[أإآٱ]/g, 'ا') // توحيد الألف
    .replace(/[ىي]/g, 'ي') // توحيد الياء
    .replace(/[ةه]/g, 'ه') // توحيد التاء المربوطة والهاء
    .replace(/\u0640/g, '') // إزالة التطويل
    .replace(/[-–_#()[\],.،/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * تنقية الكلام الصوتي من الكلمات الاستفتاحية المعتادة في الإملاء
 */
export function cleanSpokenSearchText(phrase: string): string {
  if (!phrase) return '';
  let cleaned = phrase.trim();
  cleaned = cleaned
    .replace(/^(?:ابحث\s+عن|دور\s+على|عايز\s+محطة|عاوز\s+محطة|عايز\s+محطه|عاوز\s+محطه|عايز\s+مركز|عاوز\s+مركز|وديني\s+(?:لـ|الي|إلى|علي|على|محطة|محطه|فرع)?|فين\s+(?:محطة|محطه)?|محطة|محطه|مركز|فرع|منطقة|يا\s+معين|لو\s+سمحت|من\s+فضلك)\s+/gi, '')
    .trim();
  return cleaned || phrase.trim();
}

export interface VoiceCommandResult {
  action: 'closest' | 'station' | 'service' | 'dictation';
  searchQuery: string; // ما يجب كتابته فوراً في خانة البحث النصي
  matchedStation?: Station;
  serviceKey?: keyof StationServices;
  feedbackText: string;
}

/**
 * تحليل وتفسير الأمر الصوتي واستخلاص اسم المحطة بدقة فائقة
 * بحيث يكتب في البحث اسم المحطة أو ما تم إملاؤه للصوت
 */
export function interpretVoiceCommand(
  rawTranscript: string,
  stations: Station[]
): VoiceCommandResult {
  const normRaw = normalizeArabicText(rawTranscript);
  const cleanedText = cleanSpokenSearchText(rawTranscript);
  const normCleaned = normalizeArabicText(cleanedText);

  // 1. أمر أقرب محطة (عموماً أو بنشاط محدد)
  if (normRaw.includes('اقرب') || normRaw.includes('قريب')) {
    let serviceKey: keyof StationServices = 'cngRefuel';
    let serviceLabel = 'تموين الغاز';

    if (normRaw.includes('زيت') || normRaw.includes('زيوت') || normRaw.includes('bp') || normRaw.includes('بي بي')) {
      serviceKey = 'bpOilCenter';
      serviceLabel = 'زيوت BP';
    } else if (normRaw.includes('فحص') || normRaw.includes('اسطوان') || normRaw.includes('اختبار')) {
      serviceKey = 'cylinderTesting';
      serviceLabel = 'فحص الأسطوانات';
    } else if (normRaw.includes('صيان') || normRaw.includes('تحويل') || normRaw.includes('ورشه')) {
      serviceKey = 'conversionMaintenance';
      serviceLabel = 'التحويل والصيانة';
    }

    return {
      action: 'closest',
      searchQuery: rawTranscript.trim(),
      serviceKey,
      feedbackText: `جاري البحث عن أقرب محطة ${serviceLabel} لموقعك...`,
    };
  }

  // 2. البحث عن اسم محطة محددة من شبكة المحطات
  let bestMatch: Station | null = null;
  let bestScore = 0;

  for (const st of stations) {
    const normName = normalizeArabicText(st.name);
    const normPureName = normName.replace(/^كارجاس\s+/, '');
    const normAddress = normalizeArabicText(st.address || '');
    const normCity = normalizeArabicText(st.city || '');
    const normGov = normalizeArabicText(st.governorate || '');

    let score = 0;

    // تطابق تام مع الاسم الصافي أو الكامل
    if (normCleaned === normPureName || normCleaned === normName) {
      score = 100;
    } else if (normCleaned.length >= 3 && (normPureName.includes(normCleaned) || normName.includes(normCleaned))) {
      score = 80 + normCleaned.length;
    } else if (normPureName.length >= 3 && normCleaned.includes(normPureName)) {
      score = 75 + normPureName.length;
    } else {
      // فحص الكلمات المفردة المهمة (مثل "ألماظة"، "شبرا"، "وادي حوف"، "مصدق"، إلخ)
      const words = normCleaned.split(' ').filter((w) => w.length >= 3 && !['محطه', 'محطة', 'شارع', 'طريق', 'فرع', 'مركز', 'كارجاس'].includes(w));
      for (const w of words) {
        if (normPureName.includes(w)) {
          score += 40;
        } else if (normAddress.includes(w)) {
          score += 25;
        } else if (normCity.includes(w)) {
          score += 20;
        } else if (normGov.includes(w)) {
          score += 15;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = st;
    }
  }

  // إذا وُجد تطابق جيد مع إحدى المحطات، نعتمد اسمها بالضبط لخانة البحث
  if (bestMatch && bestScore >= 35) {
    return {
      action: 'station',
      searchQuery: bestMatch.name, // يكتب في البحث اسم المحطة بالضبط!
      matchedStation: bestMatch,
      feedbackText: `تم العثور على ${bestMatch.name} يا باشا، وجاري توجيهك إليها`,
    };
  }

  // 3. فلتر النشاط إذا لم تذكر محطة محددة
  if (normRaw.includes('زيوت') || normRaw.includes('بي بي') || normRaw.includes('bp')) {
    return {
      action: 'service',
      searchQuery: rawTranscript.trim(),
      serviceKey: 'bpOilCenter',
      feedbackText: 'تم تحديد مراكز زيوت BP كاسترول المعتمدة',
    };
  }
  if (normRaw.includes('فحص') || normRaw.includes('اسطوان')) {
    return {
      action: 'service',
      searchQuery: rawTranscript.trim(),
      serviceKey: 'cylinderTesting',
      feedbackText: 'تم تحديد مراكز فحص واختبار أسطوانات الغاز',
    };
  }
  if (normRaw.includes('تحويل') || normRaw.includes('صيان')) {
    return {
      action: 'service',
      searchQuery: rawTranscript.trim(),
      serviceKey: 'conversionMaintenance',
      feedbackText: 'تم تحديد مراكز التحويل والصيانة المعتمدة',
    };
  }

  // 4. إملاء عام بالصوت: يكتب في البحث ما تم إملاؤه للصوت
  return {
    action: 'dictation',
    searchQuery: cleanedText || rawTranscript.trim(),
    feedbackText: `تم البحث عن: ${cleanedText || rawTranscript.trim()}`,
  };
}
