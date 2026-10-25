// Boshlang'ich katalog. Faqat bo'sh bazaga bir marta yoziladi.

interface CategorySeed {
  name: string;
  slug: string;
  basePrice: number;
  brands: string[];
  models: string[];
  description: string;
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Telefonlar',
    slug: 'telefonlar',
    basePrice: 2_500_000,
    brands: ['Samsung Galaxy', 'Xiaomi Redmi', 'Apple iPhone', 'Honor', 'Tecno Camon'],
    models: ['Lite', 'Pro', 'Ultra'],
    description: 'Yorqin ekran, sig\'imli batareya va sifatli kamera. Rasmiy kafolat 1 yil.',
  },
  {
    name: 'Noutbuklar',
    slug: 'noutbuklar',
    basePrice: 6_000_000,
    brands: ['Lenovo IdeaPad', 'HP Pavilion', 'Asus VivoBook', 'Acer Aspire', 'Apple MacBook'],
    models: ['14', '15 Pro', '16 Max'],
    description: 'O\'qish, ish va dasturlash uchun qulay noutbuk. SSD xotira, tez ishga tushadi.',
  },
  {
    name: 'Quloqchinlar',
    slug: 'quloqchinlar',
    basePrice: 250_000,
    brands: ['Sony', 'JBL Tune', 'Apple AirPods', 'Xiaomi Buds', 'Marshall'],
    models: ['Mini', 'Plus', 'Studio'],
    description: 'Simsiz ulanish, toza ovoz va shovqinni kamaytirish funksiyasi.',
  },
  {
    name: 'Televizorlar',
    slug: 'televizorlar',
    basePrice: 3_500_000,
    brands: ['Samsung Crystal', 'LG NanoCell', 'Artel', 'Xiaomi TV', 'Hisense'],
    models: ['43"', '55"', '65"'],
    description: 'Smart TV, 4K tasvir va ingichka ramka. Devorga o\'rnatish mumkin.',
  },
  {
    name: 'Maishiy texnika',
    slug: 'maishiy-texnika',
    basePrice: 1_200_000,
    brands: ['Artel', 'Bosch', 'Philips', 'Tefal', 'Samsung'],
    models: ['changyutgich', 'mikroto\'lqinli pech', 'kir yuvish mashinasi'],
    description: 'Uy uchun ishonchli texnika. Elektr energiyasini tejaydi, ishlatish oson.',
  },
  {
    name: 'Kiyimlar',
    slug: 'kiyimlar',
    basePrice: 150_000,
    brands: ['Erkaklar', 'Ayollar', 'Bolalar', 'Sport', 'Klassik'],
    models: ['futbolkasi', 'kurtkasi', 'shimi'],
    description: 'Tabiiy matodan tikilgan, yuvilganda shaklini yo\'qotmaydi. O\'lchamlar: S–XXL.',
  },
  {
    name: 'Poyabzallar',
    slug: 'poyabzallar',
    basePrice: 300_000,
    brands: ['Nike', 'Adidas', 'Puma', 'New Balance', 'Reebok'],
    models: ['Runner', 'Classic', 'Street'],
    description: 'Yengil va qulay poyabzal. Har kuni kiyish va sport uchun mos.',
  },
  {
    name: 'Kitoblar',
    slug: 'kitoblar',
    basePrice: 45_000,
    brands: ['JavaScript', 'React', 'TypeScript', 'Algoritmlar', 'Dizayn'],
    models: ['asoslari', 'amaliyotda', 'chuqur o\'rganish'],
    description: 'Dasturlashni o\'rganuvchilar uchun qo\'llanma. Misollar va mashqlar bilan.',
  },
];

const image = (seed: string) => `https://picsum.photos/seed/${seed}/600/600`;

export const SEED_CATEGORIES = CATEGORIES.map((c, i) => ({
  id: i + 1,
  name: c.name,
  slug: c.slug,
  imageUrl: image(c.slug),
}));

export const SEED_PRODUCTS = CATEGORIES.flatMap((c, ci) =>
  c.brands.flatMap((brand, bi) =>
    c.models.map((model, mi) => {
      const n = bi * c.models.length + mi; // kategoriya ichidagi tartib raqami
      const id = ci * 15 + n + 1;
      const price = Math.round((c.basePrice * (1 + bi * 0.25) * (1 + mi * 0.6)) / 1000) * 1000;
      return {
        id,
        title: `${brand} ${model}`,
        description: c.description,
        price,
        // Har uchinchi mahsulot chegirmada, har yettinchisi omborda yo'q
        oldPrice: id % 3 === 0 ? Math.round((price * 1.2) / 1000) * 1000 : null,
        stock: id % 7 === 0 ? 0 : 5 + ((id * 7) % 40),
        images: [image(`p${id}`), image(`p${id}b`), image(`p${id}c`)],
        categoryId: ci + 1,
        // Yangi mahsulotlar ro'yxat boshida chiqishi uchun sanalar ketma-ket
        createdAt: new Date(Date.UTC(2026, 0, 1) + id * 3_600_000),
      };
    }),
  ),
);

export const DEMO_USERS = [
  { email: 'admin@shop.uz', password: 'admin123', name: 'Admin', role: 'ADMIN' as const },
  { email: 'user@shop.uz', password: 'user123', name: 'Demo User', role: 'USER' as const },
];

const LOCATIONS: [name: string, city: string, address: string, latitude: number, longitude: number, hours: string][] = [
  ['Chilonzor filiali', 'Toshkent', 'Chilonzor tumani, Bunyodkor shoh ko\'chasi, 12-uy', 41.2856, 69.2034, '09:00–21:00'],
  ['Yunusobod filiali', 'Toshkent', 'Yunusobod tumani, Amir Temur shoh ko\'chasi, 108-uy', 41.3654, 69.2889, '09:00–22:00'],
  ['Mirzo Ulug\'bek filiali', 'Toshkent', 'Mirzo Ulug\'bek tumani, Buyuk Ipak Yo\'li ko\'chasi, 45-uy', 41.3275, 69.3341, '10:00–20:00'],
  ['Registon filiali', 'Samarqand', 'Registon ko\'chasi, 7-uy', 39.6547, 66.9758, '09:00–20:00'],
  ['Bog\'ishamol filiali', 'Samarqand', 'Bog\'ishamol ko\'chasi, 21-uy', 39.6702, 66.9441, '09:00–19:00'],
  ['Buxoro filiali', 'Buxoro', 'Bahouddin Naqshband ko\'chasi, 30-uy', 39.7681, 64.4556, '09:00–19:00'],
  ['Andijon filiali', 'Andijon', 'Bobur shoh ko\'chasi, 15-uy', 40.7821, 72.3442, '09:00–20:00'],
  ['Namangan filiali', 'Namangan', 'Uychi ko\'chasi, 3-uy', 40.9983, 71.6726, '09:00–20:00'],
  ['Farg\'ona filiali', 'Farg\'ona', 'Mustaqillik ko\'chasi, 18-uy', 40.3864, 71.7864, '09:00–20:00'],
  ['Nukus filiali', 'Nukus', 'Dosnazarov ko\'chasi, 9-uy', 42.4619, 59.6166, '10:00–19:00'],
];

export const SEED_LOCATIONS = LOCATIONS.map(([name, city, address, latitude, longitude, workingHours], i) => ({
  name,
  city,
  address,
  latitude,
  longitude,
  workingHours,
  phone: `+9987120000${String(i + 1).padStart(2, '0')}`,
  imageUrl: image(`loc${i + 1}`),
}));
