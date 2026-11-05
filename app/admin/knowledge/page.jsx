import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PrescriptionAdminHeader } from "@/components/prescription-admin-header";
import { requireAdminRequest } from "@/lib/prescriptions/admin";
import { uiLocaleCookie } from "@/lib/ui-locale";
import { getProjectKnowledgeSnapshot } from "@/lib/project-knowledge/google-sheets.mjs";
import { KNOWLEDGE_TOPICS, searchProjectKnowledge, validKnowledgeSourceUrl }
  from "@/lib/project-knowledge/registry.mjs";
import styles from "./knowledge.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Knowledge Center · Holistic House",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const labels = {
  ru: {
    title:"Центр знаний Holistic House",
    subtitle:"Бренд, маркетинг, конкуренты, технические решения и планы — в одном защищённом разделе.",
    search:"Поиск по знаниям", question:"Например: фирменные цвета, Video Studio, CI, монетизация",
    submit:"Найти", all:"Все разделы", types:{topic:"Темы",source:"Источники",decision:"Решения",plan:"Планы",palette:"Палитра"},
    sources:"Проверенные источники", links:"Открыть в Google Drive",
    doc:"Главный справочник", sheet:"Реестр решений", card:"Открыть источник",
    modeLive:"Приватный реестр Google Sheets доступен в режиме только чтения",
    modeOffline:"Прямой доступ к приватному реестру ещё не настроен. Сейчас доступна ограниченная проверенная карта тем.",
    modeError:"Google Sheets временно недоступен. Показана только проверенная карта тем.",
    found:"Найдено записей", snapshot:"Срез данных", empty:"Совпадений не найдено. Попробуйте другие ключевые слова.",
    safety:"Решение или ТЗ не означает публикацию на LIVE: проверяйте текущий GitHub SHA, CI, Vercel READY и браузерный сценарий.",
    manager:"Это пространство владельца, а не клиентский Holistic Mind. Данные клиентов и секреты не индексируются.",
    config:"Чтобы подключить автоматическое чтение: предоставьте отдельному сервисному аккаунту Google Sheets доступ только на чтение к реестру и задайте серверные HH_KNOWLEDGE_* переменные. Не публикуйте таблицу в интернете.",
  },
  en: {
    title:"Holistic House Knowledge Center",
    subtitle:"Brand, marketing, competitors, technical decisions and plans in one protected workspace.",
    search:"Search project knowledge",question:"For example: brand colors, Video Studio, CI, monetization",
    submit:"Search",all:"All sections",types:{topic:"Topics",source:"Sources",decision:"Decisions",plan:"Plans",palette:"Palette"},
    sources:"Canonical sources",links:"Open in Google Drive",
    doc:"Main handbook",sheet:"Decision registry",card:"Open source",
    modeLive:"Private Google Sheets registry connected, read-only",
    modeOffline:"Private registry is not connected yet. Showing the bounded reviewed topic map.",
    modeError:"Google Sheets is temporarily unavailable. Showing reviewed topic map only.",
    found:"Matching records",snapshot:"Fetched at",empty:"No matching entries. Try other terms.",
    safety:"A decision or spec does not prove LIVE deployment: verify current GitHub SHA, CI, Vercel READY and real browser behavior.",
    manager:"This is owner-only Project Intelligence, not client Holistic Mind. Client data and secrets are excluded.",
    config:"To enable live reading, share the registry with a dedicated read-only Google service account and configure server-side HH_KNOWLEDGE_* variables. Do not publish the Sheet.",
  },
};

const kinds=["all","topic","source","decision","plan","palette"];
const sourceLinks = () => [
  ["doc",validKnowledgeSourceUrl(process.env.HH_KNOWLEDGE_DOC_URL)],
  ["sheet",validKnowledgeSourceUrl(process.env.HH_KNOWLEDGE_SHEET_URL)],
].filter(([,url])=>url);

export default async function KnowledgeCenter({searchParams}) {
  // First gate: no private Sheet reads, indexes or metadata before owner auth.
  if(!await requireAdminRequest()) redirect("/admin/login");
  const lang=(await cookies()).get(uiLocaleCookie)?.value==="ru"?"ru":"en";
  const t=labels[lang];
  const params=await Promise.resolve(searchParams||{});
  const q=typeof params.q==="string"?params.q.slice(0,160):"";
  const category=kinds.includes(params.category)?params.category:"all";
  const data=await getProjectKnowledgeSnapshot();
  const hits=searchProjectKnowledge({query:q,category,locale:lang,records:data.records,limit:30});
  const count=data.records?.length||0;
  return <main className="prescription-admin-shell">
    <PrescriptionAdminHeader initialLocale={lang} compactMarketing
      title={{ru:t.title,en:t.title}}
      description={{ru:t.subtitle,en:t.subtitle}}/>
    <div className={styles.page}>
      <section className={styles.overview} aria-label={t.sources}>
        <div className={styles.overviewText}>
          <span className={styles.kicker}>PROJECT INTELLIGENCE · READ ONLY</span>
          <p>{data.mode==="drive_readonly"?t.modeLive:data.mode==="unavailable"?t.modeError:t.modeOffline}</p>
          <small>{t.manager}</small>
        </div>
        <div className={styles.links}>
          {sourceLinks().map(([key,url])=>
            <a key={key} href={url} target="_blank" rel="noopener noreferrer">{t[key]}</a>
          )}
          <Link prefetch={false} href={lang==="ru"?"/ru/app/practice":"/en/app/practice"}>
            {lang==="ru"?"Моя практика":"My Practice"}
          </Link>
        </div>
      </section>
      <form role="search" action="/admin/knowledge" method="get" className={styles.form}>
        <label htmlFor="knowledge-query">{t.search}</label>
        <div className={styles.searchRow}>
          <input id="knowledge-query" type="search" name="q" maxLength={160}
            defaultValue={q} placeholder={t.question} autoComplete="off"/>
          <select name="category" defaultValue={category} aria-label={t.all}>
            <option value="all">{t.all}</option>
            {kinds.slice(1).map(k=><option value={k} key={k}>{t.types[k]}</option>)}
          </select>
          <button type="submit">{t.submit}</button>
        </div>
      </form>
      <div className={styles.resultTop}>
        <h2>{t.found}: {hits.length}</h2>
        <small>{data.mode==="drive_readonly"?t.snapshot+": "+data.fetchedAt:
          lang==="ru"?"Проверенная выжимка без приватной синхронизации":"Reviewed overview without private sync"}</small>
      </div>
      {hits.length===0?<div className={styles.empty}>{t.empty}</div>:
        <div className={styles.grid}>
          {hits.map(item=><article key={item.category+item.id} className={styles.card}>
            <div className={styles.meta}><span>{t.types[item.category]}</span>
              {item.priority?<strong>{item.priority}</strong>:null}</div>
            <h3>{item.title}</h3>
            {item.summary?<p>{item.summary}</p>:null}
            <div className={styles.cardFoot}>
              <small>{item.id}{item.status?" · "+item.status:""}{item.date?" · "+item.date:""}</small>
              {item.sourceUrl?<a href={item.sourceUrl} target="_blank"
                rel="noopener noreferrer">{t.card}</a>:null}
            </div>
          </article>)}
        </div>}
      {data.mode!=="drive_readonly"?<p className={styles.config}>{t.config}</p>:null}
      <p className={styles.warning}>{t.safety}</p>
      <p className={styles.foot}>
        {lang==="ru"?"Этот поиск не запускает платную модель и не меняет код или данные Google Drive.":
          "This search calls no paid model and changes neither code nor Google Drive data."}
      </p>
    </div>
  </main>;
}
