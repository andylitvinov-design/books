import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, MapPin, Search, Sparkles } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import telegramArchive from "@/data/academy/temple-channel-attunements.json";
import { isPublicLocale } from "@/data/academy/catalog";
import { findTempleAttunements, getTempleChannel, normalizeTempleSearch, templeTraditions } from "@/data/temple-attunements.mjs";
import { metadataBaseFor } from "@/data/site-metadata";
import type { TempleAttunement, TempleLocale, TempleTradition } from "@/data/temple-attunements.mjs";
import styles from "./temple-channels.module.css";

type Params = { locale: string };
type Filters = { tradition?: string | string[]; channel?: string | string[]; q?: string | string[]; page?: string | string[] };
type Props = { params: Promise<Params>; searchParams: Promise<Filters> };
const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · АРХИВ ХРАМОВЫХ ТРАДИЦИЙ",
    title: "Храмовые настройки и каналы богов",
    lead: "Выберите традицию, затем божество или канал. У каждой настройки — оригинальный текст и место по авторской записи. Фотографии показываются там, где они подтверждены в источнике.",
    allTraditions: "Все традиции", allChannels: "Все каналы", tradition: "Традиция",
    channel: "Канал / божество", query: "Поиск по названию, стиху или месту",
    placeholder: "Например: Асклепия, Дионис, Приена, Зевса",
    apply: "Показать настройки", clear: "Сбросить фильтры", result: (n: number) => `Найдено настроек: ${n}`,
    emptyTitle: "Подтверждённых настроек пока нет",
    empty: "Канал может присутствовать в каталоге, даже если его оригинальный авторский текст ещё не восстановлен. Мы не подменяем его выдуманным стихотворением.",
    read: "Читать оригинальную настройку", readPractice: "Читать авторское описание настройки", cardLink: "Открыть отдельную карточку", original: "Оригинал на русском языке",
    provenance: "Авторский архив", location: "Место по авторской записи",
    uncertain: "Место указано так, как описано в источнике; историческая география отдельно не подтверждалась.",
    source: "Исходная методичка", archive: "К программе Temple Studies",
    note: "Это авторские символические и поэтические практики, а не исторические античные гимны, медицинская рекомендация или гарантия результата. Стихи оставлены на языке оригинала.",
    libraryNavigation: "Материалы традиции", overviewManual: "Методичка · описание", allManuals: "Все методички", cardArchive: "Карточки · настройки",
    photo: "Снимок из исходной методички", index: "Изучить каналы",
    morePhotos: "Другие фотографии из оригинала", previous: "Назад", next: "Далее", page: "Страница",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · TEMPLE TRADITIONS ARCHIVE",
    title: "Temple attunements & deity channels",
    lead: "Choose a tradition, then a deity or channel. Each recovered author-written attunement has its own card with the original verse, recorded place and a source photograph where verified.",
    allTraditions: "All traditions", allChannels: "All channels", tradition: "Tradition",
    channel: "Channel / deity", query: "Search names, verses and places",
    placeholder: "Try: Asclepius, Dionysus, Priene, Zeus",
    apply: "Show attunements", clear: "Clear filters", result: (n: number) => `Attunements found: ${n}`,
    emptyTitle: "No verified original attunements yet",
    empty: "A channel may exist in the catalogue even when its original author-written text has not been recovered. We do not invent missing verses.",
    read: "Read original attunement", readPractice: "Read original practice description", cardLink: "Open this card", original: "Original text in Russian",
    provenance: "Author's archive", location: "Place as described by the author",
    uncertain: "Place names follow the source record; historical geography is not independently verified.",
    source: "Source manual", archive: "Return to Temple Studies",
    note: "These are contemporary author-written symbolic and poetic practices, not ancient hymns, medical advice or guaranteed effects. Texts remain in the original Russian.",
    libraryNavigation: "Tradition materials", overviewManual: "Manual · overview", allManuals: "All manuals", cardArchive: "Cards · attunements",
    photo: "Photograph from the source manual", index: "Explore channels",
    morePhotos: "More original photographs", previous: "Previous", next: "Next", page: "Page",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ARCHIVO DE TRADICIONES",
    title: "Sintonizaciones del templo y canales de deidades",
    lead: "Elige la tradición y luego una deidad o canal. Cada sintonización tiene una ficha con su texto original, lugar documentado y fotografía cuando está verificada.",
    allTraditions: "Todas las tradiciones", allChannels: "Todos los canales", tradition: "Tradición",
    channel: "Canal / deidad", query: "Buscar nombres, versos y lugares",
    placeholder: "Ej.: Asclepio, Dioniso, Priene, Zeus",
    apply: "Mostrar sintonizaciones", clear: "Borrar filtros", result: (n: number) => `Sintonizaciones: ${n}`,
    emptyTitle: "Todavía no hay textos originales verificados",
    empty: "El canal puede figurar en el catálogo aunque su texto original no se haya recuperado. No se inventan poemas.",
    read: "Leer la sintonización original", readPractice: "Leer la descripción original", cardLink: "Abrir esta ficha", original: "Texto original en ruso",
    provenance: "Archivo del autor", location: "Lugar descrito por el autor",
    uncertain: "Los lugares proceden del texto original y no han sido verificados geográficamente.",
    source: "Manual de origen", archive: "Volver a Temple Studies",
    note: "Son prácticas simbólicas y poéticas contemporáneas, no himnos históricos, consejos médicos ni garantías de resultados. Los textos se conservan en ruso.",
    libraryNavigation: "Materiales de la tradición", overviewManual: "Manual · descripción", allManuals: "Todos los manuales", cardArchive: "Fichas · sintonizaciones",
    photo: "Fotografía del manual original", index: "Explorar canales",
    morePhotos: "Más fotografías originales", previous: "Anterior", next: "Siguiente", page: "Página",
  },
} as const;

