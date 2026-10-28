"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, SlidersHorizontal } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { CatalogStarRating, StarFilter, matchesStarFilter, sortByStars, useCatalogRatings } from "@/components/catalog-star-rating";
import facetsData from "@/data/academy/meditation-filter-facets-20261028.json";
import { rankMeditationCatalog } from "@/lib/holistic-support/meditation-catalog-ranker.mjs";
import type {
  MeditationCatalogRecord, MeditationMatch, MeditationRequest,
} from "@/lib/holistic-support/meditation-catalog-types";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-meditation-finder.module.css";

const GOALS = ["money", "energy", "relationships", "goals", "meaning"] as const;
type Goal = (typeof GOALS)[number];
type FilterKind = "situation" | "outcome" | "technique";
type VideoLanguage = "en" | "ru" | "es";

const copy = {
  en: {
    title: "Choose a meditation for your situation",
    intro: "Select your goal and preferences. Matching happens on this device only.",
    goals: { money: "Money", energy: "Energy", relationships: "Relationships", goals: "Goals", meaning: "Meaning" },
    situation: "What's happening right now?",
    outcome: "How would you like to feel?",
    technique: "Preferred practice",
    optional: "Optional · choose any",
    language: "Original audio",
    source: "Creator",
    duration: "Duration",
    spiritual: "Approach",
    time: "When",
    find: "Find my meditations",
    matches: "Matches for your request",
    empty: "No exact match is available yet. Try another audio language or remove one filter.",
    back: "Return to meditation library",
    all: "Any",
    approx: "Approximate duration, not player-verified",
    unverified: "YouTube suggestion · external playback not verified on Holistic House",
    verified: "Already published on Holistic House",
    external: "External author",
    original: "Andrey's recordings",
    youtubeOnly: "Open the original on YouTube",
    sourceNote: "The video stays on the creator's channel. No audio or video is copied.",
    reason: "Why this was suggested",
    noReasons: "Related to your selected theme",
    related: "Related practice (not an exact topic match)",
    clear: "Clear selection",
    controls: "Refine your selection",
    langDisclosure: "The original speech is",
    audioOptions: { en: "English", ru: "Russian", es: "Spanish" },
  },
  ru: {
    title: "Подобрать медитацию под ваш запрос",
    intro: "Выберите цель и предпочтения. Подбор выполняется только в вашем браузере.",
    goals: { money: "Деньги", energy: "Энергия", relationships: "Отношения", goals: "Цели", meaning: "Смыслы" },
    situation: "Что происходит сейчас?",
    outcome: "Какое состояние хочется?",
    technique: "Предпочитаемая практика",
    optional: "Необязательно · можно несколько",
    language: "Язык оригинала",
    source: "Автор",
    duration: "Длительность",
    spiritual: "Подход",
    time: "Когда",
    find: "Подобрать медитации",
    matches: "Подходящие практики",
    empty: "Точного совпадения пока нет. Попробуйте другой язык или уберите часть фильтров.",
    back: "Вернуться к общей библиотеке",
    all: "Любой",
    approx: "Продолжительность приблизительная, не проверена в плеере",
    unverified: "Подборка YouTube · воспроизведение на сайте пока не подтверждено",
    verified: "Уже опубликовано в Holistic House",
    external: "Другой автор",
    original: "Авторские записи Андрея",
    youtubeOnly: "Смотреть у автора на YouTube",
    sourceNote: "Ролик остаётся на канале автора. Мы не копируем видео или аудио.",
    reason: "Почему предложено",
    noReasons: "Связано с выбранной темой",
    related: "Смежная практика (не точное совпадение темы)",
    clear: "Сбросить параметры",
    controls: "Уточнить подбор",
    langDisclosure: "Оригинальный язык",
    audioOptions: { en: "английский", ru: "русский", es: "испанский" },
  },
  es: {
    title: "Encuentra una meditación para tu situación",
    intro: "Elige una meta y preferencias. La selección ocurre solo en tu navegador.",
    goals: { money: "Dinero", energy: "Energía", relationships: "Relaciones", goals: "Metas", meaning: "Sentido" },
    situation: "¿Qué ocurre ahora?",
    outcome: "¿Cómo quieres sentirte?",
    technique: "Tipo de práctica",
    optional: "Opcional · elige varias",
    language: "Audio original",
    source: "Autor",
    duration: "Duración",
    spiritual: "Enfoque",
    time: "Cuándo",
    find: "Encontrar meditaciones",
    matches: "Resultados para tu petición",
    empty: "No hay coincidencias exactas. Prueba otro idioma o quita un filtro.",
    back: "Volver a la biblioteca",
    all: "Cualquiera",
    approx: "Duración aproximada; no verificada en el reproductor",
    unverified: "Sugerencia de YouTube · reproducción externa no verificada en el sitio",
    verified: "Ya publicada en Holistic House",
    external: "Autor externo",
    original: "Grabaciones de Andrey",
    youtubeOnly: "Abrir en YouTube",
    sourceNote: "El vídeo permanece en el canal original. No copiamos el archivo.",
    reason: "Motivo de la sugerencia",
    noReasons: "Relacionado con tu tema",
    related: "Práctica relacionada (no coincidencia exacta)",
    clear: "Restablecer",
    controls: "Ajustar",
    langDisclosure: "Idioma original",
    audioOptions: { en: "inglés", ru: "ruso", es: "español" },
  },
} as const;

