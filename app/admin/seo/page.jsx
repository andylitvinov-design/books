import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PrescriptionAdminHeader } from "@/components/prescription-admin-header";
import { requireAdminRequest } from "@/lib/prescriptions/admin";
import { uiLocaleCookie } from "@/lib/ui-locale";
import { readSearchMetrics, readPublicSitemap, readSearchOpportunities, verifiedSeoBaseline as baseline } from "@/lib/seo/admin-dashboard-data.mjs";
import styles from "./seo-dashboard.module.css";
import { SeoOpportunityFinder } from "@/components/admin-seo-opportunity-finder";
import { SeoRecommendations } from "@/components/admin-seo-recommendations";
import { getSeoRecommendations } from "@/lib/seo/actionable-recommendations.mjs";
import { readSeomatorSnapshot } from "@/lib/seo/seomator-snapshot.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "SEO Analytics · Holistic House", robots: { index: false, follow: false }, referrer: "no-referrer" };

const copy = {
  ru: {
    title: "SEO и поисковая статистика", lead: "Проверенные данные Google Search Console, индексация, техническое состояние и скорость сайта — в одном кабинете.",
    back: "← Кабинет", export: "Скачать CSV", google: "Открыть Google Search Console", search: "Органический поиск", refreshed: "Обновление страницы",
    clicks: "Клики из Google", impressions: "Показы в Google", ctr: "CTR в поиске", position: "Средняя позиция",
    noPosition: "Позиция не определяется, пока нет показов", noCtr: "CTR не определяется, пока нет показов",
    saved: "Сохранённые проверенные данные", live: "Прямые данные Google", missing: "Автоматическое подключение GSC не настроено",
    error: "Google Search Console временно недоступен", connection: "Как подключить автообновление",
    searchNote: "Показатели из Google Search Console, не статистика посещений GA4 и не рекламные клики.",
    trend: "Динамика показов", trendNote: "Дневные показатели за выбранный период",
    emptyTrend: "Пока нет дневных показов из поиска.", emptyTrendDetail: "График появится при получении реальных данных Google. Нулевой или пустой ряд не заменяем выдуманной динамикой.",
    queries: "Поисковые запросы", pages: "Страницы из поиска",
    emptyRows: "Нет подтверждённых данных по запросам и страницам. Они появятся после подключения Google API и первых показов.",
    kw: "Запрос / страница", clicksShort: "Клики", impShort: "Показы", ctrShort: "CTR", posShort: "Позиция",
    sitemap: "Карта сайта и индексация", sitemapNote: "Опубликованная карта проверяется автоматически, данные Google подписаны датой.",
    publicUrls: "Публичные URL в sitemap", indexed: "В индексе по отчёту sitemap Google", tracked: "Индексация отслеживаемых страниц",
    sitemapNote2: "Показатель «в индексе» из карты Google и трекер URL — разные источники и разные моменты проверки.",
    technical: "Технический аудит", technicalNote: "Полный обход опубликованной карты с проверкой статусов страниц.",
    valid: "HTTP 200", redirects: "Редиректы", errors: "Ошибки", lab: "Скорость и Lighthouse", labNote: "Последний сохранённый лабораторный замер, не Core Web Vitals реальных посетителей.",
    mobile: "Мобильная", desktop: "Компьютер", lcp: "LCP", cls: "CLS", seoScore: "SEO",
    next: "Рабочие инструменты", issue: "План и задачи SEO", audit: "Аудит 601 URL", lighthouse: "Измерения Lighthouse", sitemapLink: "Живой sitemap",
    analytics: "Посещаемость и конверсии", analyticsNote: "Просмотры страниц, входы и источники уже отдельно учитываются собственными анонимными счётчиками: они не являются уникальными посетителями. GA4 пока не подтверждён. Поисковые показы GSC не подменяют посещения.",
    setup: "Для обновления непосредственно из Google добавьте сервисный аккаунт в права Search Console (доступ на чтение) и сохраните его email и приватный ключ только в серверных переменных Vercel: HH_GSC_SERVICE_ACCOUNT_EMAIL и HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY. Сам ключ никогда не вводится в этой странице и не передаётся в браузер. До подключения показывается проверенный снимок с датой.",
    lastCheck: "Снимок от", trackedNote: "отслеживаемых URL", noindex: "Не относится к приватным кабинетам и результатам тестов.",
  },
  en: {
    title: "SEO & Search Analytics", lead: "Verified Google Search Console data, indexing, technical health and site speed in one admin workspace.",
    back: "← Cabinet", export: "Download CSV", google: "Open Google Search Console", search: "Organic search", refreshed: "Page refreshed",
    clicks: "Google search clicks", impressions: "Google impressions", ctr: "Search CTR", position: "Average position",
    noPosition: "Position is undefined without impressions", noCtr: "CTR is undefined without impressions",
    saved: "Saved verified snapshot", live: "Live Google data", missing: "Automated GSC connection not configured",
    error: "Google Search Console is temporarily unavailable", connection: "Enable automatic updates",
    searchNote: "Google Search Console statistics, not GA4 visitor data or paid advertising metrics.",
    trend: "Search impressions over time", trendNote: "Daily trend for the selected period",
    emptyTrend: "No daily search observations are available yet.", emptyTrendDetail: "A graph appears when verified Google data exists. We do not invent trends.",
    queries: "Top search queries", pages: "Top search landing pages", emptyRows: "No verified query or page rows yet. Connect Google API and wait for search impressions.",
    kw: "Query / page", clicksShort: "Clicks", impShort: "Impr.", ctrShort: "CTR", posShort: "Position",
    sitemap: "Sitemap & indexing", sitemapNote: "Live sitemap status combined with dated Google indexing reports.",
    publicUrls: "Public sitemap URLs", indexed: "Indexed in Google sitemap report", tracked: "Indexed tracked pages",
    sitemapNote2: "Google sitemap indexing and the inspected-URL tracker have different scopes and update times.",
    technical: "Technical SEO audit", technicalNote: "Full published sitemap crawl with HTTP status verification.",
    valid: "HTTP 200", redirects: "Redirects", errors: "Errors", lab: "Speed & Lighthouse", labNote: "Last saved lab run, not real-user Core Web Vitals.",
    mobile: "Mobile", desktop: "Desktop", lcp: "LCP", cls: "CLS", seoScore: "SEO",
    next: "SEO workspace", issue: "SEO plan & issues", audit: "Full sitemap audit", lighthouse: "Lighthouse reports", sitemapLink: "Live sitemap",
    analytics: "Traffic & conversions", analyticsNote: "First-party anonymous counters separately record page views, entrances and sources, not unique visitors. GA4 remains unverified. Search impressions never stand in for website visits.",
    setup: "To enable automatic Google updates, invite a Google service account to your Search Console property with read access. Store its email and private key only in Vercel server environment variables: HH_GSC_SERVICE_ACCOUNT_EMAIL and HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY. Never enter keys into this page or send them to browsers. Until then, the verified date-stamped snapshot is shown.",
    lastCheck: "Snapshot captured", trackedNote: "tracked pages", noindex: "Private cabinets and individual test results are never included.",
  }
};

