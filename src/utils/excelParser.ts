import * as XLSX from 'xlsx';
import { Station, StationServices } from '../types/station';
import { calculateHaversineDistance } from './geo';
import { normalizeCargasStationName } from './cargasRules';

export type CenterCategory = 'conversionMaintenance' | 'bpOilCenter' | 'cylinderTesting' | 'auto';

export interface ExtractedCenter {
  id: string;
  name: string;
  address: string;
  governorate: string;
  city?: string;
  lat: number;
  lng: number;
  hasExactCoordinates: boolean;
  category: 'conversionMaintenance' | 'bpOilCenter' | 'cylinderTesting';
  phone?: string;
  workingHours?: string;
  notes?: string;
  status: 'ready' | 'geocoded' | 'approximate';
  // خيار التسجيل: إما كمركز منفصل أو ضمن محطة قائمة قريبة
  actionType: 'standalone' | 'merge';
  matchedStationId?: string;
  matchedStationName?: string;
  matchedStationDistance?: number;
}

// قاعدة بيانات إحداثيات المدن والمناطق المصرية الذكية للوصول للموقع فورياً
const EGYPT_GEO_DATABASE: Record<string, { lat: number; lng: number; gov: string }> = {
  // القاهرة والجيزة
  'مصر الجديدة': { lat: 30.0901, lng: 31.3225, gov: 'القاهرة' },
  'ألماظة': { lat: 30.0886, lng: 31.3582, gov: 'القاهرة' },
  'مدينة نصر': { lat: 30.0561, lng: 31.3653, gov: 'القاهرة' },
  'الاستاد': { lat: 30.0712, lng: 31.3156, gov: 'القاهرة' },
  'يوسف عباس': { lat: 30.0712, lng: 31.3156, gov: 'القاهرة' },
  'المعادي': { lat: 29.9602, lng: 31.2568, gov: 'القاهرة' },
  'حلوان': { lat: 29.8414, lng: 31.3009, gov: 'القاهرة' },
  'شبرا': { lat: 30.1065, lng: 31.2464, gov: 'القاهرة' },
  'الزيتون': { lat: 30.1089, lng: 31.3121, gov: 'القاهرة' },
  'عين شمس': { lat: 30.1287, lng: 31.3392, gov: 'القاهرة' },
  'العباسية': { lat: 30.0634, lng: 31.2825, gov: 'القاهرة' },
  'التجمع': { lat: 30.0074, lng: 31.4289, gov: 'القاهرة' },
  'القاهرة الجديدة': { lat: 30.0074, lng: 31.4289, gov: 'القاهرة' },
  'الشروق': { lat: 30.1444, lng: 31.6314, gov: 'القاهرة' },
  'بدر': { lat: 30.1384, lng: 31.7431, gov: 'القاهرة' },
  'الدقي': { lat: 30.0384, lng: 31.2124, gov: 'الجيزة' },
  'مصدق': { lat: 30.0401, lng: 31.2034, gov: 'الجيزة' },
  'المهندسين': { lat: 30.0534, lng: 31.2012, gov: 'الجيزة' },
  'العجوزة': { lat: 30.0556, lng: 31.2155, gov: 'الجيزة' },
  'الهرم': { lat: 29.9974, lng: 31.1565, gov: 'الجيزة' },
  'فيصل': { lat: 30.0051, lng: 31.1712, gov: 'الجيزة' },
  '6 أكتوبر': { lat: 29.9723, lng: 30.9448, gov: 'الجيزة' },
  'أكتوبر': { lat: 29.9723, lng: 30.9448, gov: 'الجيزة' },
  'الشيخ زايد': { lat: 30.0489, lng: 30.9789, gov: 'الجيزة' },
  'الحوامدية': { lat: 29.8974, lng: 31.2612, gov: 'الجيزة' },
  'أبو النمرس': { lat: 29.9214, lng: 31.2341, gov: 'الجيزة' },

  // الإسكندرية
  'رشدي': { lat: 31.2291, lng: 29.9534, gov: 'الإسكندرية' },
  'سموحة': { lat: 31.2156, lng: 29.9512, gov: 'الإسكندرية' },
  'سيدي جابر': { lat: 31.2198, lng: 29.9412, gov: 'الإسكندرية' },
  'محرم بك': { lat: 31.1923, lng: 29.9145, gov: 'الإسكندرية' },
  'المنشية': { lat: 31.2001, lng: 29.8945, gov: 'الإسكندرية' },
  'ميامي': { lat: 31.2645, lng: 30.0012, gov: 'الإسكندرية' },
  'العجمي': { lat: 31.1045, lng: 29.7612, gov: 'الإسكندرية' },
  'العامرية': { lat: 31.0214, lng: 29.7945, gov: 'الإسكندرية' },
  'برج العرب': { lat: 30.9245, lng: 29.6214, gov: 'الإسكندرية' },

  // محافظات الدلتا والقناة
  'طنطا': { lat: 30.7865, lng: 31.0004, gov: 'الغربية' },
  'المحلة': { lat: 30.9698, lng: 31.1645, gov: 'الغربية' },
  'المنصورة': { lat: 31.0409, lng: 31.3785, gov: 'الدقهلية' },
  'ميت غمر': { lat: 30.7189, lng: 31.2589, gov: 'الدقهلية' },
  'الزقازيق': { lat: 30.5877, lng: 31.5022, gov: 'الشرقية' },
  'العاشر من رمضان': { lat: 30.3012, lng: 31.7412, gov: 'الشرقية' },
  'بنها': { lat: 30.4660, lng: 31.1853, gov: 'القليوبية' },
  'شبرا الخيمة': { lat: 30.1286, lng: 31.2422, gov: 'القليوبية' },
  'قليوب': { lat: 30.1789, lng: 31.2045, gov: 'القليوبية' },
  'دمياط': { lat: 31.4175, lng: 31.8144, gov: 'دمياط' },
  'رأس البر': { lat: 31.5145, lng: 31.8214, gov: 'دمياط' },
  'كفر الشيخ': { lat: 31.1107, lng: 30.9388, gov: 'كفر الشيخ' },
  'دسوق': { lat: 31.1345, lng: 30.6489, gov: 'كفر الشيخ' },
  'دمنهور': { lat: 31.0409, lng: 30.4700, gov: 'البحيرة' },
  'كفر الدوار': { lat: 31.1345, lng: 30.1289, gov: 'البحيرة' },
  'شبين الكوم': { lat: 30.5526, lng: 31.0094, gov: 'المنوفية' },
  'قويسنا': { lat: 30.5145, lng: 31.1412, gov: 'المنوفية' },
  'السويس': { lat: 29.9668, lng: 32.5498, gov: 'السويس' },
  'بورسعيد': { lat: 31.2653, lng: 32.3019, gov: 'بورسعيد' },
  'بورفؤاد': { lat: 31.2412, lng: 32.3312, gov: 'بورسعيد' },
  'الإسماعيلية': { lat: 30.5965, lng: 32.2715, gov: 'الإسماعيلية' },

  // الصعيد والوجه القبلي
  'الفيوم': { lat: 29.3082, lng: 30.8428, gov: 'الفيوم' },
  'بني سويف': { lat: 29.0661, lng: 31.0994, gov: 'بني سويف' },
  'المنيا': { lat: 28.0871, lng: 30.7618, gov: 'المنيا' },
  'ملوي': { lat: 27.7312, lng: 30.8412, gov: 'المنيا' },
  'أسيوط': { lat: 27.1783, lng: 31.1859, gov: 'أسيوط' },
  'سوهاج': { lat: 26.5569, lng: 31.6948, gov: 'سوهاج' },
  'طهطا': { lat: 26.7689, lng: 31.5012, gov: 'سوهاج' },
  'قنا': { lat: 26.1551, lng: 32.7160, gov: 'قنا' },
  'نجع حمادي': { lat: 26.0489, lng: 32.2412, gov: 'قنا' },
  'الأقصر': { lat: 25.6872, lng: 32.6396, gov: 'الأقصر' },
  'أسوان': { lat: 24.0889, lng: 32.8998, gov: 'أسوان' },
  'كوم أمبو': { lat: 24.4645, lng: 32.9412, gov: 'أسوان' },
  'الغردقة': { lat: 27.2579, lng: 33.8116, gov: 'البحر الأحمر' },
  'شرم الشيخ': { lat: 27.9158, lng: 34.3299, gov: 'جنوب سيناء' },
};

