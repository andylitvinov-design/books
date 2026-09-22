import type { Metadata } from "next";
import { BookCatalog } from "@/components/book-catalog";
import { books } from "@/data/library";

export const metadata: Metadata = {
  title: "Библиотека книг — Holistic House",
  description: "Книги, собранные из опубликованных источников: от алхимических и даосских практик до традиции Майя. Поиск по книгам и главам.",
  alternates: { canonical: "/books" },
};

export default function BooksPage() {
  return <BookCatalog books={books} />;
}