function formatDate(iso, locale) {
  if (!iso) return "—";
  const time = new Date(iso);
  return Number.isNaN(+time) ? iso : new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-CA", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto" }).format(time);
}
const number = value => typeof value === "number" ? new Intl.NumberFormat("en-CA").format(value) : "—";
const percent = value => value == null ? "—" : (value * 100).toFixed(1) + "%";
const position = value => value == null ? "—" : value.toFixed(1);

function Metric({ label, value, foot }) {
  return <article className={styles.metric}><p className={styles.metricLabel}>{label}</p><p className={styles.metricValue}>{value}</p><p className={styles.metricFoot}>{foot}</p></article>;
}
function ResultsTable({ title, rows, t }) {
  return <section className={styles.panel}><div className={styles.panelHeading}><h2>{title}</h2></div>
    {!rows?.length ? <div className={styles.empty}><p>{t.emptyRows}</p></div>
      : <div className={styles.tableWrap}><table className={styles.table}>
        <thead><tr><th>{t.kw}</th><th>{t.clicksShort}</th><th>{t.impShort}</th><th>{t.ctrShort}</th><th>{t.posShort}</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{number(r.clicks)}</td><td>{number(r.impressions)}</td><td>{percent(r.ctr)}</td><td>{position(r.position)}</td></tr>)}</tbody></table></div>}
  </section>;
}
export default async function AdminSeoDashboard({ searchParams }) {
  if (!(await requireAdminRequest())) redirect("/admin/login?destination=seo");
  const cookieLocale = (await cookies()).get(uiLocaleCookie)?.value;
  const locale = cookieLocale === "ru" ? "ru" : "en";
  const t = copy[locale];
  const params = await searchParams;
  const days = [7, 28, 90].includes(Number(params?.days)) ? Number(params.days) : 28;
  const [search, site, audit, opportunities] = await Promise.all([readSearchMetrics(days), readPublicSitemap(), readSeomatorSnapshot(), params?.opportunities === "1" ? readSearchOpportunities(days) : null]);
  const live = search.status === "live";
  const useSaved = !live && days === 28;
  const summary = live ? search : useSaved ? baseline.search : {};
  const sourceDate = live ? search.settledThrough : useSaved ? baseline.search.settledThrough : null;
  const daily = live ? search.daily : [];
  const maxImpressions = Math.max(1, ...daily.map(d => d.impressions));
  const tracker = baseline.tracker;
  const map = baseline.sitemap;
  const tech = baseline.technical;
  const lab = baseline.lighthouse;
  const indexedPercent = tracker.tracked ? Math.min(100, tracker.indexed / tracker.tracked * 100) : 0;
  const recommendations = getSeoRecommendations({
    search, baseline, sitemap: site, days, locale,
  });

  return <main className={"prescription-admin-shell " + styles.page} data-seo-admin-dashboard>
    <PrescriptionAdminHeader
      title={{ ru: copy.ru.title, en: copy.en.title }}
      description={{ ru: copy.ru.lead, en: copy.en.lead }} initialLocale={locale}/>
    <div className={styles.intro}><div><p className={styles.eyebrow}>HOLISTIC HOUSE / SEARCH INTELLIGENCE</p>
      <h2 className={styles.title}>{t.search}</h2><p className={styles.lead}>{t.searchNote}</p></div>
      <div className={styles.buttons}><Link className={styles.button} href={`/${locale}/app/practice?panel=marketing`}>{locale === "ru" ? "← Маркетинг" : "← Marketing"}</Link>
        <Link className={styles.button} href="/admin/acquisition">{locale === "ru" ? "Посещения и источники" : "Visits & sources"}</Link>
        <Link className={styles.button} href={"/admin/seo/export?days=" + days} prefetch={false}>{t.export} ↓</Link>
        <a className={styles.button + " " + styles.buttonPrimary} href="https://search.google.com/search-console?resource_id=https%3A%2F%2Fholistichouse.vercel.app%2F" target="_blank" rel="noopener noreferrer">{t.google} ↗</a>
      </div></div>
    <div className={styles.statusRow}><span className={styles.pill + (live ? "" : " " + styles.pillMuted)}>{live ? t.live : t.saved}</span>
      <span className={styles.sourceNote}>{live ? search.source : t.lastCheck + ": " + formatDate(baseline.capturedAt, locale)} · {sourceDate ?? "—"}</span>
      {!live && <span className={styles.sourceNote}>{search.status === "connection_error" ? t.error : t.missing}</span>}</div>
    <div className={styles.topLine}><div className={styles.inline}><span className={styles.small}>Google · Search results</span></div>
      <nav className={styles.range} aria-label="Date range">{[7,28,90].map(d=><Link key={d} href={"/admin/seo?days="+d} className={d===days?styles.rangeActive:""}>{d} {locale==="ru"?"дн.":"days"}</Link>)}</nav></div>
    <div className={styles.grid}>
      <Metric label={t.clicks} value={number(summary.clicks)} foot={live ? search.range.startDate + " – " + search.range.endDate : useSaved ? "28 days · " + baseline.search.settledThrough : t.missing}/>
      <Metric label={t.impressions} value={number(summary.impressions)} foot={sourceDate ?? t.missing}/>
      <Metric label={t.ctr} value={percent(summary.ctr)} foot={summary.ctr==null?t.noCtr:t.searchNote}/>
      <Metric label={t.position} value={position(summary.position)} foot={summary.position==null?t.noPosition:t.searchNote}/>
    </div>
    <SeoRecommendations recommendationResult={recommendations} locale={locale} />
    <SeoOpportunityFinder report={opportunities} days={days} locale={locale} filter={params?.intent} language={params?.language} />
    <section className={styles.panel + " " + styles.auditPanel} data-seomator-audit>
      <div className={styles.panelHeading}><div>
        <h2>{locale === "ru" ? "Глубокий SEO-аудит" : "Deep SEO audit"}</h2>
        <p>{locale === "ru" ? "SEOmator: canonical, hreflang, структура, мобильные страницы и AI-поиск. Отдельно от реального трафика Google." : "SEOmator: canonicals, hreflang, structured data, mobile pages and AI search. Separate from real Google traffic."}</p>
      </div><a className={styles.button} href="https://github.com/andylitvinov-design/books/actions/workflows/hh-seomator-audit.yml" target="_blank" rel="noopener noreferrer">
        {locale === "ru" ? "Запустить аудит" : "Run audit"} ↗</a></div>
      {(audit.status === "live" || audit.status === "stale") ? <>
        <div className={styles.auditOverview}>
          <div className={styles.auditScore}><strong>{audit.score}<small>/100</small></strong>
            <span>{audit.status === "stale" ? (locale === "ru" ? "Архивный результат" : "Old result") :
              (locale === "ru" ? "Оценка SEO" : "SEO audit score")}</span></div>
          <div className={styles.auditMeta}>
            <strong>{audit.engine || "SEOmator"}</strong>
            <p>{locale === "ru" ? "Проверенных страниц" : "Pages measured"}: {number(audit.crawledPages)} · {formatDate(audit.asOf, locale)}</p>
            <p>{locale === "ru" ? "Это выборочный технический аудит, не рейтинг Google и не данные посещаемости." : "A sampled technical audit, not a Google ranking or visitor count."}</p>
            {audit.status === "stale" && <p className={styles.auditWarning}>{locale === "ru" ? "Измерение устарело: нужен новый запуск." : "Audit is outdated: run it again."}</p>}
            <a href={audit.runUrl} target="_blank" rel="noopener noreferrer">{locale === "ru" ? "Отчёт и исходные измерения" : "Report and source measurements"} ↗</a>
          </div>
        </div>
        {!!audit.categories.length && <div className={styles.auditCategories}>{audit.categories.map(category=>
          <div key={category.id} className={styles.auditCategory}>
            <span>{category.id.replaceAll("-", " ")}</span><strong>{category.score}/100</strong>
            <small>{category.fail} {locale === "ru" ? "ошибок" : "failed"} · {category.warn} {locale === "ru" ? "предупр." : "warnings"}</small>
          </div>)}</div>}
        {!!audit.history.length && <div className={styles.auditTrends}>
          <h3>{locale === "ru" ? "История оценок" : "Audit score history"}</h3>
          <div className={styles.auditHistory} role="img" aria-label={locale === "ru" ? "История SEO-оценки по датам" : "SEO score history by date"}>
            {audit.history.map((row,i) => <div className={styles.auditHistoryItem} key={row.asOf + "-" + i}
              title={row.asOf.slice(0,10) + ": " + row.score + "/100"}>
              <strong>{row.score}</strong><span style={{height: Math.max(4, row.score) + "%"}} />
              <small>{row.asOf.slice(5,10)}</small>
            </div>)}</div>
        </div>}
        {!!audit.findings.length && <div className={styles.auditFindings}>
          <h3>{locale === "ru" ? "Что проверить в первую очередь" : "First checks to review"}</h3>
          <ul>{audit.findings.slice(0,6).map(f=><li key={f.ruleId}>
            <strong>{f.status === "fail" ? "●" : "○"} {f.title || f.ruleId}</strong>
            <span>{f.category} · {f.ruleId}</span>
            {f.explanation && <p>{f.explanation}</p>}
          </li>)}</ul>
        </div>}
      </> : <div className={styles.auditEmpty}>
        <strong>{locale === "ru" ? "Подтверждённого отчёта SEOmator пока нет" : "No verified SEOmator report yet"}</strong>
        <p>{locale === "ru" ? "После первого запуска GitHub Actions здесь появятся оценка, категории, список проблем и история. Старые показатели не заменяются предположениями." : "Once the GitHub Actions audit runs, its measured score, categories, issues and history will appear here. No estimated scores are shown."}</p>
      </div>}
    </section>
    <div className={styles.two}>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>{t.trend}</h2><p>{t.trendNote}</p></div><small className={styles.small}>{live ? t.live : t.saved}</small></div>
        {daily.length ? <><div className={styles.chart} role="img" aria-label={t.trend}>
          {daily.map(r => <span key={r.date} className={styles.bar} style={{height: (3 + 97*r.impressions/maxImpressions)+"%"}} title={r.date + ": " + r.impressions} />)}
        </div><div className={styles.chartAxis}><span>{daily[0]?.date}</span><span>{daily.at(-1)?.date}</span></div></>
          : <div className={styles.empty}><strong>{t.emptyTrend}</strong><p>{t.emptyTrendDetail}</p></div>}
      </section>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>{t.sitemap}</h2><p>{t.sitemapNote}</p></div></div>
        <div className={styles.statLine}><span>{t.publicUrls}</span><strong>{number(site.urls)} {site.status==="live" ? "●" : "*"}</strong></div>
        <div className={styles.statLine}><span>{t.indexed}</span><strong>{number(map.indexedReported)} / {number(map.submittedUrls)}</strong></div>
        <div className={styles.statLine}><span>{t.tracked}</span><strong>{tracker.indexed} / {tracker.tracked}</strong></div>
        <div className={styles.statBar}><span style={{width:indexedPercent+"%"}} /></div>
        <div className={styles.statLine}><span>{tracker.notIndexed} {locale==="ru"?"не в индексе":"not indexed"} · {tracker.pending} {locale==="ru"?"ожидают":"pending"}</span><span>{indexedPercent.toFixed(1)}%</span></div>
        <p className={styles.small}>{t.sitemapNote2} {formatDate(map.fetchedAt,locale)} · {formatDate(tracker.checkedAt,locale)}</p>
      </section>
    </div>
    <div className={styles.two + " " + styles.twoEqual}><ResultsTable title={t.queries} rows={live?search.queries:[]} t={t}/><ResultsTable title={t.pages} rows={live?search.pages:[]} t={t}/></div>
    <div className={styles.two + " " + styles.twoEqual}>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>{t.technical}</h2><p>{t.technicalNote} · {formatDate(tech.checkedAt,locale)}</p></div></div>
        <div className={styles.technical}><div className={styles.techUnit}><strong>{tech.ok200}</strong><span>{t.valid}</span></div>
        <div className={styles.techUnit}><strong>{tech.redirects}</strong><span>{t.redirects}</span></div>
        <div className={styles.techUnit}><strong>{tech.invalid + tech.networkFailures}</strong><span>{t.errors}</span></div></div>
        <p className={styles.small}>Source: <a href={tech.reportUrl} target="_blank" rel="noopener noreferrer">GitHub Actions ↗</a> · {t.saved} · {t.noindex}</p>
      </section>
      <section className={styles.panel}><div className={styles.panelHeading}><div><h2>{t.lab}</h2><p>{t.labNote} · {formatDate(lab.checkedAt,locale)}</p></div></div>
        <div className={styles.lighthouse}>{[["mobile",t.mobile],["desktop",t.desktop]].map(([k,label])=><div className={styles.speed} key={k}><small>{label}</small><b>{lab[k].performance}<small>/100</small></b><div className={styles.statLine}><span>{t.lcp}</span><strong>{(lab[k].lcpMs/1000).toFixed(2)} s</strong></div><div className={styles.statLine}><span>{t.cls}</span><strong>{lab[k].cls}</strong></div><div className={styles.statLine}><span>{t.seoScore}</span><strong>{lab[k].seo}/100</strong></div></div>)}</div>
      </section>
    </div>
    <div className={styles.two + " " + styles.twoEqual}>
      <section className={styles.panel}><div className={styles.panelHeading}><h2>{t.next}</h2></div>
        <div className={styles.quickLinks}>
          <a href="https://github.com/andylitvinov-design/books/issues/306" target="_blank" rel="noopener noreferrer">{t.issue} ↗</a>
          <a href={tech.reportUrl} target="_blank" rel="noopener noreferrer">{t.audit} ↗</a>
          <a href={lab.reportUrl} target="_blank" rel="noopener noreferrer">{t.lighthouse} ↗</a>
          <a href="https://holistichouse.vercel.app/sitemap.xml" target="_blank" rel="noopener noreferrer">{t.sitemapLink} ↗</a>
        </div>
      </section>
      <section className={styles.panel}><div className={styles.panelHeading}><h2>{t.analytics}</h2></div><p className={styles.lead}>{t.analyticsNote}</p>
        <details className={styles.details}><summary>{t.connection}</summary><p>{t.setup}</p></details>
      </section>
    </div>
    <p className={styles.footer}>{t.noindex} · {t.refreshed}: {formatDate(new Date().toISOString(),locale)} · {t.saved}: {formatDate(baseline.capturedAt,locale)}.</p>
  </main>;
}
