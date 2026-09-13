import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/books/[bookId]": [
      "./source-books/book-1-alchemy-soul/*.html",
      "./source-books/book-2-dao-books/*.html",
      "./source-books/book-3-maya-tradition/manuscript/*.md",
    ],
    "/media/[series]/[file]": [
      "./source-books/book-1-alchemy-soul/media/**/*",
      "./source-books/book-2-dao-books/photos/**/*",
      "./source-books/book-3-maya-tradition/raw/photos/**/*",
    ],
    "/[locale]/homeopathy/remedies/[slug]": ["./content/remedies/**/*.md"],
    "/api/prescriptions/[selector]/pdf": ["./assets/fonts/NotoSans-Regular.ttf", "./assets/documents/*"],
    "/document-preview/[kind]/pdf": ["./assets/fonts/NotoSans-Regular.ttf", "./assets/documents/*"],
    "/admin/api/documents/[id]/pdf": ["./assets/fonts/NotoSans-Regular.ttf", "./assets/documents/*"],
  },
};

export default nextConfig;
