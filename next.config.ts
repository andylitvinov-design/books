import type { NextConfig } from "next";

// Server-side client PDFs must be able to load the published remedy catalogue
// and the approved source JPEGs even in Vercel's traced function filesystem.
const reportPdfAssets = [
  "./assets/fonts/NotoSans-Regular.ttf",
  "./assets/documents/*",
  "./content/remedies/**/*.md",
  "./public/media/remedies/**/*",
];

// MediaRecorder uses getUserMedia() only inside authenticated practitioner
// editors. All public pages and client report readers remain blocked.
const practitionerRecordingSources = [
  "/admin/consultations/:id/edit",
  "/admin/documents/:id",
  "/admin/prescriptions/:id",
  "/admin/clients/:id/assessments/:assessmentId/edit",
  "/admin/clients/:id/sessions/:path*",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The idle Next badge covers fixed mobile navigation in isolated browser CI.
  // This supported option preserves compile/runtime error badges and overlays.
  devIndicators: process.env.CI === "true" &&
    process.env.HH_APP_TEST_RUNTIME === "isolated" &&
    process.env.NODE_ENV === "development" && !process.env.VERCEL
    ? false : undefined,
  poweredByHeader: false,
  // Keep optimization for existing book/media redirect paths.
  // Verified static course photographs and the hot-path portrait opt out locally.
  // Bound the number of public image variants to contain future Vercel
  // transformation usage. Keep Next optimization available for book readers.
  // Already-optimized portraits, courses and posters opt out at call sites.
  images: {
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [32, 64, 96, 160, 256, 384],
    formats: ["image/webp"],
    // Prevent arbitrary quality parameters from multiplying billed variants.
    // The site uses the Next.js default (75) for transformed book covers.
    qualities: [75],
    // This corpus is mostly immutable-by-path book/media assets. Cache resized
    // originals for 31 days instead of regenerating billed MISS/STALE variants
    // every 24 hours. For changed source bytes, change the image URL/path too.
    // User-uploaded master/service photos already bypass Next's optimizer.
    minimumCacheTTL: 2678400,
    remotePatterns: [
    { protocol: "https", hostname: "i.ytimg.com" },
    // The site owns the original course photographs; proxy them same-origin
    // so iOS Safari does not have to hotlink PsiTrends directly.
    { protocol: "https", hostname: "psitrends.com", pathname: "/images/**" },
    { protocol: "https", hostname: "www.psitrends.com", pathname: "/images/**" },
    ],
  },
  async headers() {
    return [
      // Responsive Andy portrait variants include their content hash in the name.
      // Immutable caching saves repeated bytes without Vercel image transforms.
      {
        source: "/images/holistic-house/portrait-static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Build-generated public artwork is content-addressed and never requests
      // paid Vercel /_next/image transformations. Not applied to client files.
      {
        source: "/images/holistic-house/static-card-media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Versioned public video artwork is safe to cache; never apply this policy
      // to HTML, sessions, consultations, prescriptions, API or RSC payloads.
      ...["/images/holistic-house/video-posters/:path*", "/images/holistic-house/testimonial-posters/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // The global policy blocks camera/mic. Last matching rule overrides it
      // only for the practitioner editors that actually offer recording.
      ...practitionerRecordingSources.map((source) => ({
        source,
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      })),
    ];
  },
  async redirects() {
    return [
      // English has one canonical root. Russian is served at its own /ru URL.
      { source: "/en", destination: "/", permanent: true },
      // Old campaign/CTA links should always reach the public tool or cabinet.
      { source: "/:locale(en|ru|es)/cabinet", destination: "/:locale/client", permanent: true },
      { source: "/:locale(en|ru|es)/review", destination: "/:locale/services/free-situation-review", permanent: true },
      { source: "/book", destination: "/books", permanent: true },
      { source: "/book/:bookId", destination: "/books/:bookId", permanent: true },
      { source: "/homeopathy", destination: "/ru/homeopathy", permanent: true },
      { source: "/homeopathy/remedies/:path*", destination: "/ru/homeopathy/remedies/:path*", permanent: true },
    ];
  },
  // Vercel redirects these images to pinned public sources; do not bundle
  // the ~211 MB original corpus into each retained Function deployment.
  outputFileTracingExcludes: {
    // Public-only artwork is served statically, never read by document PDFs.
    "/*": ["./public/images/reiki-originals/**/*", "./public/images/holistic-house/portrait-static/**/*", "./public/images/holistic-house/static-card-media/**/*"],
    "/media/**": [
      "./source-books/book-1-alchemy-soul/media/**/*",
      "./source-books/book-2-dao-books/photos/**/*",
      "./source-books/book-3-maya-tradition/raw/photos/**/*",
    ],
  },
  outputFileTracingIncludes: {
    "/[locale]/client/[selector]/documents/[id]": ["./assets/documents/*"],
    "/api/client/[selector]/documents/[id]/pdf": reportPdfAssets,
    "/[locale]/prescriptions/[selector]": ["./assets/documents/andrii-signature-left-90.png", "./content/remedies/**/*.md"],
    "/admin/documents/[id]": ["./assets/documents/andrii-signature-left-90.png"],
    "/document-preview/[kind]": ["./assets/documents/andrii-signature-left-90.png"],
    // Tracing keys are route globs, not literal Next.js dynamic-segment names.
    // Readers load these existing HTML files dynamically at request time.
    ...["/books/*", "/[locale]/books/*"].map((route) => [route, [
      "./source-books/book-1-alchemy-soul/*.html",
      "./source-books/book-2-dao-books/*.html",
      "./source-books/book-3-maya-tradition/manuscript/*.md",
      "./source-books/book-3-maya-tradition/outputs/*.html",
    ]] as const).reduce<Record<string, string[]>>((all, [route, files]) => {
      all[route] = [...files]; return all;
    }, {}),
    "/[locale]/homeopathy/remedies/[slug]": ["./content/remedies/**/*.md"],
    "/api/prescriptions/[selector]/pdf": reportPdfAssets,
    "/document-preview/[kind]/pdf": reportPdfAssets,
    "/admin/api/documents/[id]/pdf": reportPdfAssets,
    "/admin/api/consultations/preview": reportPdfAssets,
    // The wildcard forms cover Next.js dynamic route globs during tracing.
    "/api/prescriptions/*/pdf": reportPdfAssets,
    "/document-preview/*/pdf": reportPdfAssets,
    "/admin/api/documents/*/pdf": reportPdfAssets,
    "/api/client/*/documents/*/pdf": reportPdfAssets,
  },
};

export default nextConfig;
