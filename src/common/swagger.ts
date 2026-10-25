import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, getSchemaPath, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorDto } from './error.dto';

/** `Auth()` dekoratori operatsiyaga yozib qo'yadigan kengaytma: ruxsat berilgan rollar */
export const ROLES_EXTENSION = 'x-roles';

const DESCRIPTION = `
Frontend o'quvchilari uchun o'quv internet-do'kon API.

## Rollar

| Rol | Nima qila oladi |
|---|---|
| Mehmon (tokensiz) | Katalogni ko'rish, ro'yxatdan o'tish, kirish |
| \`USER\` | Profil, savat, sevimlilar, buyurtmalar, sharh qoldirish |
| \`ADMIN\` | \`USER\` qila oladigan hamma narsa + mahsulot, kategoriya va filiallarni boshqarish, barcha buyurtma va foydalanuvchilar |

Ro'yxatdan o'tgan har bir kishi \`USER\` bo'ladi. Har bir endpoint tavsifida **Ruxsat** qatori kim chaqira olishini ko'rsatadi.

**Demo akkauntlar**
- \`ADMIN\`: \`admin@shop.uz\` / \`admin123\`
- \`USER\`: \`user@shop.uz\` / \`user123\`

## Avtorizatsiya

Ikkala rol ham bir xil yo'l bilan token oladi: \`POST /api/auth/login\`.

1. Javobdagi \`accessToken\` ni har so'rovda \`Authorization: Bearer <accessToken>\` sarlavhasida yuboring. Swagger'da o'ng yuqoridagi **Authorize** tugmasiga qo'ying.
2. Access token qisqa muddatli. Eskirganda API \`401\` va \`code: "TOKEN_EXPIRED"\` qaytaradi.
3. Shunda \`POST /api/auth/refresh\` ga \`refreshToken\` yuborib, yangi juftlik oling. Refresh token bir martalik: har safar yangisi beriladi.
4. Roli yetmasa \`403\` va \`code: "FORBIDDEN"\` qaytadi.

## WebSocket (real vaqt)

Server [Socket.IO](https://socket.io/docs/v4/client-api/) ishlatadi, manzili API bilan bir xil (\`/api\` siz). Klientda \`socket.io-client\` kerak:

\`\`\`js
import { io } from 'socket.io-client';
const socket = io('https://API_MANZILI', { auth: { token: accessToken } }); // token ixtiyoriy
socket.on('order:updated', (order) => console.log(order.status));
socket.on('connect_error', (err) => console.log(err.message)); // TOKEN_EXPIRED | TOKEN_INVALID
\`\`\`

Server faqat yuboradi, klientdan xabar kutmaydi.

| Hodisa | Kim oladi | Ma'lumot | Qachon |
|---|---|---|---|
| \`connected\` | ulangan klient | \`{ authenticated, user: { id, role } \\| null }\` | Ulanish o'rnatilganda |
| \`order:created\` | buyurtma egasi va barcha \`ADMIN\` | Order | \`POST /orders\` |
| \`order:updated\` | buyurtma egasi va barcha \`ADMIN\` | Order | To'lov, bekor qilish, admin statusni o'zgartirganda |
| \`product:created\` | hamma (tokensiz ham) | Product | Admin mahsulot qo'shganda |
| \`product:updated\` | hamma | Product | Admin tahrirlaganda yoki rasm yuklaganda |
| \`product:deleted\` | hamma | \`{ id }\` | Admin o'chirganda |
| \`product:stock\` | hamma | \`[{ id, stock }]\` | Buyurtma berilganda yoki bekor qilinganda |

Access token eskirganda \`connect_error\` da \`TOKEN_EXPIRED\` keladi: \`/auth/refresh\` qiling, \`socket.auth = { token: yangiToken }\` qilib, \`socket.connect()\` ni chaqiring.

## Xato formati

Barcha xatolar bir xil ko'rinishda: \`{ statusCode, code, message, errors?, path, timestamp }\`.
\`code\` barqaror, frontendda shunga qarab shart yozing. Validatsiya xatosida (\`422\`) \`errors\` maydon nomi bo'yicha xabarlar ro'yxatini beradi.

## Sinov parametrlari

Istalgan so'rovga qo'shish mumkin:
- \`?_delay=2000\` javobni 2 soniya kechiktiradi (loading holatini sinash uchun, ko'pi bilan 10000).
- \`?_fail=500\` shu status kod bilan sun'iy xato qaytaradi (400–599).
`;

const TAGS: [string, string][] = [
  ['Auth', 'Ro\'yxatdan o\'tish, kirish, tokenlarni yangilash'],
  ['Users', 'Profil va foydalanuvchilar'],
  ['Categories', 'Kategoriyalar. O\'qish hammaga ochiq, o\'zgartirish faqat ADMIN'],
  ['Products', 'Mahsulotlar va sharhlar. O\'qish hammaga ochiq, o\'zgartirish faqat ADMIN'],
  ['Locations', 'Do\'kon filiallari: manzil va xarita koordinatalari. O\'qish hammaga ochiq, o\'zgartirish faqat ADMIN'],
  ['Favorites', 'Sevimlilar. Har bir foydalanuvchining o\'ziniki'],
  ['Cart', 'Savat. Har bir foydalanuvchining o\'ziniki'],
  ['Orders', 'Buyurtmalar. USER faqat o\'zinikini, ADMIN hammasini ko\'radi'],
  ['Health', 'Server holati'],
];

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { $ref: getSchemaPath(ErrorDto) } } },
});

// Har bir operatsiyaga ruxsat qatori va umumiy xato javoblarini qo'shadi
function enrich(document: OpenAPIObject) {
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = item[method];
      if (!op) continue;

      const roles = (op as unknown as Record<string, unknown>)[ROLES_EXTENSION] as string[] | undefined;
      const access = !op.security?.length
        ? 'hamma (token shart emas)'
        : roles?.length
          ? roles.map((r) => `\`${r}\``).join(', ')
          : '`USER`, `ADMIN` (istalgan kirgan foydalanuvchi)';
      op.description = [`**Ruxsat:** ${access}`, op.description].filter(Boolean).join('\n\n');

      const hasInput = !!op.requestBody || op.parameters?.some((p) => 'in' in p && p.in === 'query');
      if (hasInput) op.responses['422'] ??= errorResponse('VALIDATION_ERROR: maydonlar noto\'g\'ri to\'ldirilgan');
      if (path.includes('{')) {
        op.responses['400'] ??= errorResponse('Yo\'ldagi id son emas');
        op.responses['404'] ??= errorResponse('Bunday yozuv topilmadi');
      }
      op.responses['429'] ??= errorResponse('TOO_MANY_REQUESTS: so\'rovlar limiti oshdi');
    }
  }
  return document;
}

export function setupSwagger(app: INestApplication) {
  const builder = new DocumentBuilder()
    .setTitle('Shop API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: '/auth/login dan olingan accessToken' });
  for (const [name, description] of TAGS) builder.addTag(name, description);

  const document = enrich(SwaggerModule.createDocument(app, builder.build(), { extraModels: [ErrorDto] }));
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Shop API',
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, docExpansion: 'none', filter: true },
  });
}
