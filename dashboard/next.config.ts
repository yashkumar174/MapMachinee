import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],

  // SECURITY: HTTP response headers (OWASP best practices).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — only allow this site to frame itself.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers from MIME-sniffing the content-type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control how much referrer info is sent with requests.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Opt out of Google FLoC / Topics tracking.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Force HTTPS for 1 year (only effective once you have SSL).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Basic XSS filter for older browsers.
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
