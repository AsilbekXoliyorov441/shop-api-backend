# Shop API

Frontend kursini bitirgan o'quvchilar uchun o'quv internet-do'kon API. NestJS + PostgreSQL + Prisma, Swagger hujjati bilan.

## Serverga qo'yish

Serverda faqat Docker kerak.

```bash
cp .env.example .env
# .env ichida to'ldiring:
#   JWT_SECRET=$(openssl rand -hex 32)        # kamida 32 belgi, aks holda server ishga tushmaydi
#   POSTGRES_PASSWORD=$(openssl rand -hex 16) # faqat birinchi ishga tushirishdan oldin
#   PUBLIC_URL=https://api.example.uz
docker compose up -d --build
```

- API: `http://SERVER:3000/api`
- Swagger: `http://SERVER:3000/docs`
- Tekshirish: `GET /api/health` (baza javob bermasa `503`). Docker ham shu orqali konteyner holatini kuzatadi: `docker compose ps` da `healthy`.
- Loglar: `docker compose logs -f api`

Birinchi ishga tushishda jadvallar yaratiladi va katalog (8 kategoriya, 120 mahsulot, 10 filial) hamda demo akkauntlar qo'shiladi.

### HTTPS

HTTPS shart: HTTPS'da turgan frontend (Vercel, Netlify) HTTP API'ga so'rov yubora olmaydi. Compose ichida tayyor Caddy bor, sertifikatni o'zi oladi va yangilaydi:

1. Domen (masalan `api.example.uz`) DNS A yozuvini server IP'siga qarating, 80 va 443 portlarni oching.
2. `.env` da: `DOMAIN=api.example.uz`, `PUBLIC_URL=https://api.example.uz`, `BIND=127.0.0.1`.
3. `docker compose --profile https up -d --build`

Shundan keyin API `https://api.example.uz/api`, WebSocket ham shu manzilda ishlaydi. O'zingizning nginx'ingiz bo'lsa, Caddy kerak emas: 3000-portga proxy qiling va `proxy_http_version 1.1`, `proxy_set_header Upgrade $http_upgrade`, `proxy_set_header Connection "upgrade"` qo'shing.

### Yangilash va zaxira

Yangilash: `git pull && docker compose up -d --build` (HTTPS bilan bo'lsa `--profile https` qo'shing). Migratsiyalar konteyner ishga tushganda avtomatik qo'llanadi. Baza va yuklangan rasmlar Docker volume'larda (`db_data`, `uploads`) saqlanadi.

Bazani zaxiralash: `docker compose exec db pg_dump -U shop shop > backup.sql`. Tiklash: `docker compose exec -T db psql -U shop shop < backup.sql`.

## Lokal ishga tushirish

```bash
docker run -d --name shop-db -e POSTGRES_USER=shop -e POSTGRES_PASSWORD=shop -e POSTGRES_DB=shop -p 5432:5432 postgres:17-alpine
cp .env.example .env
npm install
npm run db:deploy
npm run start:dev
```

## Demo akkauntlar

| Rol | Email | Parol |
|---|---|---|
| Admin | `admin@shop.uz` | `admin123` |
| Foydalanuvchi | `user@shop.uz` | `user123` |

Admin akkaunti hamma o'quvchi uchun umumiy. Parolni API orqali o'zgartirib bo'lmaydi.

## O'quvchilar nimani mashq qiladi