/**
 * دالة ذكية للبحث عن الإحداثيات من العنوان أو اسم المدينة داخل مصر
 */
export function geocodeEgyptianAddress(
  address: string,
  govHint?: string,
  cityName?: string
): { lat: number; lng: number; gov: string; isApproximate: boolean } {
  const fullText = `${address || ''} ${cityName || ''} ${govHint || ''}`.toLowerCase();

  // 1. مطابقة دقيقة مع قاعدة البيانات
  for (const [key, coords] of Object.entries(EGYPT_GEO_DATABASE)) {
    if (fullText.includes(key.toLowerCase())) {
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.003, // إزاحة طفيفة لعدم تطابق النقاط
        lng: coords.lng + (Math.random() - 0.5) * 0.003,
        gov: coords.gov,
        isApproximate: true,
      };
    }
  }

  // 2. إذا وُجدت محافظة معروفة
  const gov = govHint || 'القاهرة';
  const defaultGovCoords: Record<string, [number, number]> = {
    'القاهرة': [30.0444, 31.2357],
    'الجيزة': [30.0131, 31.2089],
    'الإسكندرية': [31.2001, 29.9187],
    'الغربية': [30.7865, 31.0004],
    'الدقهلية': [31.0409, 31.3785],
    'الشرقية': [30.5877, 31.5022],
    'القليوبية': [30.4660, 31.1853],
    'أسيوط': [27.1783, 31.1859],
    'سوهاج': [26.5569, 31.6948],
    'قنا': [26.1551, 32.7160],
    'السويس': [29.9668, 32.5498],
    'بورسعيد': [31.2653, 32.3019],
    'الإسماعيلية': [30.5965, 32.2715],
  };

  const center = defaultGovCoords[gov] || [30.0444, 31.2357];
  return {
    lat: center[0] + (Math.random() - 0.5) * 0.02,
    lng: center[1] + (Math.random() - 0.5) * 0.02,
    gov,
    isApproximate: true,
  };
}

