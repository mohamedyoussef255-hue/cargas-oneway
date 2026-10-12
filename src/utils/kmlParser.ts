import JSZip from 'jszip';
import { Station, StationServices } from '../types/station';
import { applyCargasNetworkRules } from './cargasRules';

export interface ParseResult {
  success: boolean;
  stations: Station[];
  errors: string[];
  totalParsed: number;
}

/**
 * استخراج المحطات من ملف KML أو KMZ
 */
export async function parseKmlOrKmzFile(file: File): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  const errors: string[] = [];

  try {
    let kmlText = '';

    if (fileName.endsWith('.kmz')) {
      // فك ضغط ملف KMZ
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // البحث عن ملف kml داخل الأرشيف
      const kmlFiles = zipContent.file(/\.kml$/i);
      const kmlFile = kmlFiles.length > 0 ? kmlFiles[0] : zipContent.file('doc.kml');

      if (!kmlFile) {
        return {
          success: false,
          stations: [],
          errors: ['لم يتم العثور على أي ملف KML صالح داخل أرشيف KMZ'],
          totalParsed: 0,
        };
      }

      kmlText = await kmlFile.async('text');
    } else if (fileName.endsWith('.kml')) {
      // قراءة ملف KML المباشر
      kmlText = await file.text();
    } else {
      // محاولة القراءة كنص KML
      kmlText = await file.text();
    }

    return parseKmlContent(kmlText);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`فشل قراءة الملف: ${errorMsg}`);
    return {
      success: false,
      stations: [],
      errors,
      totalParsed: 0,
    };
  }
}

/**
 * تحليل نص KML واستخراج المواقع والإحداثيات
 */
export function parseKmlContent(kmlString: string): ParseResult {
  const errors: string[] = [];
  const stations: Station[] = [];

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlString, 'text/xml');

    // التحقق من أخطاء الـ XML
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    if (parseError.length > 0) {
      return {
        success: false,
        stations: [],
        errors: ['تنسيق ملف KML غير صالح: ' + parseError[0].textContent],
        totalParsed: 0,
      };
    }

    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    if (placemarks.length === 0) {
      return {
        success: false,
        stations: [],
        errors: ['لم يتم العثور على أي علامات مواقع (Placemark) داخل الملف'],
        totalParsed: 0,
      };
    }

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];

      // اسم المحطة
      const nameNode = pm.getElementsByTagName('name')[0];
      const name = nameNode ? nameNode.textContent?.trim() || `محطة #${i + 1}` : `محطة #${i + 1}`;

      // الوصف
      const descNode = pm.getElementsByTagName('description')[0];
      const description = descNode ? descNode.textContent?.trim() || '' : '';

      // الإحداثيات
      const coordNode = pm.getElementsByTagName('coordinates')[0];
      if (!coordNode || !coordNode.textContent) {
        continue; // تجاهل العلامات التي لا تحتوي على إحداثيات
      }

      const coordRaw = coordNode.textContent.trim();
      // KML format: lon,lat,alt (يمكن أن تحتوي على مسافات أو عدة نقاط)
      const firstCoord = coordRaw.split(/\s+/)[0];
      const parts = firstCoord.split(',');

      if (parts.length < 2) continue;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.push(`إحداثيات غير صحيحة للمحطة "${name}": (${parts[0]}, ${parts[1]})`);
        continue;
      }

      // كشف الأنشطة والخدمات من الاسم والوصف تلقائياً
      const combinedText = `${name} ${description}`.toLowerCase();
      const services = detectServicesFromText(combinedText);

      // كشف المحافظة
      const governorate = detectGovernorateFromText(combinedText);

      // استخراج الشركة إن وجدت
      const company = detectCompanyFromText(combinedText);

      stations.push({
        id: `kml-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        company,
        lat,
        lng,
        address: description ? cleanHtmlText(description) : `إحداثيات: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        governorate,
        city: '',
        services,
        workingHours: combinedText.includes('24') ? '24 ساعة' : '07:00 ص - 11:00 م',
        status: 'active',
        pressure: '220 بار',
        notes: description ? cleanHtmlText(description) : undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    // تطبيق قواعد كارجاس وتوحيد الأسماء وإلغاء أرقام المحطات 1 و 2 وتأكيد تموين غاز وزيوت للجميع
    const normalizedStations = applyCargasNetworkRules(stations);

    return {
      success: normalizedStations.length > 0,
      stations: normalizedStations,
      errors,
      totalParsed: normalizedStations.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    errors.push(`خطأ أثناء معالجة البيانات: ${errorMsg}`);
    return {
      success: false,
      stations,
      errors,
      totalParsed: stations.length,
    };
  }
}

/**
 * تنظيف نصوص HTML التي قد توجد في وصف KML
 */
function cleanHtmlText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 250);
}

/**
 * استنتاج الخدمات المتاحة برمجياً من نصوص KML
 */
