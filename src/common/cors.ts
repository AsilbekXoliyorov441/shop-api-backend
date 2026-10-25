/**
 * CORS_ORIGINS: vergul bilan ajratilgan manzillar yoki * (standart: hamma manzil).
 * HTTP va WebSocket bir xil ro'yxatdan foydalanadi.
 */
export function corsOrigin(): '*' | string[] {
  const origins = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.includes('*') ? '*' : origins;
}
