# 📺 Zero TV | منصة البث المباشر - ZeroDev TV API

<div align="center">
  
![Zero TV](https://img.shields.io/badge/Zero%20TV-2026-blue?style=flat-square&logo=tv)
![API](https://img.shields.io/badge/API-ZeroDev%20TV-orange?style=flat-square)
![Version](https://img.shields.io/badge/version-2.0.0-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-purple?style=flat-square)

**منصة متكاملة لمشاهدة القنوات التلفزيونية المباشرة بجودة عالية**

</div>

---

## 📌 عن المشروع

Zero TV هو موقع متكامل لبث القنوات التلفزيونية المباشرة يعمل بالكامل على GitHub Pages بدون الحاجة إلى Backend. يستخدم الموقع **ZeroDev TV API** لجلب بيانات القنوات والستريمات من iptv-org.

### ✨ المميزات

| الميزة | الوصف |
|--------|-------|
| 🎬 **بث مباشر** | آلاف القنوات العالمية |
| 🎨 **تصميم عصري** | واجهة مستخدم احترافية |
| 🔍 **بحث متقدم** | ابحث عن أي قناة بسهولة |
| 🏷️ **فلتر بالتصنيفات** | تنظيم ذكي للقنوات |
| ⭐ **قائمة المفضلة** | حفظ القنوات المفضلة |
| 💾 **تخزين مؤقت** | تحميل أسرع بعد الزيارة الأولى |
| 📱 **متجاوب بالكامل** | يعمل على جميع الأجهزة |
| 🎯 **آخر قناة مشاهدة** | تذكر آخر قناة تم تشغيلها |

---

## 🛠️ التقنيات المستخدمة

<div align="center">

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| HTML5 | - | هيكل الموقع |
| CSS3 | - | التصميم والتنسيق |
| JavaScript | ES6+ | منطق الموقع |
| Shaka Player | 4.7.13 | تشغيل البث |
| Font Awesome | 6.0 | الأيقونات |
| Google Fonts | Cairo | الخط الرئيسي |

</div>

### مصادر البيانات (ZeroDev TV API)

```javascript
// يتم جلب البيانات من خلال ZeroDev TV API من المصادر التالية:
- https://iptv-org.github.io/api/channels.json
- https://iptv-org.github.io/api/streams.json  
- https://iptv-org.github.io/api/logos.json