| Mavzu | Endpointlar |
|---|---|
| Ro'yxat, pagination, qidiruv, filtr, saralash | `GET /products`, `GET /categories` |
| Xarita bilan ishlash (koordinatalar), shahar bo'yicha filtr | `GET /locations` |
| Ro'yxatdan o'tish, login, token saqlash | `POST /auth/register`, `/auth/login`, `GET /auth/me` |
| Access token eskirganda yangilash | `POST /auth/refresh` (401 `TOKEN_EXPIRED` dan keyin) |
| Profil sahifasi: ikki so'rovni parallel yuborish | `GET /auth/me` (`ordersCount`) + `GET /orders` |
| Himoyalangan sahifalar | `/cart`, `/favorites`, `/orders` |
| Savat va buyurtma oqimi | `POST /cart/items` → `POST /orders` → `POST /orders/{id}/pay` |
| Optimistic update | `POST/DELETE /favorites/{productId}` |
| Forma validatsiyasi xatolarini ko'rsatish | 422 javobdagi `errors` obyekti |
| Real vaqt (Socket.IO): buyurtma statusi, ombordagi son | `order:updated`, `product:stock` va boshqa hodisalar (Swagger'da to'liq jadval) |
| Fayl yuklash | `POST /users/me/avatar`, `POST /products/{id}/images`, `POST /categories/{id}/image`, `POST /locations/{id}/image` |
| Admin panel, rollar (403) | `POST/PATCH/DELETE /products`, `/categories`, `/locations`, `/admin/orders`, `/admin/users` |

## Xato formati

```json
{
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": { "email": ["email must be an email"] },
  "path": "/api/auth/register",
  "timestamp": "2026-10-05T10:00:00.000Z"
}
```

`code` barqaror, frontendda shunga qarab shart yoziladi: `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `OUT_OF_STOCK`, `CART_EMPTY`, `PRODUCT_NOT_FOUND` va hokazo.

## Sinov parametrlari

Istalgan so'rovga qo'shiladi:

- `?_delay=2000`: javobni 2 soniya kechiktiradi (ko'pi bilan 10000 ms).
- `?_fail=500`: shu status bilan sun'iy xato qaytaradi (400–599).

## Ma'lumotlar

Baza hech qachon avtomatik tozalanmaydi. Katalog (8 kategoriya, 120 mahsulot, 10 filial, `src/seed/seed-data.ts`) faqat bo'sh bazaga bir marta yoziladi; admin qilgan o'zgarishlar doimiy qoladi. Boshidan boshlash uchun: `docker compose down -v && docker compose up -d`.

## Rollar

| Rol | Ruxsat |
|---|---|
| Mehmon | Katalogni ko'rish, ro'yxatdan o'tish, kirish |
| `USER` | Profil, savat, sevimlilar, o'z buyurtmalari, sharh |
| `ADMIN` | Hammasi + mahsulot/kategoriya/filial CRUD, barcha buyurtmalar va foydalanuvchilar |

Ikkalasi ham `POST /auth/login` orqali token oladi; rol token ichida (`role`) va `user.role` da keladi. Swagger'da har bir endpointda **Ruxsat** qatori bor.

## WebSocket

Socket.IO server API bilan bir portda ishlaydi (`/socket.io`). Token ixtiyoriy: `io(URL, { auth: { token: accessToken } })`. Tokensiz klient faqat mahsulot hodisalarini, `USER` o'z buyurtmalarinikini, `ADMIN` barcha buyurtmalarnikini oladi. Hodisalar jadvali Swagger bosh sahifasida.

## CORS

Standart holatda istalgan manzildan so'rov qabul qilinadi (`CORS_ORIGINS=*`). Cheklash uchun `.env` da vergul bilan yozing: `CORS_ORIGINS=http://localhost:5173,https://my-shop.vercel.app`. `Authorization` va `Content-Type` sarlavhalari ruxsat etilgan. WebSocket ham shu ro'yxatga bo'ysunadi.

## Sozlamalar

Barchasi `.env.example` da izohlari bilan. Muhimlari:

- `ACCESS_TOKEN_TTL` (standart `15m`): refresh oqimini darsda ko'rsatish uchun vaqtincha `1m` qilish mumkin.
- `RATE_LIMIT` (standart 600): bitta IP uchun daqiqasiga so'rovlar. Butun sinf bitta Wi-Fi ortida bo'lsa, hammasi bitta IP hisoblanadi.
# shop-api-backend
