"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BookOpenText, MapPin, Search, SlidersHorizontal } from "lucide-react";

import manifest from "@/data/academy/temple-channel-attunements.json";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./temple-channel-library.module.css";

type Label = Record<PublicLocale, string>;

const copy: Record<PublicLocale, {
  eyebrow: string; title: string; intro: string; tradition: string; channel: string;
  allTraditions: string; allChannels: string; search: string; result: (count: number) => string;
  open: string; photos: string; original: string; source: string; published: string;
  location: string; unavailable: string; clear: string; note: string; photoAlt: string;
  placeType: Record<string, string>;
}> = {
  ru: {
    eyebrow: "Храмовые традиции · авторский архив", title: "Настройки на каналы древних традиций",
    intro: "Выберите традицию и божество. Для одного канала могут быть разные настройки, созданные у разных храмов и в разных городах.",
    tradition: "Традиция", channel: "Канал / божество", allTraditions: "Все традиции", allChannels: "Все каналы",
    search: "Поиск по названию, месту или тексту", result: (n) => "Найдено настроек: " + n,
    open: "Читать настройку", photos: "Другие фотографии из публикации", original: "Текст сохранён на русском языке без переработки",
    source: "Архив ААТА · сообщение", published: "Опубликовано", location: "Место настройки",
    unavailable: "Для выбранного сочетания пока нет опубликованных авторских настроек. Категория уже предусмотрена для пополнения.",
    clear: "Сбросить фильтры",
    note: "Это современные авторские тексты для символической практики, а не исторические гимны или обещание результата.",
    photoAlt: "Фотография из исходной публикации о настройке", placeType: {
      temple: "Храм", museum: "Музей", archaeological_site: "Археологический памятник", city: "Город",
    },
  },
  en: {
    eyebrow: "Temple traditions · author's archive", title: "Attunements to ancient tradition channels",
    intro: "Choose a tradition and deity. One channel may have several original attunements from different temples and cities.",
    tradition: "Tradition", channel: "Channel / deity", allTraditions: "All traditions", allChannels: "All channels",
    search: "Search by name, location or text", result: (n) => "Attunements found: " + n,
    open: "Read attunement", photos: "More photos from the original post", original: "Original Russian text, preserved without rewriting",
    source: "AATA archive · message", published: "Published", location: "Location",
    unavailable: "No verified author-original attunements are published for this selection yet. This category is ready for future additions.",
    clear: "Clear filters",
    note: "These are contemporary author-created texts for symbolic practice, not historical hymns or guaranteed outcomes.",
    photoAlt: "Photograph from the original attunement post", placeType: {
      temple: "Temple", museum: "Museum", archaeological_site: "Archaeological site", city: "City",
    },
  },
  es: {
    eyebrow: "Tradiciones de templos · archivo del autor", title: "Sintonizaciones con canales de tradiciones antiguas",
    intro: "Elige una tradición y una deidad. Un canal puede tener varias sintonizaciones originales de distintos templos y ciudades.",
    tradition: "Tradición", channel: "Canal / deidad", allTraditions: "Todas las tradiciones", allChannels: "Todos los canales",
    search: "Buscar por nombre, lugar o texto", result: (n) => "Sintonizaciones encontradas: " + n,
    open: "Leer sintonización", photos: "Más fotos de la publicación original", original: "Texto original ruso conservado sin reescritura",
    source: "Archivo AATA · mensaje", published: "Publicado", location: "Lugar",
    unavailable: "Todavía no hay sintonizaciones originales verificadas para esta selección. La categoría está lista para ampliarse.",
    clear: "Borrar filtros",
    note: "Son textos contemporáneos del autor para la práctica simbólica, no himnos históricos ni garantías de resultados.",
    photoAlt: "Foto de la publicación original de la sintonización", placeType: {
      temple: "Templo", museum: "Museo", archaeological_site: "Sitio arqueológico", city: "Ciudad",
    },
  },
};

const normalize = (value: string) => value
  .normalize("NFKD")
  .toLocaleLowerCase()
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/ё/g, "е")
  .replace(/[^a-zа-я0-9]+/gi, " ")
  .trim();

function allLabels(label: Label) {
  return Object.values(label).join(" ");
}

