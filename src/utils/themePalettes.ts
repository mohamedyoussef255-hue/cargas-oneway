export interface ColorPalette {
  id: string;
  name: string;
  primary: string; // اللون الرئيسي (HEX)
  primaryHover: string;
  secondary: string; // اللون الثانوي (HEX)
  accent: string; // لون التمييز (HEX)
  description: string;
}

export const PRESET_PALETTES: ColorPalette[] = [
  {
    id: 'cargas_emerald',
    name: 'أخضر كارجاس الزمردي الرسمي',
    primary: '#059669', // Emerald 600
    primaryHover: '#047857', // Emerald 700
    secondary: '#0d9488', // Teal 600
    accent: '#10b981', // Emerald 500
    description: 'الهوية الرسمية المعتمدة لمحطات كارجاس وخدمات الغاز الطبيعي',
  },
  {
    id: 'petroleum_blue',
    name: 'أزرق كارجاس والتعاون البترولي',
    primary: '#0284c7', // Sky 600
    primaryHover: '#0369a1', // Sky 700
    secondary: '#1d4ed8', // Blue 700
    accent: '#38bdf8', // Sky 400
    description: 'مزيج أزرق بترولي مميز مستوحى من محطات التعاون وكارجاس المشتركة',
  },
  {
    id: 'royal_navy_gold',
    name: 'كحلي وذهبي ملكي وقود',
    primary: '#1e3a8a', // Blue 900
    primaryHover: '#172554', // Blue 950
    secondary: '#d97706', // Amber 600
    accent: '#f59e0b', // Amber 500
    description: 'طابع فخم للمؤسسات وشركات البترول الكبرى بروح الكحلي والذهبي',
  },
  {
    id: 'forest_petroleum',
    name: 'أخضر نفطي كلاسيكي غامق',
    primary: '#065f46', // Emerald 800
    primaryHover: '#064e3b', // Emerald 900
    secondary: '#047857', // Emerald 700
    accent: '#34d399', // Emerald 400
    description: 'أخضر داكن كلاسيكي يرمز للطاقة النظيفة والبيئة المستدامة',
  },
  {
    id: 'energy_flame',
    name: 'لهب الغاز البرتقالي النشط',
    primary: '#ea580c', // Orange 600
    primaryHover: '#c2410c', // Orange 700
    secondary: '#dc2626', // Red 600
    accent: '#f97316', // Orange 500
    description: 'ألوان حيوية مستوحاة من شعلة الغاز الطبيعي والطاقة المتدفقة',
  },
  {
    id: 'modern_violet',
    name: 'بنفسجي عصري وأنيق',
    primary: '#7c3aed', // Violet 600
    primaryHover: '#6d28d9', // Violet 700
    secondary: '#4f46e5', // Indigo 600
    accent: '#a78bfa', // Violet 400
    description: 'تصميم تقني عصري ذكي يمنح التطبيق طابعاً برمجياً حديثاً',
  },
  {
    id: 'titanium_slate',
    name: 'رمادي تيتانيوم صناعي هادئ',
    primary: '#334155', // Slate 700
    primaryHover: '#1e293b', // Slate 800
    secondary: '#475569', // Slate 600
    accent: '#64748b', // Slate 500
    description: 'طابع هندسي صناعي محايد يركز على وضوح الخرائط والبيانات',
  },
  {
    id: 'crimson_castrol',
    name: 'أحمر كاسترول وزيوت BP الرياضي',
    primary: '#dc2626', // Red 600
    primaryHover: '#b91c1c', // Red 700
    secondary: '#059669', // Emerald 600
    accent: '#ef4444', // Red 500
    description: 'مستوحى من مراكز زيوت BP كاسترول وخدمة المحركات السريعة',
  },
];

// دالة تحويل HEX إلى درجات أفتح وأغمق و RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.max(0, Math.round(rgb.r + (255 - rgb.r) * (percent / 100))));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g + (255 - rgb.g) * (percent / 100))));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b + (255 - rgb.b) * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * (1 - percent / 100))));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * (1 - percent / 100))));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * (1 - percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * تطبيق بنتونة الألوان على الـ Root في المتصفح لتغيير ألوان التطبيق كاملة
 */
export function applyThemeToDocument(
  primaryColor: string,
  secondaryColor?: string,
  accentColor?: string
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const prim = primaryColor || '#059669';
  const sec = secondaryColor || adjustBrightness(prim, 20);
  const acc = accentColor || adjustBrightness(prim, 40);

  const primHover = darkenColor(prim, 12);
  const primLight = adjustBrightness(prim, 85);
  const primRgb = hexToRgb(prim);
  const secRgb = hexToRgb(sec);

  // تحديث متغيرات CSS الرئيسية
  root.style.setProperty('--theme-primary', prim);
  root.style.setProperty('--theme-primary-hover', primHover);
  root.style.setProperty('--theme-primary-light', primLight);
  root.style.setProperty('--theme-secondary', sec);
  root.style.setProperty('--theme-accent', acc);
  root.style.setProperty('--theme-primary-rgb', `${primRgb.r}, ${primRgb.g}, ${primRgb.b}`);
  root.style.setProperty('--theme-secondary-rgb', `${secRgb.r}, ${secRgb.g}, ${secRgb.b}`);

  // استبدال درجات emerald في Tailwind v4 لتغيير التطبيق بالكامل
  root.style.setProperty('--color-emerald-500', acc);
  root.style.setProperty('--color-emerald-600', prim);
  root.style.setProperty('--color-emerald-700', primHover);
  root.style.setProperty('--color-emerald-800', darkenColor(prim, 25));
  root.style.setProperty('--color-emerald-900', darkenColor(prim, 40));
  root.style.setProperty('--color-emerald-950', darkenColor(prim, 60));
  root.style.setProperty('--color-emerald-50', primLight);
  root.style.setProperty('--color-emerald-100', adjustBrightness(prim, 75));
  root.style.setProperty('--color-emerald-200', adjustBrightness(prim, 60));
  root.style.setProperty('--color-emerald-300', adjustBrightness(prim, 45));
  root.style.setProperty('--color-emerald-400', adjustBrightness(prim, 25));
}
