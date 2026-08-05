/** @type {import('next').NextConfig} */

/**
 * Security headers.
 *
 * Absent on a public deployment these are indefensible, and they cost nothing but
 * configuration. The CSP is deliberately explicit about what it allows and why:
 * Next's hydration and React Three Fiber both need inline/eval capability in
 * development, and the connect-src opening is for the Open-Meteo calibration call.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required by Next's hydration script; 'unsafe-eval'
      // only in development for React Refresh.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Open-Meteo for the irradiance calibration; Groq only when a key is set.
      "connect-src 'self' https://archive-api.open-meteo.com https://api.groq.com",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
