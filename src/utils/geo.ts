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
 * يعمل مجاناً وبدون أي اشتراك أو تكاليف API، حيث يفتح تطبيق خرائط جوجل مباشرة في هاتف المستخدم بملاحة صوتية حية
 */
export function getGoogleMapsNavigationUrl(lat: number, lng: number, name?: string): string {
  const encodedName = name ? encodeURIComponent(name) : '';
  // Google Maps Universal Navigation URL
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${encodedName ? `&destination_place_id=${encodedName}` : ''}&travelmode=driving`;
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