/**
 * استخراج الإحداثيات من رابط خرائط Google Maps إن وُجد
 */
export function extractCoordsFromUrl(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  // مثلاً @30.0444,31.2357 أو q=30.0444,31.2357 أو ll=30.0444,31.2357
  const regex = /[@?&](?:q=|ll=|loc:|center=)?([0-9]{2}\.[0-9]+)[,\s]+([0-9]{2}\.[0-9]+)/i;
  const match = text.match(regex);
  if (match && match[1] && match[2]) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (lat >= 21.0 && lat <= 32.5 && lng >= 24.5 && lng <= 37.5) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * تحليل ملف إكسيل Excel (.xlsx, .xls, .csv) واستخراج المراكز وعناوينها
 */
export function parseExcelSheet(
  dataBuffer: ArrayBuffer,
  selectedCategory: CenterCategory,
  existingStations: Station[]
): ExtractedCenter[] {
  const workbook = XLSX.read(dataBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  return processRawCenterRows(jsonData, selectedCategory, existingStations);
}

/**
 * استخراج مراكز من نصوص ملف PDF أو جداول منسوخة
 */
export function parsePdfOrTextContent(
  text: string,
  selectedCategory: CenterCategory,
  existingStations: Station[]
): ExtractedCenter[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const rawRows: Record<string, string>[] = [];

  for (const line of lines) {
    // محاولة تقسيم بالـ Tab أو الفاصلة أو الشرطة
    const parts = line.includes('\t')
      ? line.split('\t')
      : line.includes(';')
      ? line.split(';')
      : line.includes(',')
      ? line.split(',')
      : line.split(' - ');

    if (parts.length >= 2) {
      rawRows.push({
        name: parts[0]?.trim() || '',
        address: parts[1]?.trim() || '',
        gov: parts[2]?.trim() || '',
        phone: parts[3]?.trim() || '',
      });
    } else {
      rawRows.push({
        name: line,
        address: line,
      });
    }
  }

  return processRawCenterRows(rawRows, selectedCategory, existingStations);
}

/**
 * معالجة صفوف البيانات الخام وتحويلها لمراكز ذكية مع اكتشاف أقرب محطة
 */
function processRawCenterRows(
  rows: Record<string, any>[],
  selectedCategory: CenterCategory,
  existingStations: Station[]
): ExtractedCenter[] {
  const results: ExtractedCenter[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // البحث عن الحقول الذكية بأسمائها العربية والإنجليزية
    const name = (
      findFieldValue(row, ['اسم المركز', 'المركز', 'اسم المحطة', 'المحطة', 'الاسم', 'name', 'center', 'station', 'title']) ||
      `مركز كارجاس #${i + 1}`
    ).toString().trim();

    const address = (
      findFieldValue(row, ['العنوان', 'العنوان بالتفصيل', 'الموقع', 'address', 'street', 'location', 'site']) ||
      name
    ).toString().trim();

    const governorate = (
      findFieldValue(row, ['المحافظة', 'المحافظه', 'governorate', 'gov']) || ''
    ).toString().trim();

    const city = (
      findFieldValue(row, ['المدينة', 'المنطقة', 'الحي', 'city', 'district', 'area']) || ''
    ).toString().trim();

    const phone = (
      findFieldValue(row, ['الهاتف', 'تليفون', 'الموبايل', 'phone', 'tel', 'mobile']) || ''
    ).toString().trim();

    const workingHours = (
      findFieldValue(row, ['ساعات العمل', 'المواعيد', 'hours', 'working_hours', 'time']) || '08:00 ص - 04:00 م'
    ).toString().trim();

    // فحص إحداثيات خط العرض وخط الطول إن وُجدت في الشيت
    let latVal = findFieldValue(row, ['خط العرض', 'عرض', 'lat', 'latitude', 'y', 'lat_deg']);
    let lngVal = findFieldValue(row, ['خط الطول', 'طول', 'lng', 'lon', 'longitude', 'x', 'lng_deg']);

    let lat = typeof latVal === 'number' ? latVal : parseFloat(latVal);
    let lng = typeof lngVal === 'number' ? lngVal : parseFloat(lngVal);
    let hasExactCoordinates = false;

    // فحص رابط الخريطة
    const mapUrlVal = findFieldValue(row, ['رابط الخريطة', 'رابط اللوكيشن', 'خريطة', 'map', 'maps', 'url', 'link']);
    if (mapUrlVal) {
      const urlCoords = extractCoordsFromUrl(mapUrlVal.toString());
      if (urlCoords) {
        lat = urlCoords.lat;
        lng = urlCoords.lng;
        hasExactCoordinates = true;
      }
    }

    // التحقق من صحة الإحداثيات داخل مصر
    if (!isNaN(lat) && !isNaN(lng) && lat >= 21.0 && lat <= 32.5 && lng >= 24.5 && lng <= 37.5) {
      hasExactCoordinates = true;
    } else {
      // الوصول للموقع جغرافياً عبر قاعدة بيانات المدن والمناطق المصرية
      const geocoded = geocodeEgyptianAddress(address, governorate, city);
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    // تحديد نوع المركز: تحويل / زيوت / فحص
    let category: 'conversionMaintenance' | 'bpOilCenter' | 'cylinderTesting' = 'conversionMaintenance';
    if (selectedCategory === 'auto') {
      const full = `${name} ${address}`.toLowerCase();
      if (full.includes('فحص') || full.includes('أسطوان') || full.includes('اختبار') || full.includes('اسطوان')) {
        category = 'cylinderTesting';
      } else if (full.includes('زيت') || full.includes('زيوت') || full.includes('bp') || full.includes('كاسترول') || full.includes('castrol')) {
        category = 'bpOilCenter';
      } else {
        category = 'conversionMaintenance';
      }
    } else {
      category = selectedCategory;
    }

    // فحص وجود محطة قريبة للتسجيل ضمن نطاقها أو كمركز منفصل
    let closestStation: Station | null = null;
    let minDistance = 9999;

    for (const st of existingStations) {
      const dist = calculateHaversineDistance(lat, lng, st.lat, st.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = st;
      }
    }

    // إذا كانت المسافة أقل من 1.5 كم، نقترح الربط بها مع خيار البقاء منفصلاً
    const matchedStationId = minDistance <= 2.0 && closestStation ? closestStation.id : undefined;
    const matchedStationName = minDistance <= 2.0 && closestStation ? closestStation.name : undefined;
    const matchedStationDistance = minDistance <= 2.0 && closestStation ? minDistance : undefined;

    results.push({
      id: `center-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalizeCargasCenterName(name, category),
      address: address || 'عنوان المركز المسجل',
      governorate: governorate || 'القاهرة',
      city: city || undefined,
      lat,
      lng,
      hasExactCoordinates,
      category,
      phone: phone || undefined,
      workingHours,
      status: hasExactCoordinates ? 'ready' : 'geocoded',
      actionType: matchedStationId ? 'merge' : 'standalone',
      matchedStationId,
      matchedStationName,
      matchedStationDistance,
    });
  }

  return results;
}

/**
 * توحيد وبدء اسم المركز بـ "كارجاس" وفق القواعد المؤسسية
 */
function normalizeCargasCenterName(
  rawName: string,
  category: 'conversionMaintenance' | 'bpOilCenter' | 'cylinderTesting'
): string {
  let name = rawName.trim();
  const categoryPrefix =
    category === 'cylinderTesting'
      ? 'مركز فحص أسطوانات كارجاس'
      : category === 'bpOilCenter'
      ? 'مركز زيوت BP كارجاس'
      : 'مركز تحويل وصيانة كارجاس';

  if (!name.includes('كارجاس')) {
    name = `${categoryPrefix} - ${name}`;
  } else if (!name.startsWith('كارجاس') && !name.startsWith('مركز')) {
    name = `كارجاس - ${name}`;
  }

  return normalizeCargasStationName(name);
}

function findFieldValue(row: Record<string, any>, candidates: string[]): any {
  const rowKeys = Object.keys(row);
  for (const c of candidates) {
    const foundKey = rowKeys.find(
      (k) => k.toLowerCase().trim() === c.toLowerCase().trim() || k.toLowerCase().includes(c.toLowerCase())
    );
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
      return row[foundKey];
    }
  }
  return undefined;
}

/**
 * تنفيذ استيراد المراكز:
 * إما كمركز منفصل تماماً، أو بدمجه ضمن نطاق المحطة القائمة وتفعيل خدمته عليها
 */
export function applyImportedCentersToStations(
  currentStations: Station[],
  importedCenters: ExtractedCenter[]
): { updatedStations: Station[]; mergedCount: number; newCount: number } {
  const stationsMap = new Map<string, Station>();
  for (const st of currentStations) {
    stationsMap.set(st.id, { ...st, services: { ...st.services } });
  }

  let mergedCount = 0;
  let newCount = 0;

  for (const center of importedCenters) {
    if (center.actionType === 'merge' && center.matchedStationId && stationsMap.has(center.matchedStationId)) {
      // 1. الدمج ضمن نطاق محطة قائمة وتفعيل الخدمة
      const target = stationsMap.get(center.matchedStationId)!;
      target.services[center.category] = true;
      if (center.phone && !target.phone) {
        target.phone = center.phone;
      }
      if (center.workingHours) {
        target.notes = `${target.notes || ''} [مواعيد ${center.name}: ${center.workingHours}]`.trim();
      }
      mergedCount++;
    } else {
      // 2. تسجيل كمركز منفصل تماماً
      const services: StationServices = {
        cngRefuel: true, // تفعيل التموين الافتراضي لشبكة كارجاس
        conversionMaintenance: center.category === 'conversionMaintenance',
        bpOilCenter: center.category === 'bpOilCenter',
        cylinderTesting: center.category === 'cylinderTesting',
        convenienceStore: true,
      };

      const newStation: Station = {
        id: center.id,
        name: center.name,
        company: 'كارجاس - Cargas',
        lat: center.lat,
        lng: center.lng,
        address: center.address,
        governorate: center.governorate,
        city: center.city,
        services,
        phone: center.phone || '19617',
        workingHours: center.workingHours || '24 ساعة',
        status: 'active',
        pressure: '220 بار',
        notes: `مركز معتمد تم تسجيله وتوثيق موقعه (${center.category === 'cylinderTesting' ? 'فحص أسطوانات' : center.category === 'bpOilCenter' ? 'زيوت BP' : 'تحويل وصيانة'})`,
        rating: 4.8,
      };

      stationsMap.set(newStation.id, newStation);
      newCount++;
    }
  }

  return {
    updatedStations: Array.from(stationsMap.values()),
    mergedCount,
    newCount,
  };
}

/**
 * إنشاء وتحميل قالب إكسيل استرشادي جاهز لمراكز التحويل والزيوت والفحص
 */
export function generateSampleExcelTemplate() {
  const sampleData = [
    {
      'اسم المركز': 'مركز كارجاس لتحويل السيارات - مصدق',
      'النشاط': 'تحويل وصيانة',
      'العنوان': 'شارع مصدق، الدقي، الجيزة',
      'المحافظة': 'الجيزة',
      'المدينة': 'الدقي',
      'الهاتف': '0237618990',
      'ساعات العمل': '08:00 ص - 04:00 م',
      'خط العرض': 30.0401,
      'خط الطول': 31.2034,
      'ملاحظات': 'المركز الرئيسي لتحويل وصيانة السيارات بالدقي',
    },
    {
      'اسم المركز': 'مركز كارجاس لفحص واختبار الأسطوانات - ألماظة',
      'النشاط': 'فحص أسطوانات',
      'العنوان': 'طريق المطار، بجوار مستشفى الجلاء، ألماظة',
      'المحافظة': 'القاهرة',
      'المدينة': 'مصر الجديدة',
      'الهاتف': '0224177211',
      'ساعات العمل': '08:00 ص - 04:00 م',
      'خط العرض': 30.0886,
      'خط الطول': 31.3582,
      'ملاحظات': 'فحص هيدروستاتيكي واختبار الصمامات معتمد',
    },
    {
      'اسم المركز': 'مركز زيوت BP كاسترول - الاستاد',
      'النشاط': 'زيوت BP',
      'العنوان': 'شارع يوسف عباس، بجوار ستاد القاهرة، مدينة نصر',
      'المحافظة': 'القاهرة',
      'المدينة': 'مدينة نصر',
      'الهاتف': '0222619044',
      'ساعات العمل': '24 ساعة',
      'خط العرض': 30.0712,
      'خط الطول': 31.3156,
      'ملاحظات': 'غيار زيوت BP كاسترول وفلاتر وصيانة سريعة',
    },
    {
      'اسم المركز': 'مركز كارجاس لتحويل وصيانة السيارات - رشدي',
      'النشاط': 'تحويل وصيانة',
      'العنوان': 'طريق الحرية (أبو قير)، محطة التعاون، رشدي',
      'المحافظة': 'الإسكندرية',
      'المدينة': 'رشدي',
      'الهاتف': '035442110',
      'ساعات العمل': '08:30 ص - 04:30 م',
      'خط العرض': 31.2291,
      'خط الطول': 29.9534,
      'ملاحظات': 'فرع الإسكندرية لخدمات تحويل أجهزة الغاز',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'مراكز كارجاس');
  XLSX.writeFile(wb, 'نموذج_استرشادي_مراكز_كارجاس.xlsx');
}
