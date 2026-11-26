import { opportunityFilters, selectOpportunities } from "@/lib/seo/opportunity-finder.mjs";
import styles from "@/app/admin/seo/seo-dashboard.module.css";

const copy={
 ru:{title:"Поиск SEO-возможностей",desc:"23 категории запросов EN/RU/ES и 8 аналитических признаков. Только наблюдаемые запросы Google, без выдуманного спроса.",open:"Загрузить анализ",all:"Все",lang:"Язык страницы",filter:"Категория",apply:"Применить / обновить",query:"Запрос и страница",metrics:"Показы / клики / позиция",action:"Рекомендация",score:"Приоритет",not_connected:"Подключите Google Search Console (инструкция ниже).",connection_error:"Не удалось прочитать Google или актуальную карту сайта. Это не нулевой спрос.",no_visible_rows:"Нет доступных строк запрос–страница в этом периоде. Скрытые Google запросы не учитываются.",empty:"Нет строк для выбранного фильтра.",partial:"Google возвращает только доступные строки; достигнут лимит выборки. Суммы строк не равны общим показателям сайта.",coverage:"Выборка запросов и страниц неполная по определению: Google скрывает часть запросов. Категории пересекаются.",prior:"Предыдущий период недоступен; динамика не оценена.",rule:"Баллы и пороги CTR — эвристика для сортировки, а не прогноз трафика. Коммерческий интерес не означает заявку. Проверяйте релевантность и корректность медицинских утверждений; не публикуйте автоматически.",shown:"Показано",compare:"Пред. период",other:"Другие",actions:{review_overlap:"Проверить конкурирующие страницы и выбрать основную; не объединять без проверки.",review_decay:"Проверить потерю видимости, индексацию и изменения страницы.",review_language:"Проверить язык и hreflang, не создавать дубль.",review_snippet:"Проверить title/description и соответствие запросу.",review_answer:"Проверить, отвечает ли страница на вопрос; добавить полезный ответ только при пробеле.",review_offer:"Проверить актуальность условий услуги, цены и CTA.",review_relevance:"Проверить содержание и внутренние ссылки."}},
 en:{title:"SEO Opportunity Finder",desc:"23 query categories across EN/RU/ES and 8 analytical signals. Observed Google queries only, not invented demand.",open:"Load analysis",all:"All",lang:"Landing page language",filter:"Category",apply:"Apply / refresh",query:"Query and landing page",metrics:"Impressions / clicks / position",action:"Recommendation",score:"Priority",not_connected:"Connect Google Search Console using the instructions below.",connection_error:"Google or the current sitemap could not be read. This is not zero demand.",no_visible_rows:"No visible query-page rows in this period. Google may hide queries.",empty:"No rows for this filter.",partial:"Google returns only available rows; sample limit reached. Row sums are not site totals.",coverage:"Query-page coverage is incomplete: Google hides some queries. Categories overlap.",prior:"Previous period unavailable; changes are not assessed.",rule:"Scores and CTR thresholds are ranking heuristics, not traffic forecasts. Commercial intent is not a lead. Review relevance and health claims; never publish automatically.",shown:"Showing",compare:"Previous period",other:"Other",actions:{review_overlap:"Check overlapping pages and select the primary one; do not consolidate without review.",review_decay:"Check visibility loss, indexing and page changes.",review_language:"Check language and hreflang; avoid duplicate pages.",review_snippet:"Review title/description and search-intent alignment.",review_answer:"Check whether the page answers the question; add a helpful answer only if missing.",review_offer:"Check offer, price and CTA accuracy.",review_relevance:"Review content and internal links."}}
};
export function SeoOpportunityFinder({report,days,locale,filter,language}){
 const t=copy[locale==="ru"?"ru":"en"];
 const active=opportunityFilters.some(f=>f.id===filter)?filter:"all";
 const lang=["en","ru","es","other"].includes(language)?language:"all";
 const selection=report?.status==="live"?selectOpportunities(report,{filter:active,locale:lang}):null;
 const labels=Object.fromEntries(opportunityFilters.map(f=>[f.id,f[locale==="ru"?"ru":"en"]]));
 return <section id="seo-opportunities" className={styles.panel} data-seo-opportunity-finder>
  <div className={styles.panelHeading}><div><h2>{t.title}</h2><p>{t.desc}</p></div></div>
  <form method="get" action="/admin/seo#seo-opportunities" className={styles.buttons}>
   <input type="hidden" name="days" value={days}/><input type="hidden" name="opportunities" value="1"/>
   <label>{t.filter} <select name="intent" defaultValue={active}><option value="all">{t.all}</option>{opportunityFilters.map(f=><option key={f.id} value={f.id}>{labels[f.id]}{report?.counts ? " ("+(report.counts[f.id]||0)+")":""}</option>)}</select></label>
   <label>{t.lang} <select name="language" defaultValue={lang}><option value="all">{t.all}</option><option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option><option value="other">{t.other}</option></select></label>
   <button className={styles.button} type="submit">{report?t.apply:t.open}</button>
  </form>
  {!report?null:report.status!=="live"?<p className={styles.lead}>{t[report.status]||t.connection_error}</p>:<>
   <p className={styles.small}>{report.source} · {report.ranges.current.startDate} – {report.ranges.current.endDate} (PT) · {t.shown} {selection.items.length}/{selection.total}</p>
   <p className={styles.small}>{t.coverage} {report.limitReached&&t.partial} {!report.previousAvailable&&t.prior}</p>
   {!selection.items.length?<p>{t.empty}</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{t.query}</th><th>{t.metrics}</th><th>{t.score}</th><th>{t.action}</th></tr></thead><tbody>
    {selection.items.map(r=><tr key={r.key}><td><strong>{r.query}</strong><div><a href={r.path} target="_blank" rel="noopener noreferrer">{r.path}</a></div><small>{r.tags.map(tag=>labels[tag]).join(" · ")}</small></td>
     <td>{r.impressions} / {r.clicks} / {r.position.toFixed(1)}<div>CTR {(r.ctr*100).toFixed(1)}%</div>{r.priorImpressions!==null&&<small>{t.compare}: {r.priorImpressions} / {r.priorClicks} / {r.priorPosition.toFixed(1)}</small>}</td>
     <td>{r.score}/100</td><td>{t.actions[r.action]}{r.competingPaths.length>0&&<div><small>{r.competingPaths.join(" · ")}</small></div>}</td></tr>)}
   </tbody></table></div>}
   <p className={styles.small}>{t.rule}</p>
  </>}
 </section>;
}