type Props = {
  locale: PublicLocale;
  videos: MeditationCatalogRecord[];
  publishedSourceIds: string[];
  onBack: () => void;
};
const facet = (type: string) => facetsData.facets.filter(item => item.facet_type === type);
const titleOf = (item: { label_en: string; label_ru: string; label_es: string }, locale: PublicLocale) =>
  locale === "ru" ? item.label_ru : locale === "es" ? item.label_es : item.label_en;

export function HolisticMeditationFinder({ locale, videos, publishedSourceIds, onBack }: Props) {
  const t = copy[locale];
  const stars = useCatalogRatings("video",videos.map(video=>video.youtube_id));
  const [minimumStars,setMinimumStars] = useState(0);
  const [sortRated,setSortRated] = useState(false);
  const [goal, setGoal] = useState<Goal>("energy");
  const [language, setLanguage] = useState<VideoLanguage>(locale);
  const [situations, setSituations] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [sourceKind, setSourceKind] = useState<"all" | "original" | "external">("all");
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState("any");
  const [spiritualStyle, setSpiritualStyle] = useState("any");
  const [applied, setApplied] = useState<MeditationRequest | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function toggle(value: string, entries: string[], setter: (next: string[]) => void) {
    setter(entries.includes(value) ? entries.filter(item => item !== value) : [...entries, value]);
    setApplied(null);
  }
  function reset() {
    setGoal("energy"); setLanguage(locale); setSituations([]); setStates([]); setTechniques([]);
    setSourceKind("all"); setMaxDurationMinutes(0); setTimeOfDay("any"); setSpiritualStyle("any");
    setApplied(null); setSelectedId(null);
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({
      goal, language, situations, desiredStates: states, techniques, sourceKind,
      maxDurationMinutes: maxDurationMinutes || undefined,
      // If duration comes from the video's title alone, it is marked approximate.
      allowUnverifiedDuration: Boolean(maxDurationMinutes),
      timeOfDay, spiritualStyle, maxRisk: "unknown", limit: 12,
    });
    setSelectedId(null);
  }
  const matched: MeditationMatch[] = useMemo(() =>
    applied ? rankMeditationCatalog({ videos, publishedSourceIds, request: applied }) : [],
    [applied, videos, publishedSourceIds]);
  const found = (sortRated ? sortByStars(matched,match=>match.video.youtube_id,stars.ratings) : matched)
    .filter(match=>stars.loading || stars.unavailable || matchesStarFilter(stars.ratings[match.video.youtube_id],minimumStars));
  const active = found.find(match => match.video.youtube_id === selectedId) ?? found[0];
  const selectedInfo = (key: FilterKind, value: string) => {
    const f = facet(key).find(item => item.facet_key === value);
    return f ? titleOf(f, locale) : value;
  };
  return (
    <div className={styles.finder} data-meditation-personal-finder>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />{t.back}
        </button>
        <h3>{t.title}</h3>
        <p>{t.intro}</p>
      </div>
      <form className={styles.form} onSubmit={apply} aria-label={t.title}>
        <div className={styles.goals} role="group" aria-label={t.title}>
          {GOALS.map(item => (
            <button key={item} type="button" data-meditation-goal={item}
              aria-pressed={item === goal} className={styles.goal}
              onClick={() => {setGoal(item);setApplied(null);}}>
              {t.goals[item]}
            </button>
          ))}
        </div>
        <div className={styles.facets}>
          {(["situation", "outcome", "technique"] as FilterKind[]).map(kind => {
            const values = kind === "situation" ? situations : kind === "outcome" ? states : techniques;
            const setter = kind === "situation" ? setSituations : kind === "outcome" ? setStates : setTechniques;
            return <details className={styles.facetDetails} key={kind}>
              <summary>{t[kind]} <span>{values.length ? values.length : t.optional}</span></summary>
              <div className={styles.checks} role="group" aria-label={t[kind]}>
                {facet(kind).map(option => (
                  <label key={option.facet_key} className={styles.check}>
                    <input type="checkbox" checked={values.includes(option.facet_key)}
                      onChange={() => toggle(option.facet_key,values,setter)} />
                    <span>{titleOf(option,locale)}</span>
                  </label>
                ))}
              </div>
            </details>;
          })}
        </div>
        <div className={styles.selects}>
          <label>{t.language}
            <select data-meditation-audio-language value={language}
              onChange={e => {setLanguage(e.target.value as VideoLanguage);setApplied(null);}}>
              {(["en","ru","es"] as const).map(lang =>
                <option value={lang} key={lang}>{t.audioOptions[lang]}</option>)}
            </select>
          </label>
          <label>{t.duration}
            <select value={maxDurationMinutes} data-meditation-duration
              onChange={e => {setMaxDurationMinutes(Number(e.target.value));setApplied(null);}}>
              <option value={0}>{t.all}</option>
              {[10,15,20,30].map(n => <option key={n} value={n}>≤ {n} min *</option>)}
            </select>
          </label>
          <label>{t.source}
            <select value={sourceKind} data-meditation-source
              onChange={e => {setSourceKind(e.target.value as typeof sourceKind);setApplied(null);}}>
              <option value="all">{t.all}</option>
              <option value="original">{t.original}</option>
              <option value="external">{t.external}</option>
            </select>
          </label>
          <label>{t.spiritual}
            <select value={spiritualStyle} onChange={e => {setSpiritualStyle(e.target.value);setApplied(null);}}>
              <option value="any">{t.all}</option>
              {facet("spirituality").filter(x=>x.facet_key!=="unspecified").map(option =>
                <option value={option.facet_key} key={option.facet_key}>{titleOf(option,locale)}</option>)}
            </select>
          </label>
          <label>{t.time}
            <select value={timeOfDay} onChange={e => {setTimeOfDay(e.target.value);setApplied(null);}}>
              {facet("time").map(option =>
                <option value={option.facet_key} key={option.facet_key}>{titleOf(option,locale)}</option>)}
            </select>
          </label>
        </div>
        {maxDurationMinutes>0 ? <p className={styles.durationNote}>* {t.approx}</p> : null}
        <div className={styles.actions}>
          <button type="submit" className={styles.primary}><SlidersHorizontal size={17} aria-hidden="true"/>{t.find}</button>
          <button type="button" className={styles.reset} onClick={reset}>{t.clear}</button>
        </div>
      </form>

      {applied && <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12,margin:"12px 0"}}>
        <StarFilter locale={locale} minimum={minimumStars} onChange={value=>{setMinimumStars(value);setSelectedId(null);}}/>
        <label style={{fontSize:13,display:"inline-flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={sortRated} onChange={event=>setSortRated(event.target.checked)}/>
          {locale==="ru"?"Сначала лучшие оценки":locale==="es"?"Mejor valorados primero":"Highest rated first"}
        </label>
      </div>}
      {applied ? (
        <section aria-label={t.matches} className={styles.results} data-meditation-results>
          <h4>{t.matches} · {found.length}</h4>
          {found.length===0 ? <p className={styles.empty} role="status">{t.empty}</p> : (
            <div className={styles.resultGrid}>
              <div className={styles.featured}>
                <p className={styles.mode}>
                  {active.playback === "youtube_only" ? t.unverified : t.verified}
                </p>
                {active.playback === "embedded" ? (
                  <div className={styles.media}>
                    <AcademyVideoPlayer key={active.video.youtube_id} youtubeId={active.video.youtube_id}
                      title={active.video.title} locale={locale} posterLoading="lazy" />
                  </div>
                ) : (
                  <a className={styles.externalCard}
                    href={"https://www.youtube.com/watch?v="+encodeURIComponent(active.video.youtube_id)}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={t.youtubeOnly+": "+active.video.title}>
                    <Image src={"https://i.ytimg.com/vi/"+encodeURIComponent(active.video.youtube_id)+"/hqdefault.jpg"}
                      alt="" width={480} height={270} unoptimized loading="lazy" />
                    <span><ArrowUpRight size={18} aria-hidden="true"/>{t.youtubeOnly}</span>
                  </a>
                )}
                <div className={styles.caption}>
                  <h5>{active.video.title}</h5>
                  <CatalogStarRating locale={locale} summary={stars.ratings[active.video.youtube_id]} onRate={value=>stars.rate(active.video.youtube_id,value)} unavailable={stars.unavailable} compact/>
                  <p>{active.video.creator} · {t.langDisclosure}: {t.audioOptions[active.video.audio_language]}</p>
                  {active.video.duration_hint_minutes && !active.durationVerified ? (
                    <p className={styles.subtle}>≈ {active.video.duration_hint_minutes} min · {t.approx}</p>) : null}
                  {active.playback === "youtube_only" ? <p className={styles.subtle}>{t.sourceNote}</p> : null}
                  {active.matchType === "related" ? <p className={styles.subtle}>{t.related}</p> : null}
                  <strong>{t.reason}</strong>
                  <ul className={styles.reasons}>
                    {active.reasons.length
                      ? active.reasons.slice(0,4).map(({facet:reasonFacet,value},index) =>
                        <li key={reasonFacet+value+index}><Check size={12} aria-hidden="true"/>
                          {reasonFacet === "goal" ? t.goals[value as Goal] : selectedInfo(reasonFacet as FilterKind,value)}
                        </li>)
                      : <li>{t.noReasons}</li>}
                  </ul>
                </div>
              </div>
              <ol className={styles.list}>
                {found.map((match,index) => <li key={match.video.youtube_id}>
                  <button type="button" className={styles.item} aria-pressed={match.video.youtube_id===active.video.youtube_id}
                    data-meditation-recommendation={match.video.youtube_id}
                    onClick={() => setSelectedId(match.video.youtube_id)}>
                    <span className={styles.itemNumber}>{String(index+1).padStart(2,"0")}</span>
                    <span className={styles.itemCopy}>
                      <strong>{match.video.title}</strong>
                      <small>{match.video.creator} · {match.playback === "youtube_only" ? "YouTube" : "Holistic House"} · {stars.ratings[match.video.youtube_id]?.count ? stars.ratings[match.video.youtube_id].average.toFixed(1)+" ★ ("+stars.ratings[match.video.youtube_id].count+")" : "— ★"}</small>
                    </span>
                    <span className={styles.playArrow} aria-hidden="true">›</span>
                  </button>
                </li>)}
              </ol>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
