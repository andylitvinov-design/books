import { notFound, permanentRedirect } from "next/navigation";
import { getBookById } from "@/data/library";

type PageProps = { params: Promise<{ bookId: string }>; searchParams: Promise<{ lang?: string | string[] }> };

// Middleware serves a real 301 on GET/HEAD; this is the safe server fallback.
export default async function LegacyBookRedirect({ params, searchParams }: PageProps) {
  const { bookId } = await params;
  if (!getBookById(bookId)) notFound();
  const { lang } = await searchParams;
  const locale = lang === "ru" || lang === "es" ? lang : "en";
  permanentRedirect(`/${locale}/books/${bookId}`);
}
