import { Station } from '../types/station';

/**
 * قائمة الشركات الشريكة التي يتم وضعها في نهاية اسم المحطة
 * وفق قاعدة المستخدم: "عدم تكرار كلمة كارجاس وجعل كارجاس أول الاسم وفي آخر الاسم أي شركة تانية مثل وطنية موبيل التعاون"
 */
const PARTNER_COMPANIES: { pattern: RegExp; canonical: string }[] = [
  { pattern: /(?:ال)?وطنية|wataniya/i, canonical: 'وطنية' },
  { pattern: /(?:إكسون|اكسون)?\s*موبيل|mobil/i, canonical: 'موبيل' },
  { pattern: /(?:ال)?تعاون|coop/i, canonical: 'التعاون' },
  { pattern: /مصر\s+للبترول|misr(?:\s+petroleum)?/i, canonical: 'مصر للبترول' },
  { pattern: /شل|shell/i, canonical: 'شل' },
  { pattern: /طاقة(?:\s+عربية)?|taqa/i, canonical: 'طاقة' },
  { pattern: /توتال(?:\s+إنرجيز|\s+انرجيز)?|total/i, canonical: 'توتال' },
  { pattern: /تشيل\s*أوت|تشيل\s*اوت|chillout/i, canonical: 'تشيل أوت' },
  { pattern: /إمارات\s+مصر|امارات\s+مصر|emarat(?:\s+misr)?/i, canonical: 'إمارات مصر' },
  { pattern: /أولى|اولى|ola/i, canonical: 'أولى' },
  { pattern: /أولاد\s+بدوي|بدوي/i, canonical: 'أولاد بدوي' },
  { pattern: /غازتك|gastec/i, canonical: 'غازتك' },
  { pattern: /ماستر\s+غاز|master\s*gas/i, canonical: 'ماستر غاز' },
];

/**
 * تنقية وتوحيد اسم المحطة بدقة فائقة:
 * 1. عدم تكرار كلمة كارجاس نهائياً.
 * 2. جعل كلمة "كارجاس" أول الاسم دائماً.
 * 3. وضع أي شركة شريكة (مثل وطنية، موبيل، التعاون، شل، طاقة، إلخ) في نهاية الاسم فقط مفصولة بشرطة:
 *    مثال: "كارجاس مصدق - وطنية" أو "كارجاس الاستاد - التعاون" أو "كارجاس رمسيس - موبيل"
 * 4. إزالة الترقيم (1، 2، 3) والتكرارات.
 */
