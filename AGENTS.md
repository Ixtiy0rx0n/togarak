# Repository Guidelines

## Loyiha Tuzilishi va Modullar
Ushbu repository endi statik `TypeScript` ilovadir. Asosiy sahifa `index.html`, qolgan ekranlar `Pages/` ichida joylashgan. Barcha manba logika `src/` ichida: umumiy store va helperlar `src/core/`, sahifa entrypointlari `src/pages/`, vizual effektlar `src/shared/`. Build natijalari `dist/` ichiga yoziladi. Boshlang'ich ma'lumotlar `Data/seed.json` da, media fayllar `Img/` va `Uploads/` ichida turadi.

## Build, Test va Development Buyruqlari
Loyiha `Node.js 20+` bilan ishlaydi.

- `npm install`: local tool paketlarini o'rnatadi.
- `npm run build`: barcha `TypeScript` fayllarni `dist/` ga kompilyatsiya qiladi.
- `npm run check`: emit qilmasdan type-check ishlatadi.

Statik sahifalarni oddiy local server orqali oching; runtime ma'lumotlari brauzer `localStorage` ichida saqlanadi.

## Kodlash Uslubi va Nomlash Qoidalari
4 bo'sh joyli indentation ishlating. `TypeScript` importlarida brauzerga mos `.js` suffiks qoldirilsin, masalan `../core/store.js`. Funksiya va o'zgaruvchilar uchun `camelCase`, type va interface lar uchun `PascalCase` ishlating. Sahifa fayllarida joriy `PascalCase` nomlashni saqlang: `Admin.html`, `TeacherDashboard.html`.

## Test Yozish va Tekshirish Qoidalari
Avtomatik test to'plami yo'q. Har o'zgarishdan keyin kamida `npm run check` va `npm run build` ishlating. So'ng `index.html`, `Pages/Admin.html`, `Pages/TeacherDashboard.html` va `Pages/StudentDashboard.html` oqimlarini qo'lda tekshiring. Yangi test qo'shsangiz, ularni alohida `tests/` papkasida saqlang.

## Commit va Pull Request Qoidalari
Commit matnlari qisqa va buyruq ohangida bo'lsin, masalan `Rewrite admin flow for static store`. Pull request ichida qisqa tavsif, qo'lda tekshirilgan oqimlar, `Data/seed.json` o'zgarishlari va UI yangilanishlari uchun screenshot kiriting.

## Xavfsizlik va Konfiguratsiya Maslahatlari
Haqiqiy maxfiy ma'lumotlarni commit qilmang. `Data/seed.json` demo ma'lumotlar uchun xizmat qiladi, shuning uchun undagi login va parollar faqat test maqsadida bo'lishi kerak. Runtime CRUD o'zgarishlari brauzer `localStorage` ichida saqlanadi; doimiy default tarkibni yangilash uchun `seed.json` ni tahrir qiling.
