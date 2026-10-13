import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { Station, StationServices } from '../types/station';
import { calculateHaversineDistance } from './geo';
import { normalizeCargasStationName } from './cargasRules';

// تهيئة worker الخرائط ومستندات PDF بأمان
if (typeof window !== 'undefined') {
  try {
    GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.4.299/build/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF worker init warning:', err);
  }
}

/**
 * تنقية وتوحيد النصوص العربية وإزالة التطويل (الكشيدة) والتشكيل وعلامات الترقيم
 */
export function normalizeArabicString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\u0640/g, '') // إزالة التطويل (ـ) مثل: المركـــــز -> المركز
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل والتنوين
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export type CenterCategory =
  | 'conversionMaintenance'
  | 'bpOilCenter'
  | 'canopyOilSales'
  | 'cylinderTesting'
  | 'auto';

export interface ExtractedCenter {
  id: string;
  name: string;
  address: string;
  governorate: string;
  city?: string;
  lat: number;
  lng: number;
  hasExactCoordinates: boolean;
  category: 'conversionMaintenance' | 'bpOilCenter' | 'canopyOilSales' | 'cylinderTesting';
  isUpcoming?: boolean; // خاص بمراكز الفحص: تحت التشغيل (قريباً)
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
  // قراءة البيانات كمصفوفة صفوف للتعرف على صف العناوين بدقة
  const rawMatrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

  if (rawMatrix.length === 0) return [];

  const tokensList: string[][] = rawMatrix.map((row) =>
    Array.isArray(row) ? row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : '')) : []
  );

  const structuredRows = parseTableRowsFromTokens(tokensList);
  return processRawCenterRows(structuredRows, selectedCategory, existingStations);
}

/**
 * تحليل ملف PDF (.pdf) واستخراج جداول ونصوص المراكز والمحطات بدقة
 */
export async function parsePdfDocument(
  dataBuffer: ArrayBuffer,
  selectedCategory: CenterCategory,
  existingStations: Station[]
): Promise<ExtractedCenter[]> {
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(dataBuffer),
      useWorkerFetch: false,
    });
    const pdfDoc = await loadingTask.promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      // تجميع العناصر النصية حسب الإحداثي الرأسي y لتشكيل أسطر وجداول منظمة
      const lineMap = new Map<number, { x: number; text: string }[]>();
      for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        let matchedY = Array.from(lineMap.keys()).find((k) => Math.abs(k - y) <= 4);
        if (matchedY === undefined) {
          matchedY = y;
          lineMap.set(matchedY, []);
        }
        lineMap.get(matchedY)!.push({ x: item.transform[4], text: item.str });
      }

      // فرز الأسطر رأسياً من الأعلى للأسفل
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      for (const y of sortedYs) {
        const lineItems = lineMap.get(y)!;
        lineItems.sort((a, b) => b.x - a.x);
        const lineText = lineItems.map((it) => it.text.trim()).join('\t');
        if (lineText.trim().length > 3) {
          allLines.push(lineText);
        }
      }
    }

    if (allLines.length > 0) {
      return parsePdfOrTextContent(allLines.join('\n'), selectedCategory, existingStations);
    }
  } catch (pdfErr) {
    console.warn('PDF.js structured parsing warning, attempting fallback text extraction...', pdfErr);
  }

  // خط الإنقاذ: استخراج النصوص الصالحة مباشرة من بايتات الملف
  try {
    const uint8 = new Uint8Array(dataBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawStr = decoder.decode(uint8);
    const matches = rawStr.match(/[\u0600-\u06FF\w\s.,;:/\-()]{5,}/g) || [];
    const arabicLines = matches.filter((m) => /[\u0600-\u06FF]/.test(m));
    if (arabicLines.length > 0) {
      return parsePdfOrTextContent(arabicLines.join('\n'), selectedCategory, existingStations);
    }
  } catch (fallbackErr) {
    console.error('PDF fallback failed:', fallbackErr);
  }

  throw new Error('تعذر قراءة ملف PDF. تأكد من احتواء الملف على نصوص أو استخدم صندوق اللصق المباشر.');
}

