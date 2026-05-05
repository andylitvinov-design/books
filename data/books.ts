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
  summary: string;
  sections: BookSection[];
};

export const books = booksData as Book[];

export function getBook(bookId?: string) {
  return books.find((book) => book.id === bookId) ?? books[0];
}

export function getSection(book: Book, sectionId?: string) {
  return book.sections.find((section) => section.id === sectionId) ?? book.sections[0];
}
