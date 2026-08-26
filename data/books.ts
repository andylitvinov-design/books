import booksData from "@/data/books.json";

export type BookSection = {
  id: string;
  title: string;
  description: string;
  content: string;
};

export type Book = {
  id: string;
  title: string;
  description: string;
  author: string;
  coverLabel: string;
  theme: string;
  coverImage?: string;
  readerUrl?: string;
  summary: string;
  sections: BookSection[];
};

export const books = booksData as Book[];

const coverExtensions: Record<string, string> = {
  "maya-tradition-methodology": ".jpg",
};

export const booksWithPresentation = books.map((book) => ({
  ...book,
  coverImage: book.coverImage ?? `/library/covers/${book.id}${coverExtensions[book.id] ?? ".jpg"}`,
  readerUrl: book.readerUrl ?? (book.id === "maya-tradition-methodology" ? "/library/maya/" : undefined),
}));

export function getBook(bookId?: string) {
  return books.find((book) => book.id === bookId) ?? books[0];
}

export function getSection(book: Book, sectionId?: string) {
  return book.sections.find((section) => section.id === sectionId) ?? book.sections[0];
}
