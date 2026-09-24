import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { books, getBookById } from "@/data/library";
import { uiLocaleCookie } from "@/lib/ui-locale";

type PageProps = {
  params: Promise<{ bookId: string }>;
};

export function generateStaticParams() {
  return books.map((book) => ({ bookId: book.id }));
}

export default async function LegacyBookReaderRedirect({ params }: PageProps) {
  const { bookId } = await params;
  if (!getBookById(bookId)) redirect("/books");

  const preference = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = preference === "en" ? "en" : "ru";
  redirect("/" + locale + "/books/" + bookId);
}
