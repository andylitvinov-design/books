import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, MapPin, Search, Sparkles } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { findTempleAttunements, getTempleChannel, normalizeTempleSearch, templeTraditions } from "@/data/temple-attunements.mjs";
import { metadataBaseFor } from "@/data/site-metadata";
import type { TempleLocale, TempleTradition } from "@/data/temple-attunements.mjs";
import styles from "./temple-channels.module.css";

type Params = { locale: string };
type Filters = { tradition?: string | string[]; channel?: string | string[]; q?: string | string[] };
type Props = { params: Promise<Params>; searchParams: Promise<Filters> };
const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · АРХИВ ХРАМОВЫХ ТРАДИЦИЙ",
    title: "Храмовые настройки и каналы богов",
    lead: "Выберите традицию, затем божество или канал. Каждая авторская настройка хранится отдельной карточкой — со стихом, фотографией из источника и местом записи.",
    allTraditions: "Все традиции", allChannels: "Все каналы", tradition: "Традиция",
    channel: "Канал / божество", query: "Поиск по названию, стиху или месту",
    placeholder: "Например: Асклепия, Дионис, Приена, Зевса",
    apply: "Показать настройки", clear: "Сбросить фильтры", result: (n: number) => `Найдено настроек: ${n}`,
    emptyTitle: "Подтверждённых настроек пока нет",
    empty: "Канал может присутствовать в каталоге, даже если его оригинальный авторский текст ещё не восстановлен. Мы не подменяем его выдуманным стихотворением.",
    read: "Читать оригинальную настройку", original: "Оригинал на русском языке",
    provenance: "Авторский архив", location: "Место по авторской записи",
    uncertain: "Место указано так, как описано в источнике; историческая география отдельно не подтверждалась.",
    source: "Исходная методичка", archive: "К программе Temple Studies",
    note: "Это авторские символические и поэтические практики, а не исторические античные гимны, медицинская рекомендация или гарантия результата. Стихи оставлены на языке оригинала.",
    photo: "Снимок из исходной методички", index: "Изучить каналы",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · TEMPLE TRADITIONS ARCHIVE",
    title: "Temple attunements & deity channels",
    lead: "Choose a tradition, then a deity or channel. Each recovered author-written attunement has its own card with the original verse, source photograph and recorded place.",
    allTraditions: "All traditions", allChannels: "All channels", tradition: "Tradition",
    channel: "Channel / deity", query: "Search names, verses and places",
    placeholder: "Try: Asclepius, Dionysus, Priene, Zeus",
    apply: "Show attunements", clear: "Clear filters", result: (n: number) => `Attunements found: ${n}`,
    emptyTitle: "No verified original attunements yet",
    empty: "A channel may exist in the catalogue even when its original author-written text has not been recovered. We do not invent missing verses.",
    read: "Read original attunement", original: "Original text in Russian",
    provenance: "Author's archive", location: "Place as described by the author",
    uncertain: "Place names follow the source record; historical geography is not independently verified.",
    source: "Source manual", archive: "Return to Temple Studies",
    note: "These are contemporary author-written symbolic and poetic practices, not ancient hymns, medical advice or guaranteed effects. Texts remain in the original Russian.",
    photo: "Photograph from the source manual", index: "Explore channels",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ARCHIVO DE TRADICIONES",
    title: "Sintonizaciones del templo y canales de deidades",
    lead: "Elige la tradición y luego una deidad o canal. Cada sintonización recuperada tiene una ficha con su poema original, fotografía y lugar descrito por el autor.",
    allTraditions: "Todas las tradiciones", allChannels: "Todos los canales", tradition: "Tradición",
    channel: "Canal / deidad", query: "Buscar nombres, versos y lugares",
    placeholder: "Ej.: Asclepio, Dioniso, Priene, Zeus",
    apply: "Mostrar sintonizaciones", clear: "Borrar filtros", result: (n: number) => `Sintonizaciones: ${n}`,
    emptyTitle: "Todavía no hay textos originales verificados",
    empty: "El canal puede figurar en el catálogo aunque su texto original no se haya recuperado. No se inventan poemas.",
    read: "Leer la sintonización original", original: "Texto original en ruso",
    provenance: "Archivo del autor", location: "Lugar descrito por el autor",
    uncertain: "Los lugares proceden del texto original y no han sido verificados geográficamente.",
    source: "Manual de origen", archive: "Volver a Temple Studies",
    note: "Son prácticas simbólicas y poéticas contemporáneas, no himnos históricos, consejos médicos ni garantías de resultados. Los textos se conservan en ruso.",
    photo: "Fotografía del manual original", index: "Explorar canales",
  },
} as const;

function single(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value ?? "").slice(0, 140);
}
function validTradition(id: string) {
  return templeTraditions.find((tradition) => tradition.id === id) ?? null;
}
function channelChoice(tradition: TempleTradition, channelId: string) {
  return tradition.channels.some((channel) => channel.id === channelId);
}
export function generateStaticParams() {
  return [{ locale: "ru" }, { locale: "en" }, { locale: "es" }];
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale as TempleLocale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " | Holistic House",
    description: t.lead,
    alternates: {
      canonical: "/" + locale + "/temple-channels",
      languages: { ru: "/ru/temple-channels", en: "/en/temple-channels", es: "/es/temple-channels", "x-default": "/en/temple-channels" },
    },
  };
}

