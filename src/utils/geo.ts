/**
 * حساب المسافة بين نقطتين على الكرة الأرضية باستخدام معادلة هافرسين (Haversine Formula)
 * @returns المسافة بالكيلومتر
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // تقريب لأقرب 0.1 كم
}

/**
 * تنسيق المسافة لعرضها بالعربية
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) return '';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} متر`;
  }
  return `${distanceKm.toFixed(1)} كم`;
}

/**
 * رابط التوجيه والملاحة المباشر لفتح خرائط جوجل (Google Maps App)
 * يبدأ الملاحة دائماً من موقع المستخدم الجغرافي الحقيقي المباشر إلى المحطة دون الذهاب لوسط البلد
 */
export function getGoogleMapsNavigationUrl(
  lat: number,
  lng: number,
  _name?: string,
  userLocation?: { lat: number; lng: number } | null
): string {
  // فحص ما إذا كان الموقع هو موقع وسط البلد الافتراضي القديم لتجنبه
  const isDowntownFallback =
    userLocation &&
    Math.abs(userLocation.lat - 30.0444) < 0.001 &&
    Math.abs(userLocation.lng - 31.2357) < 0.001;

  // عند توفر إحداثيات GPS حقيقية للمستخدم، نمررها كنقطة بداية الملاحة (origin)
  // وفي حال عدم توفرها أو كونها الافتراضية، نمرر Current+Location ليطلب Google Maps موقع الجهاز المباشر
  const originParam =
    userLocation && !isDowntownFallback
      ? `origin=${userLocation.lat},${userLocation.lng}`
      : `origin=Current+Location`;

  // نستخدم destination=${lat},${lng} نقياً دون أي Place ID وهمي يسبب تحويل الملاحة لوسط البلد
  return `https://www.google.com/maps/dir/?api=1&${originParam}&destination=${lat},${lng}&travelmode=driving`;
}

/**
 * رابط العرض على خرائط جوجل
 */
export function getGoogleMapsViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * نسخ الإحداثيات للحافظة
 */
export async function copyCoordinatesToClipboard(lat: number, lng: number): Promise<boolean> {
  try {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
