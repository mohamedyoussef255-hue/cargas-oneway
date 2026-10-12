import { Station } from '../types/station';

/**
 * تنقية اسم المحطة وإزالة الأرقام (1، 2، 3، إلخ) وتوحيد البداية بـ "كارجاس "
 * أمثلة:
 * - "مصدق 1" أو "مصدق 2" -> "كارجاس مصدق"
 * - "الماظة 1" أو "ألماظة 2" أو "الماظة 3" -> "كارجاس ألماظة"
 * - "الاستاد الاتعاون 1" أو "الاستاد التعاون" -> "كارجاس الاستاد التعاون"
 * - "عز الدين موبيل" -> "كارجاس عز الدين موبيل"
 */
export function normalizeCargasStationName(rawName: string): string {
  if (!rawName) return 'كارجاس رئيسية';

  let cleaned = rawName.trim();

  // 1. إزالة الأقواس وما بداخلها إن كانت أرقاماً مثل (1) أو (2) أو (#1)
  cleaned = cleaned.replace(/\s*\([0-9٠-٩#]+\)\s*/g, ' ');

  // 2. إزالة البوادئ المتكررة لأسماء الشركات أو كلمة "محطة"
  cleaned = cleaned
    .replace(/^(?:محطة|محطه)\s+/gi, '')
    .replace(/^(?:كارجاس|cargas|كار جاس|غازتك|gastec|ماستر غاز|طاقة)\s*[-–/:]*\s*/gi, '')
    .replace(/^(?:محطة|محطه)\s+/gi, '')
    .trim();

  // 3. إزالة الأرقام والزوائد من نهاية الاسم (مثل: 1، 2، 3، ١، ٢، ٣، #1، فرع 1، محطة 1، و2)
  // تكرار الحذف للتأكد من إزالة أي ترقيم مركب
  let prevCleaned = '';
  while (prevCleaned !== cleaned) {
    prevCleaned = cleaned;
    cleaned = cleaned
      // إزالة أنماط مثل "1 و 2" أو "1 و2" أو "1 & 2"
      .replace(/\s*[-–_/#]*\s*(?:[0-9٠-٩]\s*(?:و|&)\s*[0-9٠-٩])\s*$/gi, '')
      // إزالة "فرع 1" أو "رقم 1" أو "مرحلة 1"
      .replace(/\s*[-–_/#]*\s*(?:فرع|رقم|مرحلة|محطة|نقطة)\s*[0-9٠-٩]+\s*$/gi, '')
      // إزالة الأرقام المفردة العربية والإنجليزية في نهاية السلسلة: 1, 2, 3... ١, ٢, ٣...
      .replace(/\s*[-–_/#]*\s*[0-9٠-٩]+\s*$/gi, '')
      // إزالة الحروف الترقيمية المنفردة مثل: - أ، - ب، - A، - B
      .replace(/\s*[-–_/#]+\s*[أ-يa-zA-Z]\s*$/gi, '')
      // إزالة الشرطات والأقواس العالقة في النهاية
      .replace(/\s*[-–_/#():]+$/g, '')
      .trim();
  }

  // تصحيح الأخطاء الإملائية الشائعة مثل "الاتعاون" -> "التعاون"
  cleaned = cleaned
    .replace(/الاتعاون/g, 'التعاون')
    .replace(/^التعاون\s*-\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // توحيد همزة ألماظة
  if (cleaned === 'الماظة' || cleaned === 'ألماظه' || cleaned === 'الماظه') {
    cleaned = 'ألماظة';
  }

  // إذا أصبح الاسم فارغاً بعد التنظيف
  if (!cleaned) {
    cleaned = 'رئيسية';
  }

  // إرجاع الاسم موحداً دائماً يبدأ بـ "كارجاس "
  return `كارجاس ${cleaned}`;
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

    // دمج الخدمات من كافة المحطات المكررة، مع التأكيد الصارم على: جميع المحطات تموين غاز وزيوت
    const mergedServices = {
      cngRefuel: true,       // جميع المحطات تموين غاز
      bpOilCenter: true,     // جميع المحطات زيوت
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