export default async function TempleChannelsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const language = locale as TempleLocale;
  const t = copy[language];
  const input = await searchParams;
  const selectedTradition = validTradition(single(input.tradition));
  const rawChannel = single(input.channel);
  const selectedChannel = rawChannel.includes(":") ? rawChannel.split(":", 2) : [];
  const channelTradition = validTradition(selectedChannel[0] ?? "");
  const validChannel = Boolean(channelTradition && channelChoice(channelTradition, selectedChannel[1] ?? "") &&
    (!selectedTradition || channelTradition.id === selectedTradition.id));
  const traditionId = selectedTradition?.id ?? (validChannel ? channelTradition?.id ?? "" : "");
  const channelId = validChannel ? selectedChannel[1] : "";
  const query = single(input.q).trim();
  const matching = findTempleAttunements({ traditionId, channelId, query });
  const activeChannel = channelId ? getTempleChannel(traditionId, channelId) : null;
  const normalizedQuery = normalizeTempleSearch(query).replace(/^канал\s+/, "");
  const matchesNamedChannel = query && !matching.length ? templeTraditions.flatMap((tradition) =>
    tradition.channels.filter((channel) => {
      if (traditionId && tradition.id !== traditionId) return false;
      const haystack = normalizeTempleSearch([...Object.values(channel.name), ...channel.aliases].join(" "));
      return normalizedQuery && haystack.includes(normalizedQuery);
    }).map((channel) => ({ tradition, channel }))
  ).slice(0, 8) : [];

  return (
    <main className={styles.page} lang={language} data-temple-channel-library>
      <PublicSiteHeader locale={language} />
      <div className={styles.shell}>
        <Link href={`/${language}/academy/temple-studies`} className={styles.back} prefetch={false}>
          <ArrowLeft size={17} aria-hidden="true" />{t.archive}
        </Link>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" /> {t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p>{t.lead}</p>
          </div>
          <span className={styles.heroSymbol} aria-hidden="true">✦</span>
        </header>
        <form method="get" action={`/${language}/temple-channels`} className={styles.filters} role="search">
          <label htmlFor="temple-tradition">{t.tradition}
            <select name="tradition" id="temple-tradition" defaultValue={selectedTradition?.id ?? ""}>
              <option value="">{t.allTraditions}</option>
              {templeTraditions.map((tradition) => <option key={tradition.id} value={tradition.id}>{tradition.name[language]}</option>)}
            </select>
          </label>
          <label htmlFor="temple-channel">{t.channel}
            <select name="channel" id="temple-channel" defaultValue={validChannel ? rawChannel : ""}>
              <option value="">{t.allChannels}</option>
              {templeTraditions.map((tradition) => (
                <optgroup key={tradition.id} label={tradition.name[language]}>
                  {tradition.channels.map((channel) => <option key={channel.id} value={tradition.id + ":" + channel.id}>{channel.name[language]}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label htmlFor="temple-search">{t.query}
            <span className={styles.searchInput}><Search size={19} aria-hidden="true" />
              <input id="temple-search" name="q" type="search" defaultValue={query} placeholder={t.placeholder} maxLength={140} autoComplete="off" />
            </span>
          </label>
          <div className={styles.actions}>
            <button className={styles.submit} type="submit">{t.apply}</button>
            <Link href={`/${language}/temple-channels`} className={styles.clear}>{t.clear}</Link>
          </div>
        </form>
        <section className={styles.results} aria-label={t.index}>
          <div className={styles.resultTop}>
            <h2>{activeChannel ? activeChannel.name[language] : selectedTradition ? selectedTradition.name[language] : t.index}</h2>
            <p role="status">{t.result(matching.length)}</p>
          </div>
          {matching.length ? (
            <div className={styles.grid}>
              {matching.map((entry) => (
                <article className={styles.card} key={entry.id} id={entry.id}>
                  {entry.photos.length > 0 ? (
                    <figure className={styles.photo}>
                      <Image src={entry.photos[0].src} alt={entry.photos[0].alt[language]} fill sizes="(max-width: 700px) 100vw, (max-width: 1120px) 50vw, 340px" />
                      <figcaption>{t.photo}</figcaption>
                    </figure>
                  ) : <div className={styles.noPhoto} aria-hidden="true"><BookOpenText size={48} strokeWidth={1.2} /></div>}
                  <div className={styles.cardBody}>
                    <p className={styles.meta}>{templeTraditions.find((item) => item.id === entry.traditionId)?.name[language]} · {getTempleChannel(entry.traditionId, entry.channelId)?.name[language]}</p>
                    <h3>{entry.title[language]}</h3>
                    <p className={styles.place}><MapPin size={16} aria-hidden="true" />
                      <span>{[entry.place.city[language], entry.place.site[language], entry.place.country[language]].filter(Boolean).join(" · ")}</span>
                    </p>
                    {entry.place.note ? <p className={styles.provenanceNote}>{entry.place.note[language]}</p> : null}
                    <details className={styles.poem}>
                      <summary>{t.read}</summary>
                      <div>
                        <p className={styles.original}>{t.original}</p>
                        <blockquote lang="ru">{entry.textRu}</blockquote>
                        <p className={styles.source}>{t.source}: {entry.source.title} · {t.provenance}</p>
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <BookOpenText size={32} aria-hidden="true" />
              <h3>{t.emptyTitle}{activeChannel ? ": " + activeChannel.name[language] : ""}</h3>
              <p>{t.empty}</p>
              {matchesNamedChannel.length > 0 ? (
                <div className={styles.matches}>
                  {matchesNamedChannel.map(({ tradition, channel }) => (
                    <Link key={tradition.id + channel.id} href={`/${language}/temple-channels?tradition=${tradition.id}&channel=${tradition.id}%3A${channel.id}`}>
                      {tradition.name[language]} · {channel.name[language]}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>
        <footer className={styles.footer}><p>{t.uncertain}</p><p>{t.note}</p></footer>
      </div>
    </main>
  );
}