const overviewBooksByTradition: Record<string, string> = {
  maya: "maya-egregor-gods",
  egyptian: "egypt-osiris-temple-magic",
  greek: "greek-metaphysics-planning",
  roman: "roman-imperial-temples",
};

function single(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value ?? "").slice(0, 140);
}
function validTradition(id: string) {
  return templeTraditions.find((tradition) => tradition.id === id) ?? null;
}
function channelChoice(tradition: TempleTradition, channelId: string) {
  return tradition.channels.some((channel) => channel.id === channelId);
}

const PAGE_SIZE = 12;
type TelegramRecord = (typeof telegramArchive.attunements)[number];

function asTelegramCard(record: TelegramRecord): TempleAttunement {
  const emptySite = { ru: "", en: "", es: "" };
  return {
    id: record.id, traditionId: record.tradition, channelId: record.channel,
    title: record.title, format: "verse", language: "ru", textRu: record.text,
    place: {
      city: record.place.city,
      site: record.place.site ?? emptySite,
      country: record.place.country,
      note: record.editorialNote ?? null,
      verification: "author-described",
    },
    photos: record.photos.map((photo) => ({
      src: photo.src,
      alt: {
        ru: "Оригинальное архивное фото к настройке " + record.title.ru,
        en: "Original archive photo for " + record.title.en,
        es: "Foto original del archivo: " + record.title.es,
      },
    })),
    source: {
      id: "aata-telegram-" + record.source.messageId,
      title: "AATA · Telegram #" + record.source.messageId,
      type: "telegram-export",
    },
    sortOrder: 5000, visibility: "public",
    photoContext: "Verified original Telegram export image, not a stock substitute.",
  };
}

function matchTelegram(record: TelegramRecord, traditionId: string, channelId: string, query: string) {
  if (traditionId && record.tradition !== traditionId) return false;
  if (channelId && record.channel !== channelId) return false;
  const normalized = normalizeTempleSearch(query).replace(/^канал\s+/, "");
  if (!normalized) return true;
  const tradition = validTradition(record.tradition);
  const channel = getTempleChannel(record.tradition, record.channel);
  return normalizeTempleSearch([
    record.id, record.text, ...Object.values(record.title),
    ...Object.values(record.place.city), ...Object.values(record.place.country),
    ...Object.values(record.place.site ?? {}),
    ...Object.values(tradition?.name ?? {}),
    ...Object.values(channel?.name ?? {}), ...(channel?.aliases ?? []),
  ].join(" ")).includes(normalized);
}

