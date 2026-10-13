/**
 * لوجو وشعار شركة كارجاس الرسمي (SVG Data URI عالي الدقة والوضوح)
 * يُستخدم كشعار رسمي معتمد لعلامات المحطات على الخريطة وبطاقات المحطات
 */
export const DEFAULT_CARGAS_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="gradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="gradFlame" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- الخلفية البيضاء الدائرية مع إطار الزمردي الأنيق -->
  <circle cx="60" cy="60" r="56" fill="#ffffff" stroke="url(#gradEmerald)" stroke-width="4" filter="url(#shadow)" />
  <circle cx="60" cy="60" r="51" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />

  <!-- جناح الغاز الأزرق التكنولوجي -->
  <path d="M28 72 C32 46, 50 32, 62 26 C57 38, 55 50, 62 58 C52 63, 38 67, 28 72 Z" fill="url(#gradBlue)" />

  <!-- جناح الطاقة النظيفة الأخضر -->
  <path d="M92 72 C88 46, 70 32, 58 26 C63 38, 65 50, 58 58 C68 63, 82 67, 92 72 Z" fill="url(#gradEmerald)" />

  <!-- شعلة الغاز الطبيعي الذهبية المميزة في المنتصف -->
  <path d="M60 20 C60 20, 70 36, 70 48 C70 58, 63 65, 60 65 C57 65, 50 58, 50 48 C50 36, 60 20, 60 20 Z" fill="url(#gradFlame)" />
  <path d="M60 32 C60 32, 65 42, 65 49 C65 54, 62 58, 60 58 C58 58, 55 54, 55 49 C55 42, 60 32, 60 32 Z" fill="#ffffff" opacity="0.8" />

  <!-- كتابة اسم كارجاس CARGAS الرسمي -->
  <rect x="22" y="78" width="76" height="28" rx="6" fill="#047857" />
  <text x="60" y="93" font-family="'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle">كارجاس</text>
  <text x="60" y="103" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="7.5" fill="#bae6fd" text-anchor="middle" letter-spacing="1.5">CARGAS</text>
</svg>
`)}`;
