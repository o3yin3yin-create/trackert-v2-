# Flight Focus v1 - Complete Backup & Restore Guide
# نسخة احتياطية كاملة لميزة رحلة التركيز (Flight Focus)

تم إنشاء هذه النسخة الاحتياطية قبل البدء في إعادة تصميم واجهة المستخدم (UI/UX Redesign).
تحتوي هذه النسخة على الكود الشغال بالكامل (واجهات، تتبع لحظي، منطق زمني، أصوات، وشيدر السحاب ثلاثي الأبعاد).

---

## محتويات النسخة الاحتياطية (Backup Contents)

1. **الواجهات ومكونات التصميم (UI Components):**
   - `FlightFocusModal_v1.jsx`: نافذة رحلة التركيز الرئيسية كاملة (اختيار الرحلات، البحث، التايمر، اختيار المقعد، بطاقة صعود الطائرة).
   - `FlightScreensaver_v1.jsx`: نافذة الشاشة التفاعلية ثلاثية الأبعاد (3D Raymarching Sky & Clouds Shader + HUD + خريطة التتبع).
   - `components/BoardingPass.jsx`: تذكرة صعود الطائرة التفاعلية (Boarding Pass).
   - `components/BoardingPassCard.jsx`: بطاقة التذكرة المصغرة.
   - `components/MapComponent.jsx`: خريطة Leaflet لتتبع مسار الطائرة وإحداثيات الإقلاع والهبوط.

2. **المنطق ومحرك المحاكاة (Logic & Engine):**
   - `FlightLogic_v1.js`: منطق التايمر، استدعاء الـ APIs، توليد صوت محرك الطائرة (Cabin Hum Web Audio Synthesis)، وإدارة المقاعد.

3. **الـ Backend & APIs:**
   - `api/flight/route.js`: جلب الرحلات الحية التجارية، ترتيبها تنازلياً، نظام الفئات، والكاش.
   - `api/flight/search/route.js`: البحث عن الرحلات بأرقامها (مثل EK1).
   - `api/flight/live/route.js`: تتبع إحداثيات الطائرة اللحظية والزاوية (Heading).
   - `lib/aviationData.js`: قاعدة بيانات المطارات العالمية وخطوط الطيران وحساب المسافات.

---

## طرق الاسترجاع السريع (How to Restore)

### الطريقة 1: عبر Git (الأسهل والأسرع)
تم حفظ هذه النسخة في Branch و Tag رسميين على GitHub:
- **Git Branch:** `backup/flight-focus-v1`
- **Git Tag:** `backup-flight-focus-v1`

للرجوع إليها في أي وقت:
```bash
git checkout backup/flight-focus-v1
```
أو لنسخ ملف معين من النسخة:
```bash
git checkout backup/flight-focus-v1 -- app/page.jsx
```

### الطريقة 2: عبر ملفات الـ Backup المحلية
يمكنك نسخ أي كود من هذا المجلد مباشرة وإعادته إلى `app/page.jsx` أو المسارات المعنية.
