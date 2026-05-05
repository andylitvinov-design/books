"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Link2, Search } from "lucide-react";

import { books, getBook, getSection } from "@/data/books";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const ACTIVE_BOOK_KEY = "books-catalog:active-book";
const ACTIVE_SECTION_KEY = "books-catalog:active-section";

export function BookCatalog() {
  const initialBook = books[0];
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [activeBookId, setActiveBookId] = useState(initialBook.id);
  const [activeSectionId, setActiveSectionId] = useState(initialBook.sections[0]?.id ?? "");
  const [ready, setReady] = useState(false);
  const detailRef = useRef<HTMLElement | null>(null);

  const filteredBooks = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    if (!value) return books;

    return books.filter((book) =>
      `${book.title} ${book.description} ${book.summary} ${book.author} ${book.sections
        .map((section) => `${section.title} ${section.description} ${section.content}`)
        .join(" ")}`
        .toLowerCase()
        .includes(value),
    );
  }, [deferredQuery]);

  const activeBook = getBook(activeBookId);
  const activeSection = getSection(activeBook, activeSectionId);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const [hashBookId, hashSectionId] = hash.split(":");
    const storedBookId = window.localStorage.getItem(ACTIVE_BOOK_KEY) ?? undefined;
    const storedSectionId = window.localStorage.getItem(ACTIVE_SECTION_KEY) ?? undefined;
    const nextBook = getBook(hashBookId || storedBookId);
    const nextSection = getSection(nextBook, hashSectionId || storedSectionId);

    setActiveBookId(nextBook.id);
    setActiveSectionId(nextSection.id);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(ACTIVE_BOOK_KEY, activeBookId);
    window.localStorage.setItem(ACTIVE_SECTION_KEY, activeSectionId);
    window.history.replaceState(null, "", `#${activeBookId}:${activeSectionId}`);
  }, [activeBookId, activeSectionId, ready]);

  const selectBook = (bookId: string) => {
    const nextBook = getBook(bookId);
    startTransition(() => {
      setActiveBookId(nextBook.id);
      setActiveSectionId(nextBook.sections[0]?.id ?? "");
    });

    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const selectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const target = document.getElementById(`${activeBook.id}-${sectionId}`);
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-9 sm:px-6">
      <section className="rounded-[28px] bg-[linear-gradient(135deg,rgba(116,66,29,0.94),rgba(156,89,37,0.88))] px-7 py-8 text-[#fff7ee] shadow-[0_18px_42px_rgba(77,49,26,0.12)] sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[820px]">
            <div className="text-[12px] uppercase tracking-[0.12em] text-[#f8d9bd]">Books</div>
            <h1 className="mt-3 text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">
              Каталог книг
            </h1>
            <p className="mt-3 max-w-[820px] leading-7 text-[rgba(255,247,238,0.92)]">
              Стиль страницы взят из даосского каталога: теплая бумажная палитра, крупные карточки книг и
              спокойная читательская подача. Внутри только ваши реальные книги из раздела Books.
            </p>
          </div>

          <div className="w-full max-w-[340px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#d8b79b]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по книгам"
                className="h-11 rounded-2xl border-[#c08a5b]/30 bg-[rgba(255,252,246,0.16)] pl-10 text-[#fff7ee] placeholder:text-[#efd7c2] focus-visible:ring-[#f2c49e]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Книги">
        {filteredBooks.map((book, index) => {
          const selected = book.id === activeBook.id;

          return (
            <button
              key={book.id}
              type="button"
              onClick={() => selectBook(book.id)}
              className={cn(
                "overflow-hidden rounded-[22px] border bg-[rgba(255,252,246,0.96)] text-left text-inherit shadow-[0_18px_42px_rgba(77,49,26,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-[#cba27a] hover:shadow-[0_22px_46px_rgba(77,49,26,0.16)]",
                selected ? "border-[#cba27a]" : "border-[#d9c7b0]",
              )}
            >
              <div className={cn("aspect-[4/3] w-full border-b border-[#d9c7b0] bg-gradient-to-br", book.theme)}>
                <div className="flex h-full flex-col justify-between p-5">
                  <div className="flex size-14 items-center justify-center rounded-[18px] border border-[rgba(116,66,29,0.12)] bg-[rgba(255,252,246,0.72)] text-lg font-semibold text-[#5f3720]">
                    {book.coverLabel}
                  </div>
                  <div className="max-w-[85%]">
                    <div className="text-[12px] uppercase tracking-[0.08em] text-[#c97d3a]">Книга {index + 1}</div>
                    <div className="mt-2 text-xl font-semibold leading-[1.15] text-[#241b16]">{book.title}</div>
                  </div>
                </div>
              </div>

              <div className="p-[18px_18px_20px]">
                <p className="mb-2 text-sm text-[#6d5d51]">{book.author}</p>
                <p className="line-clamp-3 text-[15px] leading-[1.58] text-[#382d26]">{book.description}</p>
              </div>
            </button>
          );
        })}
      </section>

      <section
        ref={detailRef}
        className="mt-9 rounded-[22px] border border-[#d9c7b0] bg-[#fbf7f0] p-6 shadow-[0_18px_42px_rgba(77,49,26,0.12)] sm:p-7"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="text-[12px] uppercase tracking-[0.08em] text-[#c97d3a]">{activeBook.author}</div>
            <h2 className="mt-3 text-[clamp(30px,3vw,42px)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#241b16]">
              {activeBook.title}
            </h2>
            <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[#6d5d51]">{activeBook.summary}</p>

            <div className="mt-8 space-y-5">
              {activeBook.sections.map((section, index) => {
                const selected = section.id === activeSection.id;

                return (
                  <article
                    key={section.id}
                    id={`${activeBook.id}-${section.id}`}
                    className={cn(
                      "rounded-[22px] border bg-[rgba(255,252,246,0.92)] p-5 sm:p-6",
                      selected ? "border-[#cba27a]" : "border-[#d9c7b0]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.08em] text-[#c97d3a]">Раздел {index + 1}</div>
                        <h3 className="mt-2 text-[24px] font-semibold leading-[1.2] text-[#241b16]">
                          {section.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#6d5d51]">{section.description}</p>
                      </div>
                      <a
                        href={`#${activeBook.id}:${section.id}`}
                        onClick={() => setActiveSectionId(section.id)}
                        className="inline-flex size-10 items-center justify-center rounded-2xl border border-[#d9c7b0] bg-white text-[#8b4513]"
                        aria-label={`Ссылка на раздел ${section.title}`}
                      >
                        <Link2 className="size-4" />
                      </a>
                    </div>

                    <div
                      className="reader-content mt-5"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[22px] border border-[#d9c7b0] bg-[rgba(255,252,246,0.96)] p-5 shadow-[0_18px_42px_rgba(77,49,26,0.08)]">
              <div className="text-[12px] uppercase tracking-[0.08em] text-[#c97d3a]">О книге</div>
              <p className="mt-3 text-[15px] leading-7 text-[#382d26]">{activeBook.description}</p>
            </div>

            <div className="rounded-[22px] border border-[#d9c7b0] bg-[rgba(255,252,246,0.96)] p-5 shadow-[0_18px_42px_rgba(77,49,26,0.08)]">
              <div className="text-[12px] uppercase tracking-[0.08em] text-[#c97d3a]">Разделы</div>
              <div className="mt-4 space-y-2">
                {activeBook.sections.map((section, index) => {
                  const selected = section.id === activeSection.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => selectSection(section.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left transition",
                        selected ? "bg-[#8b4513] text-[#fff7ee]" : "bg-white text-[#241b16] hover:bg-[#f5ede2]",
                      )}
                    >
                      <div className="min-w-0">
                        <div className={cn("text-[11px] uppercase tracking-[0.08em]", selected ? "text-[#f5cfad]" : "text-[#c97d3a]")}>
                          Раздел {index + 1}
                        </div>
                        <div className="mt-1 truncate text-sm font-medium">{section.title}</div>
                      </div>
                      <BookOpen className="size-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
