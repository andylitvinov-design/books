"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Locale } from "@/data/remedies";
import type { AttunementDirectoryEntry } from "@/data/remedy-attunements";

const copy = {
  ru: { label: "Найти препарат или стих-настройку", placeholder: "Sepia, Сера, Свет внутри…", count: "препаратов со стихами", description: "Описание", poem: "Стих-настройка", empty: "Подтверждённого стиха по этому запросу нет." },
  en: { label: "Find a remedy or poem", placeholder: "Sepia, Sulphur, Свет внутри…", count: "remedies with original poems", description: "Description", poem: "Original poem", empty: "No verified original poem found." },
};
const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function RemedyAttunementsDirectory({ locale, entries }: { locale: Locale; entries: AttunementDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const c = copy[locale];
  const visible = useMemo(() => {
    const needle = normalize(deferred);
    return needle ? entries.filter((entry) => normalize(entry.poemSearchText).includes(needle)) : entries;
  }, [deferred, entries]);
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12" aria-label={c.label}>
      <label htmlFor="poem-directory-search" className="mb-4 block font-semibold text-[#143d3a]">
        {c.label}
        <span className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl border border-[#e9dfd1] bg-white px-4 focus-within:ring-[3px] focus-within:ring-[#176e6e]">
          <Search size={20} aria-hidden="true" className="shrink-0 text-[#5d6a71]" />
          <input id="poem-directory-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={c.placeholder} className="min-w-0 flex-1 bg-transparent py-3 text-base font-normal text-[#143d3a] outline-none" />
        </span>
      </label>
      <p role="status" className="mb-6 text-base text-[#5d6a71]">{visible.length} {c.count}</p>
      {visible.length ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {visible.map((entry) => (
            <li key={entry.slug} className="flex flex-col rounded-3xl border border-[#e9dfd1] bg-[#fffcf7] p-5 shadow-sm sm:p-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#966a1f]">
                {entry.poemCount} {locale === "ru" ? "стих / настройка" : "poem(s)"}
              </p>
              <h2 className="mb-1 text-2xl font-semibold text-[#17334b]">{entry.title}</h2>
              {entry.commonName ? <p className="mb-3 text-base text-[#5d6a71]">{entry.commonName}</p> : null}
              <p className="mb-5 flex-1 text-base leading-relaxed text-[#5d6a71]">{entry.poemTitles.join(" · ")}</p>
              <div className="flex flex-wrap gap-3">
                <Link href={`/${locale}/homeopathy/remedies/${entry.slug}`} className="inline-flex min-h-12 items-center rounded-xl border border-[#067a67] px-4 py-2 font-semibold text-[#067a67] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#176e6e]">{c.description}</Link>
                <Link href={`/${locale}/homeopathy/attunements/${entry.slug}`} className="inline-flex min-h-12 items-center rounded-xl bg-[#067a67] px-4 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#176e6e]">{c.poem}</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="rounded-2xl bg-[#fffcf7] p-6 text-base text-[#5d6a71]">{c.empty}</p>}
    </section>
  );
}
