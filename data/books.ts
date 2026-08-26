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

const sourceBooks = booksData as Book[];

// The JSON archive also serves the editorial toolchain and includes source-tree
// labels. A reader should see bibliographic context, never local project paths.
export const books = sourceBooks.map((book) => ({
  ...book,
  sections: book.sections.map((section) =>
    section.id === "source"
      ? {
          ...section,
          title: "Источник",
          description: "Библиографическая запись материала в библиотеке.",
          content: `<p>Исходный материал сохранён в архиве библиотеки.</p><p>Заголовок: «${book.title}».</p>`,
        }
      : {
          ...section,
          content: section.content
            .replace(/<code>source-books[^<]*<\/code>/g, "архиве библиотеки")
            .replace(/Источник расположен локально[^<]*<\/p>/g, "Материал сохранён в архиве библиотеки.</p>")
            .replace(/Книга найдена в локальной папке[^<]*<\/p>/g, "Материал включён в общую библиотеку как самостоятельная книга.</p>"),
        },
  ),
}));

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
