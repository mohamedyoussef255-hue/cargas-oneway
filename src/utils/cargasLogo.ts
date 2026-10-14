/**
 * الشعارات الرسمية المعتمدة لتطبيق أقرب محطة كارجاس
 * تعتمد على صيغة SVG Data URI متجهة فائقة النقاء والدقة لتعمل على جميع الشاشات بدون أي بكسلة وخفيفة الحجم
 */

// ================= 1. اللوجو الأول: لوجو التطبيق الرئيسي (أقرب محطة كارجاس) =================
export const APP_PRIMARY_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fcd34d" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- خلفية الأيقونة الفخمة مع حواف مستديرة -->
  <rect x="8" y="8" width="144" height="144" rx="36" fill="url(#bgGrad)" stroke="url(#goldBorder)" stroke-width="4" filter="url(#glow)" />
  
  <!-- حلقات الرادار لتحديد أقرب محطة والملاحة الذكية -->
  <circle cx="80" cy="74" r="50" fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.4" />
  <circle cx="80" cy="74" r="38" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.3" />

  <!-- دبوس الموقع GPS الأنيق -->
  <path d="M80 32 C62 32, 48 46, 48 64 C48 88, 80 114, 80 114 C80 114, 112 88, 112 64 C112 46, 98 32, 80 32 Z" fill="#ffffff" filter="url(#glow)" />
  <circle cx="80" cy="62" r="24" fill="#047857" />

  <!-- أجنحة الغاز الطبيعي والطاقة النظيفة -->
  <path d="M66 70 C68 54, 76 46, 80 44 C77 50, 76 56, 80 60 C75 63, 70 66, 66 70 Z" fill="url(#cyanGrad)" />
  <path d="M94 70 C92 54, 84 46, 80 44 C83 50, 84 56, 80 60 C85 63, 90 66, 94 70 Z" fill="url(#emeraldGrad)" />

  <!-- شعلة الغاز الطبيعي المتوهجة -->
  <path d="M80 42 C80 42, 86 52, 86 60 C86 66, 82 71, 80 71 C78 71, 74 66, 74 60 C74 52, 80 42, 80 42 Z" fill="url(#flameGrad)" />
  <path d="M80 50 C80 50, 83 56, 83 61 C83 64, 81 67, 80 67 C79 67, 77 64, 77 61 C77 56, 80 50, 80 50 Z" fill="#ffffff" opacity="0.9" />

  <!-- شريط العنوان والاسم المميز -->
  <rect x="18" y="118" width="124" height="28" rx="8" fill="#065f46" stroke="#34d399" stroke-width="1.5" />
  <text x="80" y="132" font-family="'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" font-weight="900" font-size="11.5" fill="#ffffff" text-anchor="middle">أقرب محطة كارجاس</text>
  <text x="80" y="142" font-family="'Segoe UI', Arial, sans-serif" font-weight="800" font-size="7" fill="#6ee7b7" text-anchor="middle" letter-spacing="1.5">CARGAS CNG STATIONS</text>
</svg>
`)}`;

// ================= 2. اللوجو الثاني: لوجو محطات كارجاس الرسمي (المعتمد لكل محطة وخريطة) =================
export const STATION_NETWORK_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
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

// للتوافق مع كافة المكونات القديمة
export const DEFAULT_CARGAS_LOGO = STATION_NETWORK_LOGO;