/**
 * استخراج وقراءة مراكز الفحص والتحويل والزيوت من مستندات Word (.docx و .doc)
 */
export async function parseWordDocument(
  dataBuffer: ArrayBuffer,
  selectedCategory: CenterCategory,
  existingStations: Station[]
): Promise<ExtractedCenter[]> {
  try {
    const zip = await JSZip.loadAsync(dataBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const xmlText = await docXmlFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

      const tokensList: string[][] = [];

      // أ. فحص الجداول داخل مستند الوورد (<w:tbl>)
      const tables = xmlDoc.getElementsByTagName('w:tbl');
      if (tables.length > 0) {
        for (let t = 0; t < tables.length; t++) {
          const rows = tables[t].getElementsByTagName('w:tr');
          for (let r = 0; r < rows.length; r++) {
            const cells = rows[r].getElementsByTagName('w:tc');
            const cellTexts: string[] = [];
            for (let c = 0; c < cells.length; c++) {
              const textNodes = cells[c].getElementsByTagName('w:t');
              let cellText = '';
              for (let n = 0; n < textNodes.length; n++) {
                cellText += textNodes[n].textContent || '';
              }
              cellTexts.push(cellText.trim());
            }
            if (cellTexts.some((c) => c.length > 0)) {
              tokensList.push(cellTexts);
            }
          }
        }
      }

      // ب. قراءة الفقرات (<w:p>) إذا لم تكن هناك جداول كافية
      if (tokensList.length === 0) {
        const paragraphs = xmlDoc.getElementsByTagName('w:p');
        for (let p = 0; p < paragraphs.length; p++) {
          const textNodes = paragraphs[p].getElementsByTagName('w:t');
          let pText = '';
          for (let n = 0; n < textNodes.length; n++) {
            pText += textNodes[n].textContent || '';
          }
          pText = pText.trim();
          if (pText.length > 5) {
            const parts = pText.includes('\t')
              ? pText.split('\t')
              : pText.includes(' - ')
              ? pText.split(' - ')
              : pText.includes(';')
              ? pText.split(';')
              : [pText];

            tokensList.push(parts.map((s) => s.trim()));
          }
        }
      }

      if (tokensList.length > 0) {
        const structuredRows = parseTableRowsFromTokens(tokensList);
        return processRawCenterRows(structuredRows, selectedCategory, existingStations);
      }
    }
  } catch (docxErr) {
    console.warn('DOCX zip read failed, attempting binary/text fallback extraction...', docxErr);
  }

  // 2. خط الإنقاذ: استخراج النصوص العربية والإنجليزية من بايتات المستند أو ملفات .doc القديمة
  try {
    const uint8 = new Uint8Array(dataBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawStr = decoder.decode(uint8);

    const matches = rawStr.match(/[\u0600-\u06FF\w\s.,;:/\-()]{6,}/g) || [];
    const lines = matches
      .map((m) => m.trim())
      .filter((m) => m.length > 8 && /[\u0600-\u06FF]/.test(m));

    if (lines.length > 0) {
      return parsePdfOrTextContent(lines.join('\n'), selectedCategory, existingStations);
    }
  } catch (fallbackErr) {
    console.error('Binary doc fallback failed:', fallbackErr);
  }

  throw new Error('تعذر قراءة محتوى مستند الوورد. يرجى التأكد من احتوائه على نصوص صالحة أو نسخه ولصقه في الصندوق.');
}

/**
 * تحليل صفوف الجداول المستخرجة من المستندات وفهم أعمدة المسلسل والمحافظة والمنطقة والمركز والعنوان
 */
function parseTableRowsFromTokens(rowsOfTokens: string[][]): Record<string, string>[] {
  const result: Record<string, string>[] = [];
  let lastKnownGov = 'القاهرة';

  let nameCol = -1;
  let govCol = -1;
  let addrCol = -1;
  let statusCol = -1;
  let phoneCol = -1;
  let startRow = 0;

  if (rowsOfTokens.length > 0) {
    const firstRowNorm = rowsOfTokens[0].map(normalizeArabicString);
    const hasHeaderKeywords = firstRowNorm.some((c) =>
      ['م', 'مسلسل', 'المحافظه', 'المحافظة', 'المنطقه', 'المنطقة', 'المركز', 'اسم المحطه', 'اسم المحطة', 'العنوان', 'النشاط', 'الحاله', 'الحالة'].includes(c)
    );

    if (hasHeaderKeywords) {
      startRow = 1;
      for (let i = 0; i < firstRowNorm.length; i++) {
        const h = firstRowNorm[i];
        if (['المحافظه', 'المحافظة', 'gov', 'governorate'].includes(h)) govCol = i;
        else if (['المركز', 'اسم المركز', 'المنطقه', 'المنطقة', 'المحطه', 'المحطة', 'اسم المحطه', 'اسم المحطة', 'اسم الموقع', 'name'].includes(h)) nameCol = i;
        else if (['العنوان', 'الموقع', 'address', 'site'].includes(h)) addrCol = i;
        else if (['النشاط', 'الحاله', 'الحالة', 'الملاحظات', 'notes', 'status'].includes(h)) statusCol = i;
        else if (['الهاتف', 'تليفون', 'phone', 'tel'].includes(h)) phoneCol = i;
      }
    }
  }

  const knownGovs = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'بورسعيد', 'دمياط', 'الإسماعيلية',
    'البحيرة', 'المنوفية', 'الشرقية', 'القليوبية', 'الدقهلية', 'الغربية',
    'بني سويف', 'المنيا', 'سوهاج', 'الفيوم', 'قنا', 'البحر الأحمر',
    'شمال سيناء', 'جنوب سيناء', 'السويس', 'أسوان', 'أسيوط', 'الأقصر',
    'كفر الشيخ', 'مطروح', 'الوادي الجديد', '6 أكتوبر', 'حلوان'
  ].map(normalizeArabicString);

  for (let r = startRow; r < rowsOfTokens.length; r++) {
    const tokens = rowsOfTokens[r];
    if (tokens.length === 0 || tokens.every((t) => !t.trim())) continue;

    let name = '';
    let address = '';
    let gov = '';
    let status = '';
    let phone = '';

    if (nameCol !== -1) {
      name = tokens[nameCol] || '';
      address = addrCol !== -1 ? tokens[addrCol] || '' : '';
      gov = govCol !== -1 ? tokens[govCol] || '' : '';
      status = statusCol !== -1 ? tokens[statusCol] || '' : '';
      phone = phoneCol !== -1 ? tokens[phoneCol] || '' : '';

      if (gov && gov.trim()) {
        lastKnownGov = gov.trim();
      } else {
        gov = lastKnownGov;
      }
    } else {
      let cleanTokens = [...tokens];
      if (cleanTokens.length > 1 && /^[0-9٠-٩]+$/.test(cleanTokens[0].trim())) {
        cleanTokens.shift();
      }

      if (cleanTokens.length === 1) {
        name = cleanTokens[0];
        address = cleanTokens[0];
      } else if (cleanTokens.length === 2) {
        name = cleanTokens[0];
        address = cleanTokens[1];
        status = cleanTokens[1];
      } else if (cleanTokens.length >= 3) {
        const firstTokenNorm = normalizeArabicString(cleanTokens[0]);
        const isFirstGov = knownGovs.includes(firstTokenNorm) || cleanTokens[0].trim() === '';

        if (isFirstGov) {
          if (cleanTokens[0].trim()) {
            gov = cleanTokens[0].trim();
            lastKnownGov = gov;
          } else {
            gov = lastKnownGov;
          }
          name = cleanTokens[1] || '';
          address = cleanTokens.slice(2).join(' – ');
          status = cleanTokens.slice(2).join(' ');
        } else {
          name = cleanTokens[0] || '';
          address = cleanTokens[1] || '';
          status = cleanTokens.slice(2).join(' ');
        }
      }
    }

    if (name.trim()) {
      result.push({
        name: name.trim(),
        address: address.trim() || name.trim(),
        gov: gov.trim() || lastKnownGov,
        status: status.trim() || `${name} ${address}`,
        phone: phone.trim(),
      });
    }
  }

  return result;
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
    .filter((l) => l.length > 3);

  const tokensList: string[][] = [];

  for (const line of lines) {
    const parts = line.includes('\t')
      ? line.split('\t')
      : line.includes(';')
      ? line.split(';')
      : line.includes(' – ')
      ? line.split(' – ')
      : line.includes(' - ')
      ? line.split(' - ')
      : line.includes(',')
      ? line.split(',')
      : line.split(/\s{2,}/);

    if (parts.length > 0 && parts.some((p) => p.trim().length > 0)) {
      tokensList.push(parts.map((p) => p.trim()));
    }
  }

  const structuredRows = parseTableRowsFromTokens(tokensList);
  return processRawCenterRows(structuredRows, selectedCategory, existingStations);
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

    // تحديد نوع المركز: تحويل / مركز زيوت BP / بيع زيوت أسفل المظلة / فحص
    let category: 'conversionMaintenance' | 'bpOilCenter' | 'canopyOilSales' | 'cylinderTesting' = 'conversionMaintenance';
    let isUpcoming = false;

    const fullText = `${name} ${address} ${findFieldValue(row, ['الحالة', 'النشاط', 'status', 'ملاحظات', 'notes']) || ''}`.toLowerCase();

    // فحص ما إذا كان فحص الأسطوانات تحت التشغيل (قريباً)
    if (fullText.includes('تحت التشغيل') || fullText.includes('قريباً') || fullText.includes('قريبا') || fullText.includes('مستقبلي') || fullText.includes('تجهيز') || fullText.includes('upcoming')) {
      isUpcoming = true;
    }

    if (selectedCategory === 'auto') {
      if (fullText.includes('فحص') || fullText.includes('أسطوان') || fullText.includes('اختبار') || fullText.includes('اسطوان')) {
        category = 'cylinderTesting';
      } else if (fullText.includes('مظلة') || fullText.includes('مظله') || fullText.includes('اسفل المظلة') || fullText.includes('أسفل المظلة') || fullText.includes('طلمبات') || fullText.includes('عبوات') || fullText.includes('منفذ بيع')) {
        category = 'canopyOilSales';
      } else if (fullText.includes('مركز زيت') || fullText.includes('مركز زيوت') || fullText.includes('تغيير زيت') || fullText.includes('خدمة زيوت') || fullText.includes('bp') || fullText.includes('كاسترول') || fullText.includes('castrol') || fullText.includes('زيوت')) {
        category = 'bpOilCenter';
      } else {
        category = 'conversionMaintenance';
      }
    } else {
      category = selectedCategory;
    }

    // التطابق الذكي مع محطات الخريطة (بالاسم والموقع الجغرافي والإحداثيات والمحافظة)
    const matchResult = findBestMatchingStationForCenter(
      name,
      address,
      governorate,
      lat,
      lng,
      existingStations
    );

    const matchedStation = matchResult.matchedStation;
    const matchedStationId = matchedStation ? matchedStation.id : undefined;
    const matchedStationName = matchedStation ? matchedStation.name : undefined;
    const matchedStationDistance = matchResult.distance;

    // إذا تم العثور على محطة مطابقة على الخريطة:
    // 1. تكون طريقة التسجيل الافتراضية دمج وإضافة النشاط للمحطة تلقائياً
    // 2. إذا لم تكن إحداثيات الملف دقيقة، يرث إحداثيات المحطة القائمة بالخريطة مباشرة
    if (matchedStation && !hasExactCoordinates) {
      lat = matchedStation.lat;
      lng = matchedStation.lng;
      hasExactCoordinates = true;
    }

    const actionType: 'standalone' | 'merge' = matchedStationId ? 'merge' : 'standalone';

    results.push({
      id: `center-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalizeCargasCenterName(name, category, isUpcoming),
      address: address || 'عنوان المركز المسجل',
      governorate: governorate || (matchedStation ? matchedStation.governorate : 'القاهرة'),
      city: city || (matchedStation ? matchedStation.city : undefined),
      lat,
      lng,
      hasExactCoordinates,
      category,
      isUpcoming,
      phone: phone || (matchedStation ? matchedStation.phone : undefined),
      workingHours,
      status: hasExactCoordinates ? 'ready' : 'geocoded',
      actionType,
      matchedStationId,
      matchedStationName,
      matchedStationDistance,
    });
  }

  return results;
}

/**
 * دالة المطابقة الذكية بين المركز المرفوع ومحطات الخريطة الحالية
 * تعتمد على: الكلمات المفتاحية للاسم والموقع + العنوان + المحافظة + المسافة الجغرافية
 */
function findBestMatchingStationForCenter(
  centerName: string,
  centerAddress: string,
  centerGov: string,
  centerLat: number,
  centerLng: number,
  existingStations: Station[]
): {
  matchedStation: Station | null;
  distance?: number;
  matchReason?: string;
} {
  if (!existingStations || existingStations.length === 0) {
    return { matchedStation: null };
  }

  const normalizeForMatch = (t: string) =>
    (t || '')
      .replace(/[()\-–_/#:0-9٠-٩]/g, ' ')
      .replace(/أ|إ|آ/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/(?:محطة|محطه|مركز|منفذ|خدمة|كارجاس|cargas|كار\s*جاس|فرع|شارع|طريق|ميدان|منطقة|حي)/gi, ' ')
      .trim();

  const nameKeywords = normalizeForMatch(centerName)
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        !['فحص', 'تحويل', 'صيانة', 'اسطوان', 'اسطوانات', 'زيوت', 'زيت', 'مظلة', 'مظله', 'طلمبات', 'بترول', 'شركة', 'قريبا', 'التشغيل', 'الخدمة'].includes(w)
    );

  const addressKeywords = normalizeForMatch(centerAddress)
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        !['شارع', 'طريق', 'ميدان', 'بجوار', 'امام', 'خلف', 'تقاطع', 'الرئيسي'].includes(w)
    );

  const allCenterKeywords = Array.from(new Set([...nameKeywords, ...addressKeywords]));

  let bestStation: Station | null = null;
  let bestScore = 0;
  let bestDist: number | undefined = undefined;
  let bestReason = '';

  for (const st of existingStations) {
    let score = 0;
    const stNormName = normalizeForMatch(st.name);
    const stNormAddr = normalizeForMatch(st.address || '');

    // أ) تطابق الكلمات المفتاحية للاسم والموقع
    let matchedKeywords = 0;
    for (const kw of allCenterKeywords) {
      if (stNormName.includes(kw)) {
        matchedKeywords++;
        score += 65;
      } else if (stNormAddr.includes(kw)) {
        matchedKeywords++;
        score += 40;
      }
    }

    // ب) تطابق المحافظة
    const centerGovClean = (centerGov || '').replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').trim();
    const stGovClean = (st.governorate || '').replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه').trim();
    if (centerGovClean && stGovClean && (centerGovClean.includes(stGovClean) || stGovClean.includes(centerGovClean))) {
      score += 25;
    }

    // ج) القرب الجغرافي (إن وُجدت إحداثيات صالحة)
    let dist: number | undefined = undefined;
    if (centerLat !== 0 && centerLng !== 0 && st.lat !== 0 && st.lng !== 0) {
      dist = calculateHaversineDistance(centerLat, centerLng, st.lat, st.lng);
      if (dist <= 0.8) {
        score += 100;
      } else if (dist <= 2.0) {
        score += 70;
      } else if (dist <= 4.0) {
        score += 45;
      } else if (dist <= 8.0) {
        score += 20;
      } else if (dist > 35.0) {
        score -= 50;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestStation = st;
      bestDist = dist;
      if (matchedKeywords > 0 && dist !== undefined && dist <= 3.0) {
        bestReason = `تطابق الاسم والموقع (${dist.toFixed(1)} كم)`;
      } else if (matchedKeywords > 0) {
        bestReason = `تطابق اسم المحطة والمنطقة`;
      } else if (dist !== undefined && dist <= 2.5) {
        bestReason = `قرب جغرافي مباشر (${dist.toFixed(1)} كم)`;
      } else {
        bestReason = `تطابق بالمنطقة والمحافظة`;
      }
    }
  }

  // إذا حقق درجة ثقة كافية
  if (bestScore >= 40 && bestStation) {
    return {
      matchedStation: bestStation,
      distance: bestDist,
      matchReason: bestReason,
    };
  }

  return { matchedStation: null };
}

/**
 * توحيد وبدء اسم المركز بـ "كارجاس" وفق القواعد المؤسسية مع تمييز "قريباً"
 */
function normalizeCargasCenterName(
  rawName: string,
  category: 'conversionMaintenance' | 'bpOilCenter' | 'canopyOilSales' | 'cylinderTesting',
  isUpcoming?: boolean
): string {
  let name = rawName.trim();
  const categoryPrefix =
    category === 'cylinderTesting'
      ? (isUpcoming ? 'مركز فحص أسطوانات (قريباً) كارجاس' : 'مركز فحص أسطوانات كارجاس')
      : category === 'canopyOilSales'
      ? 'منفذ بيع زيوت أسفل المظلة كارجاس'
      : category === 'bpOilCenter'
      ? 'مركز زيوت BP كارجاس'
      : 'مركز تحويل وصيانة كارجاس';

  if (!name.includes('كارجاس')) {
    name = `${categoryPrefix} - ${name}`;
  } else if (!name.startsWith('كارجاس') && !name.startsWith('مركز') && !name.startsWith('منفذ')) {
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
      // 1. الدمج التلقائي ضمن نطاق محطة قائمة بالخريطة وتفعيل الخدمة والنشاط عليها
      const target = stationsMap.get(center.matchedStationId)!;
      // ضمان وجود التموين الأساسي
      target.services.cngRefuel = true;

      if (center.category === 'cylinderTesting') {
        target.services.cylinderTesting = true;
        // التفرقة بين فحص فعلي وفحص قريباً (تحت التشغيل)
        target.services.cylinderTestingUpcoming = center.isUpcoming === true;
      } else if (center.category === 'canopyOilSales') {
        target.services.canopyOilSales = true;
      } else if (center.category === 'bpOilCenter') {
        target.services.bpOilCenter = true;
      } else if (center.category === 'conversionMaintenance') {
        target.services.conversionMaintenance = true;
      }

      if (center.phone && (!target.phone || target.phone === '19617')) {
        target.phone = center.phone;
      }
      if (center.workingHours) {
        target.notes = `${target.notes || ''} [مواعيد ${center.name}: ${center.workingHours}]`.trim();
      }
      target.updatedAt = new Date().toISOString();
      mergedCount++;
    } else {
      // 2. تسجيل كمركز جديد على الخريطة بكامل أنشطته مع التموين
      const services: StationServices = {
        cngRefuel: true, // تفعيل التموين الافتراضي لشبكة كارجاس
        conversionMaintenance: center.category === 'conversionMaintenance',
        bpOilCenter: center.category === 'bpOilCenter',
        canopyOilSales: center.category === 'canopyOilSales',
        cylinderTesting: center.category === 'cylinderTesting',
        cylinderTestingUpcoming: center.category === 'cylinderTesting' && center.isUpcoming === true,
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
        notes: center.workingHours ? `مواعيد العمل: ${center.workingHours}` : undefined,
        rating: 4.8,
        updatedAt: new Date().toISOString(),
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