function detectServicesFromText(text: string): StationServices {
  const lower = text.toLowerCase();

  // فحص أسطوانات
  const cylinderTesting =
    lower.includes('فحص') ||
    lower.includes('اسطوان') ||
    lower.includes('أسطوان') ||
    lower.includes('اختبار') ||
    lower.includes('cylinder') ||
    lower.includes('test');

  // زيوت BP / Castrol
  const bpOilCenter =
    lower.includes('bp') ||
    lower.includes('بي بي') ||
    lower.includes('كاسترول') ||
    lower.includes('castrol') ||
    lower.includes('زيوت') ||
    lower.includes('زيت') ||
    lower.includes('oil');

  // تحويل وصيانة
  const conversionMaintenance =
    lower.includes('تحويل') ||
    lower.includes('صيانة') ||
    lower.includes('ورشة') ||
    lower.includes('مركز خدمة') ||
    lower.includes('maintenance') ||
    lower.includes('conversion');

  // تموين غاز (افتراضياً نشط لمعظم محطات الغاز الطبيعي ما لم يُذكر غير ذلك)
  const cngRefuel =
    lower.includes('غاز') ||
    lower.includes('cng') ||
    lower.includes('تموين') ||
    lower.includes('gas') ||
    !cylinderTesting; // إذا لم تكن مركز فحص منفرد، فهي بالعادة محطة تموين

  return {
    cngRefuel: cngRefuel || true,
    conversionMaintenance,
    bpOilCenter,
    cylinderTesting,
    carWash: lower.includes('غسيل') || lower.includes('wash'),
    convenienceStore: lower.includes('ماركت') || lower.includes('سوبر') || lower.includes('market'),
    evCharging: lower.includes('شحن كهرب') || lower.includes('ev'),
    cafe: lower.includes('كافيه') || lower.includes('قهوة') || lower.includes('cafe'),
  };
}

/**
 * استنتاج الشركة المشغلة
 */
function detectCompanyFromText(text: string): string {
  if (text.includes('كارجاس') || text.includes('cargas')) return 'كارجاس - Cargas';
  if (text.includes('غازتك') || text.includes('gastec')) return 'غازتك - Gastec';
  if (text.includes('ماستر غاز') || text.includes('طاقة') || text.includes('taqa')) return 'ماستر غاز - طاقة';
  if (text.includes('توتال') || text.includes('total')) return 'توتال إنرجيز';
  if (text.includes('موبيل') || text.includes('mobil')) return 'إكسون موبيل';
  if (text.includes('شل') || text.includes('shell')) return 'شل';
  if (text.includes('وطنية') || text.includes('wataniya')) return 'وطنية';
  if (text.includes('مصر للبترول')) return 'مصر للبترول';
  if (text.includes('التعاون')) return 'التعاون للبترول';
  return 'محطة وقود وخدمات';
}

/**
 * استنتاج المحافظة من النص
 */
function detectGovernorateFromText(text: string): string {
  const governorates = [
    'القاهرة',
    'الجيزة',
    'الإسكندرية',
    'القليوبية',
    'الشرقية',
    'الغربية',
    'الدقهلية',
    'المنوفية',
    'البحيرة',
    'كفر الشيخ',
    'دمياط',
    'بورسعيد',
    'الإسماعيلية',
    'السويس',
    'شمال سيناء',
    'جنوب سيناء',
    'بني سويف',
    'الفيوم',
    'المنيا',
    'أسيوط',
    'سوهاج',
    'قنا',
    'الأقصر',
    'أسوان',
    'البحر الأحمر',
    'الوادي الجديد',
    'مطروح',
  ];

  for (const gov of governorates) {
    if (text.includes(gov)) return gov;
  }

  // مناطق بالقاهرة الكبرى
  if (
    text.includes('مدينة نصر') ||
    text.includes('المعادي') ||
    text.includes('مصر الجديدة') ||
    text.includes('التجمع') ||
    text.includes('الشروق') ||
    text.includes('بدر') ||
    text.includes('حلوان') ||
    text.includes('عين شمس')
  ) {
    return 'القاهرة';
  }

  if (
    text.includes('الدقي') ||
    text.includes('المهندسين') ||
    text.includes('أكتوبر') ||
    text.includes('زايد') ||
    text.includes('الهرم') ||
    text.includes('فيصل')
  ) {
    return 'الجيزة';
  }

  return 'القاهرة'; // افتراضي
}

/**
 * تصدير المحطات الحالية كملف KML للتنزيل
 */
export function exportStationsToKml(stations: Station[], title = 'محطات الوقود والغاز'): string {
  const placemarksXml = stations
    .map(
      (s) => `
    <Placemark>
      <name><![CDATA[${s.name}]]></name>
      <description><![CDATA[
        شركة: ${s.company}
        عنوان: ${s.address}
        المحافظة: ${s.governorate}
        الهاتف: ${s.phone || '-'}
        ساعات العمل: ${s.workingHours || '24 ساعة'}
        الخدمات: ${[
          s.services.cngRefuel ? 'تموين غاز' : '',
          s.services.conversionMaintenance ? 'تحويل وصيانة' : '',
          s.services.bpOilCenter ? 'مركز زيوت BP' : '',
          s.services.cylinderTesting ? 'فحص أسطوانات' : '',
        ]
          .filter(Boolean)
          .join(' - ')}
      ]]></description>
      <Point>
        <coordinates>${s.lng},${s.lat},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${title}</name>
    <description>تصدير شبكة المحطات بواسطة تطبيق محطاتك</description>
    ${placemarksXml}
  </Document>
</kml>`;
}