export function normalizeCargasStationName(rawName: string): string {
  if (!rawName) return 'كارجاس رئيسية';

  let text = rawName.trim();

  // 1. فحص واستخراج الشركة الشريكة إن وُجدت
  let detectedPartner: string | null = null;
  for (const partner of PARTNER_COMPANIES) {
    if (partner.pattern.test(text)) {
      detectedPartner = partner.canonical;
      // إزالة اسم الشركة الشريكة من النص مؤقتاً لتنقية اسم المنطقة/الموقع
      text = text.replace(partner.pattern, ' ');
      break;
    }
  }

  // 2. إزالة كافة تكرارات كلمة "كارجاس" بجميع صورها من أي مكان في النص
  text = text
    .replace(/(?:كارجاس|cargas|كار\s*جاس)/gi, ' ')
    .replace(/^(?:محطة|محطه|فرع|مركز|منفذ|خدمة)\s+/gi, ' ')
    .replace(/\s+(?:محطة|محطه|فرع)\s+/gi, ' ')
    .trim();

  // 3. إزالة الأقواس وما بداخلها إن كانت أرقاماً مثل (1) أو (2) أو (#1)
  text = text.replace(/\s*\([0-9٠-٩#]+\)\s*/g, ' ');

  // 4. إزالة الأرقام والزوائد من نهاية الاسم (مثل: 1، 2، 3، ١، ٢، ٣، #1، فرع 1، محطة 1، و2)
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text
      .replace(/\s*[-–_/#]*\s*(?:[0-9٠-٩]\s*(?:و|&)\s*[0-9٠-٩])\s*$/gi, '')
      .replace(/\s*[-–_/#]*\s*(?:فرع|رقم|مرحلة|محطة|نقطة)\s*[0-9٠-٩]+\s*$/gi, '')
      .replace(/\s*[-–_/#]*\s*[0-9٠-٩]+\s*$/gi, '')
      .replace(/\s*[-–_/#]+\s*[أ-يa-zA-Z]\s*$/gi, '')
      .replace(/\s*[-–_/#():]+$/g, '')
      .trim();
  }

  // 5. تصحيح الأخطاء الإملائية وتنقية الفواصل
  text = text
    .replace(/الاتعاون/g, '')
    .replace(/^[-–_/#\s]+|[-–_/#\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // توحيد همزة ألماظة
  if (text === 'الماظة' || text === 'ألماظه' || text === 'الماظه') {
    text = 'ألماظة';
  }

  // إذا لم يتبق اسم للموقع بعد التنظيف
  if (!text) {
    text = 'الرئيسية';
  }

  // 6. بناء الاسم النهائي الموحد:
  // "كارجاس" في البداية حصرياً، تليها المنطقة/الموقع، وفي النهاية فقط تظهر الشركة الشريكة
  if (detectedPartner) {
    return `كارجاس ${text} - ${detectedPartner}`;
  }

  return `كارجاس ${text}`;
}

/**
 * تطبيق قاعدة كارجاس الكاملة على شبكة المحطات:
 * 1. جعل كافة المحطات تبدأ كاسم بـ "كارجاس ".
 * 2. إلغاء المحطات المرقمة مثل مصدق 1 ومصدق 2 واستبدالها بواحدة "كارجاس مصدق".
 * 3. إلغاء ألماظة 1 و 2 و 3 واستبدالها بواحدة "كارجاس ألماظة".
 * 4. جميع المحطات تكون تموين غاز وزيوت (cngRefuel: true, bpOilCenter: true).
 * 5. تعيين الشركة المشغلة: كارجاس - Cargas.
 */
export function applyCargasNetworkRules(stations: Station[]): Station[] {
  if (!stations || stations.length === 0) return [];

  // تجميع المحطات بحسب الاسم الموحد والمحافظة لدمج التكرارات (مثل مصدق 1 و 2، ألماظة 1 و 2 و 3)
  const groupedMap = new Map<string, Station[]>();

  for (const st of stations) {
    const normalizedName = normalizeCargasStationName(st.name);
    // المفتاح هو الاسم الموحد + المحافظة لتجنب دمج محطتين في محافظتين مختلفتين بنفس الاسم
    const key = `${normalizedName}___${st.governorate || 'عام'}`;

    if (!groupedMap.has(key)) {
      groupedMap.set(key, []);
    }
    groupedMap.get(key)!.push(st);
  }

  const result: Station[] = [];

  for (const [key, group] of groupedMap.entries()) {
    const normalizedName = key.split('___')[0];
    const primary = group[0]; // المحطة الأساسية

    // دمج الخدمات: تموين فقط وعدم وجود زيوت في المحطات
    const mergedServices = {
      cngRefuel: true,        // جميع المحطات تموين فقط
      bpOilCenter: false,     // عدم وجود زيوت في المحطات (التموين فقط بناء على طلب المستخدم)
      conversionMaintenance: group.some((s) => s.services?.conversionMaintenance),
      cylinderTesting: group.some((s) => s.services?.cylinderTesting),
      carWash: group.some((s) => s.services?.carWash),
      convenienceStore: group.some((s) => s.services?.convenienceStore),
      evCharging: group.some((s) => s.services?.evCharging),
      cafe: group.some((s) => s.services?.cafe),
    };

    // دمج العناوين والملاحظات بشكل نظيف
    const address = group.find((s) => s.address && s.address.length > 5)?.address || primary.address;
    const phone = group.find((s) => s.phone)?.phone || primary.phone;
    const notes = group.find((s) => s.notes)?.notes || primary.notes;

    // استخدام أفضل إحداثيات صالحة
    const validLoc = group.find((s) => s.lat !== 0 && s.lng !== 0) || primary;

    result.push({
      id: primary.id,
      name: normalizedName,
      company: 'كارجاس - Cargas',
      lat: validLoc.lat,
      lng: validLoc.lng,
      address: address || `محطة ${normalizedName}`,
      governorate: primary.governorate || 'القاهرة',
      city: primary.city || '',
      services: mergedServices,
      phone,
      workingHours: primary.workingHours || '24 ساعة',
      status: 'active',
      pressure: primary.pressure || '220 بار',
      notes,
      rating: primary.rating || 4.8,
      logoUrl: primary.logoUrl,
      updatedAt: new Date().toISOString(),
    });
  }

  return result;
}
