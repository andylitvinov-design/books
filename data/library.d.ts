export type Chapter = {
  id: string;
  title: string;
};

export type Book = {
  id: string;
  title: string;
  description: string;
  cover: string;
  sourceSeries: string;
  category: string;
  mediaSeries: "alchemy" | "dao" | "maya";
  originalSourceFile: string;
  status: string;
  tags: string[];
  chapters: Chapter[];
};

export const books: Book[];
export function getBookById(bookId: string): Book | undefined;
export function getBooksByCategory(category: string): Book[];
export function searchBooks(query: string): Book[];
