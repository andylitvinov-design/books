import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