export function TempleChannelLibrary({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [tradition, setTradition] = useState("all");
  const [channel, setChannel] = useState("all");
  const [query, setQuery] = useState("");

  const channelOptions = useMemo(
    () => manifest.channels.filter((item) => tradition === "all" || item.tradition === tradition),
    [tradition],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return manifest.attunements
      .filter((item) => tradition === "all" || item.tradition === tradition)
      .filter((item) => channel === "all" || item.channel === channel)
      .filter((item) => {
        if (!q) return true;
        const deity = manifest.channels.find((entry) => entry.tradition === item.tradition && entry.id === item.channel);
        const traditionName = manifest.traditions.find((entry) => entry.id === item.tradition);
        const searchText = [
          item.text, item.id, item.source.messageId.toString(), allLabels(item.title),
          allLabels(item.place.city), item.place.site ? allLabels(item.place.site) : "",
          allLabels(item.place.country), deity ? allLabels(deity.name) : "",
          ...(deity?.aliases ?? []), traditionName ? allLabels(traditionName.name) : "",
        ].join(" ");
        return normalize(searchText).includes(q);
      })
      .sort((a, b) => b.source.publishedAt.localeCompare(a.source.publishedAt) || a.id.localeCompare(b.id));
  }, [tradition, channel, query]);

  return (
    <section className={styles.section} id="temple-attunements" aria-labelledby="temple-attunements-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}><BookOpenText size={18} aria-hidden="true" /> {t.eyebrow}</p>
        <h2 id="temple-attunements-title">{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </div>

      <div className={styles.filterPanel} role="search" aria-label={t.title}>
        <div className={styles.filterHead}><SlidersHorizontal size={19} aria-hidden="true" /> {t.tradition} · {t.channel}</div>
        <div className={styles.filters}>
          <label className={styles.field}>
            <span>{t.tradition}</span>
            <select value={tradition} onChange={(event) => { setTradition(event.target.value); setChannel("all"); }}>
              <option value="all">{t.allTraditions}</option>
              {manifest.traditions.map((item) => <option value={item.id} key={item.id}>{item.name[locale]}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>{t.channel}</span>
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              <option value="all">{t.allChannels}</option>
              {channelOptions.map((item) => (
                <option value={item.id} key={item.tradition + "-" + item.id}>
                  {item.name[locale]}{tradition === "all" ? " · " + manifest.traditions.find((entry) => entry.id === item.tradition)?.name[locale] : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span><Search size={15} aria-hidden="true" /> {t.search}</span>
            <input type="search" placeholder={t.search} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className={styles.filterFooter}>
          <span role="status" aria-live="polite">{t.result(visible.length)}</span>
          {(query || tradition !== "all" || channel !== "all") && (
            <button className={styles.reset} type="button" onClick={() => { setTradition("all"); setChannel("all"); setQuery(""); }}>
              {t.clear}
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty} role="status">{t.unavailable}</div>
      ) : (
        <div className={styles.grid}>
          {visible.map((item) => {
            const deity = manifest.channels.find((entry) => entry.tradition === item.tradition && entry.id === item.channel);
            const site = item.place.site?.[locale];
            const place = [site, item.place.city[locale], item.place.country[locale]]
              .filter(Boolean)
              .join(" · ");
            const date = new Intl.DateTimeFormat(
              locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-US",
              { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
            ).format(new Date(item.source.publishedAt + "T12:00:00Z"));
            return (
              <article className={styles.card} key={item.id} id={item.id}>
                <div className={styles.cover}>
                  <Image
                    src={item.photos[0].src}
                    alt={t.photoAlt + ": " + item.title[locale]}
                    width={900} height={620}
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  />
                  <span className={styles.coverTag}>{deity?.name[locale] || item.channel}</span>
                </div>
                <div className={styles.content}>
                  <h3>{item.title[locale]}</h3>
                  <p className={styles.place}><MapPin size={17} aria-hidden="true" />
                    <span><strong>{t.location}:</strong> {place}</span>
                  </p>
                  <div className={styles.meta}>
                    <span>{t.published}: <time dateTime={item.source.publishedAt}>{date}</time></span>
                    <span>{t.source} #{item.source.messageId}</span>
                  </div>
                  <details className={styles.textDetails}>
                    <summary>{t.open}</summary>
                    <p className={styles.original}>{t.original}</p>
                    <div className={styles.poem} lang="ru">{item.text}</div>
                    {item.editorialNote && <p className={styles.editorial}>{item.editorialNote[locale]}</p>}
                    {item.photos.length > 1 && (
                      <details className={styles.photoDetails}>
                        <summary>{t.photos} ({item.photos.length})</summary>
                        <div className={styles.gallery}>
                          {item.photos.map((photo) => (
                            <Image key={photo.src} src={photo.src} alt={t.photoAlt + ": " + item.title[locale]}
                              width={600} height={480} sizes="(max-width: 640px) 90vw, 300px" unoptimized />
                          ))}
                        </div>
                      </details>
                    )}
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className={styles.disclaimer}>{t.note}</p>
    </section>
  );
}