function archivePageHref(locale: TempleLocale, traditionId: string, channelId: string, query: string, page: number) {
  const params = new URLSearchParams();
  if (traditionId) params.set("tradition", traditionId);
  if (channelId) params.set("channel", traditionId + ":" + channelId);
  if (query) params.set("q", query);
  params.set("page", String(page));
  return "/" + locale + "/temple-channels?" + params.toString();
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
  const guideBookId = overviewBooksByTradition[traditionId] ?? null;
  const query = single(input.q).trim();
  const legacy = telegramArchive.attunements
    .filter((record) => matchTelegram(record, traditionId, channelId, query))
    .map(asTelegramCard);
  const matching = [...findTempleAttunements({ traditionId, channelId, query }), ...legacy];
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(single(input.page), 10);
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;
  const shown = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
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
        <nav className={styles.librarySwitch} aria-label={t.libraryNavigation}>
          <span className={styles.librarySwitchLabel}>{t.libraryNavigation}</span>
          <Link className={styles.librarySwitchLink} prefetch={false} href={guideBookId ? `/${language}/books/${guideBookId}` : `/${language}/books`}>
            <BookOpenText size={17} aria-hidden="true" /> {guideBookId ? t.overviewManual : t.allManuals}
          </Link>
          <span className={styles.librarySwitchCurrent} aria-current="page"><Sparkles size={16} aria-hidden="true" /> {t.cardArchive}</span>
        </nav>
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
              {shown.map((entry) => (
                <article className={styles.card} key={entry.id} id={entry.id}>
                  {entry.photos.length > 0 ? (
                    <figure className={styles.photo}>
                      <Image src={entry.photos[0].src} alt={entry.photos[0].alt[language]} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1120px) 50vw, 340px" />
                      <figcaption>{t.photo}</figcaption>
                    </figure>
                  ) : <div className={styles.noPhoto} aria-hidden="true"><BookOpenText size={48} strokeWidth={1.2} /></div>}
                  <div className={styles.cardBody}>
                    <p className={styles.meta}>{templeTraditions.find((item) => item.id === entry.traditionId)?.name[language]} · {getTempleChannel(entry.traditionId, entry.channelId)?.name[language]}</p>
                    <h3>{entry.title[language]}</h3>
                    <Link className={styles.cardPermalink} prefetch={false} href={`${archivePageHref(language, entry.traditionId, entry.channelId, entry.id, 1)}#${entry.id}`}>{t.cardLink}</Link>
                    <p className={styles.place}><MapPin size={16} aria-hidden="true" />
                      <span>{[entry.place.city[language], entry.place.site[language], entry.place.country[language]].filter(Boolean).join(" · ")}</span>
                    </p>
                    {entry.place.note ? <p className={styles.provenanceNote}>{entry.place.note[language]}</p> : null}
                    <details className={styles.poem} open={query === entry.id}>
                      <summary>{entry.format === "verse" ? t.read : t.readPractice}</summary>
                      <div>
                        <p className={styles.original}>{t.original}</p>
                        <blockquote lang="ru">{entry.textRu}</blockquote>
                        <p className={styles.source}>{t.source}: {entry.source.title} · {t.provenance}</p>
                        {entry.photos.length > 1 ? (
                          <details className={styles.morePhotos}>
                            <summary>{t.morePhotos} ({entry.photos.length - 1})</summary>
                            <div className={styles.gallery}>
                              {entry.photos.slice(1).map((photo) => (
                                <Image key={photo.src} src={photo.src} width={450} height={300} unoptimized alt={photo.alt[language]} />
                              ))}
                            </div>
                          </details>
                        ) : null}
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
          {matching.length > PAGE_SIZE ? (
            <nav className={styles.pagination} aria-label={t.page}>
              {page > 1 ? <Link href={archivePageHref(language, traditionId, channelId, query, page - 1)} prefetch={false}>{t.previous}</Link> : <span />}
              <span aria-current="page">{t.page} {page} / {totalPages}</span>
              {page < totalPages ? <Link href={archivePageHref(language, traditionId, channelId, query, page + 1)} prefetch={false}>{t.next}</Link> : <span />}
            </nav>
          ) : null}
        </section>
        <footer className={styles.footer}><p>{t.uncertain}</p><p>{t.note}</p></footer>
      </div>
    </main>
  );
}
