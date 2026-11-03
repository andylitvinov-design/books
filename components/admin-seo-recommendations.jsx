import styles from "@/app/admin/seo/seo-dashboard.module.css";

const ui = {
  ru: {
    eyebrow: "ПЛАН ДЕЙСТВИЙ",
    title: "Рекомендации по текущим значениям",
    intro: "Приоритеты определяются по подтверждённым показателям. Это рекомендации к проверке и улучшению, а не автоматические изменения сайта.",
    cause: "Почему", steps: "Что сделать", source: "Источник",
    visible: "Первые рекомендации", more: "Показать остальные рекомендации",
    noIssues: "Срочных проблем не обнаружено", noIssuesText: "Продолжайте плановые улучшения и мониторинг важных страниц.",
    checked: "данные на", unavailableDate: "требуется подключение",
  },
  en: {
    eyebrow: "ACTION PLAN",
    title: "Recommendations based on the metrics",
    intro: "Priorities follow verified measurements. These are steps to consider, not automatic site changes.",
    cause: "What the metric means", steps: "Recommended action", source: "Source",
    visible: "First recommendations", more: "Show other recommendations",
    noIssues: "No urgent SEO issues detected", noIssuesText: "Continue planned improvements and monitoring of key pages.",
    checked: "data as of", unavailableDate: "connection needed",
  },
};
const dateLabel = (value, locale) => {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-CA", {
    day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto",
  }).format(new Date(value));
};
function Advice({ item, locale, labels }) {
  const t=ui[locale];
  const date=dateLabel(item.asOf,locale);
  const external=item.action.url.startsWith("https://");
  return <article className={styles.adviceCard} data-seo-recommendation={item.id}>
    <header className={styles.adviceHeader}>
      <span className={styles.advicePriority} data-priority={item.priority}>{labels[item.priority]}</span>
      <strong className={styles.adviceMetric}>{item.metric}</strong>
    </header>
    <h3 className={styles.adviceTitle}>{item.title}</h3>
    <p className={styles.adviceExplain}><strong>{t.cause}:</strong> {item.meaning}</p>
    <p className={styles.adviceWhat}>{t.steps}</p>
    <ol className={styles.adviceSteps}>{item.steps.map((line,i)=><li key={i}>{line}</li>)}</ol>
    <footer className={styles.adviceFooter}>
      <span>{t.source}: {item.source}{date ? " · " + t.checked + " " + date : " · " + t.unavailableDate}</span>
      <a href={item.action.url}
        {...(external?{target:"_blank",rel:"noopener noreferrer"}:{})}
      >{item.action.label} <span aria-hidden="true">↗</span></a>
    </footer>
  </article>;
}
export function SeoRecommendations({ recommendationResult, locale = "ru" }) {
  const language=locale==="ru"?"ru":"en";
  const t=ui[language];
  const {items,counts,labels}=recommendationResult;
  const first=items.slice(0,3);
  const rest=items.slice(3);
  return <section id="seo-recommendations" className={styles.adviceSection} aria-labelledby="seo-advice-title" data-seo-recommendations>
    <div className={styles.adviceSectionHeader}>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p><h2 id="seo-advice-title">{t.title}</h2><p>{t.intro}</p></div>
      <div className={styles.adviceCounts} aria-label={language==="ru"?"Количество рекомендаций":"Recommendations count"}>
        {counts.P0>0&&<span>{labels.P0}: {counts.P0}</span>}
        {counts.P1>0&&<span>{labels.P1}: {counts.P1}</span>}
        {counts.P2>0&&<span>{labels.P2}: {counts.P2}</span>}
        {counts.OK>0&&<span>{labels.OK}: {counts.OK}</span>}
      </div>
    </div>
    {counts.P0===0&&counts.P1===0&&<p className={styles.adviceCalm}>{t.noIssues}. {t.noIssuesText}</p>}
    <div className={styles.adviceGrid}>{first.map(item=><Advice key={item.id} item={item} locale={language} labels={labels}/>)}</div>
    {rest.length>0&&<details className={styles.adviceRest}>
      <summary>{t.more} ({rest.length}) <span aria-hidden="true">⌄</span></summary>
      <div className={styles.adviceGrid}>{rest.map(item=><Advice key={item.id} item={item} locale={language} labels={labels}/>)}</div>
    </details>}
  </section>;
}
