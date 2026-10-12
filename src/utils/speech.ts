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
