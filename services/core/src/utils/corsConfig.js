/**
 * CORS origin for Express and Socket.io.
 * - CORS_RELAXED=true: reflect any Origin (dev / demos only — not for production).
 * - FRONTEND_URL: single origin, or comma-separated list (e.g. http://localhost:3000,http://203.0.113.5:3000).
 */
function getCorsOriginOption() {
  if (process.env.CORS_RELAXED === 'true') return true;
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return parts[0] || 'http://localhost:3000';
}

module.exports = { getCorsOriginOption };
