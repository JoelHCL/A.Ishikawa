/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todas las rutas.
const securityHeaders = [
  // Impide que el sitio se incruste en un iframe de otro dominio (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el navegador "adivine" el tipo de archivo (MIME sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No filtrar la URL interna al navegar a sitios externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La app no usa cámara, micrófono ni ubicación: se niegan explícitamente.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Fuerza HTTPS durante 2 años.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Content Security Policy: limita de dónde puede cargarse código.
  // 'unsafe-inline'/'unsafe-eval' son necesarios para el runtime de Next.js.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no anunciar que corre en Next.js
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
