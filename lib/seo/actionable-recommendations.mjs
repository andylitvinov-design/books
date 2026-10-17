/**
 * Rule-based SEO recommendations from explicitly dated, public metrics only.
 * No invented conversion data, diagnosis, automatic content writes or AI calls.
 */
const ACTIONS = {
  gsc: "https://search.google.com/search-console?resource_id=https%3A%2F%2Fholistichouse.vercel.app%2F",
  issue: "https://github.com/andylitvinov-design/books/issues/306",
  sitemap: "https://holistichouse.vercel.app/sitemap.xml",
  settings: "/admin/seo#analytics",
};
const localeCopy = {
  ru: {
    labels: { P0:"Срочно",P1:"Важно",P2:"По плану",OK:"В норме" },
    actionGsc:"Открыть Search Console", actionPlan:"Открыть SEO-план",actionAudit:"Открыть аудит",actionSpeed:"Открыть Lighthouse",actionMap:"Открыть sitemap",actionSetup:"Как подключить",
    techIssue:["Исправить ошибки обхода","В последнем отчёте есть проблемные или переадресующие URL. Для SEO-карты нужны рабочие канонические страницы.",["Проверить конкретные HTTP-статусы и адреса в аудите.","Исправить ссылки или убрать редиректы из sitemap, затем проверить снова."]],
    techGood:["Обход страниц прошёл успешно","В последнем проверенном обходе страницы возвращали HTTP 200 без ошибок и редиректов.",["Продолжать проверять sitemap после публикаций и изменений маршрутов."]],
    sitemapMismatch:["Сверить актуальный sitemap с Google","Число URL на сайте отличается от последнего снимка Google. Даты загрузки могут различаться.",["Проверить опубликованную карту и её последний успешный обход Google.","Не отправлять повторно неизменённую карту без необходимости."]],
    sitemapUnavailable:["Проверить доступность sitemap","Не удалось получить текущий sitemap. Число на экране может быть архивным.",["Проверить адрес sitemap.xml и повторить технический аудит."]],
    gscConnect:["Подключить обновление статистики Google","Поисковые данные кабинета пока взяты из подтверждённого снимка; новые запросы и позиции не обновляются автоматически.",["Настроить сервисный аккаунт с доступом только на чтение в Google Search Console.","Ключ хранить исключительно в защищённых переменных Vercel, а не на сайте."]],
    gscError:["Проверить подключение Google Search Console","Запрос к Google завершился ошибкой; это не означает нулевые показы.",["Проверить доступ сервисного аккаунта и настройки API.","До восстановления пользоваться только датированным снимком."]],
    noPeriod:["Нет статистики за выбранный период","Показатели за 28 дней нельзя автоматически переносить на выбранные 7 или 90 дней.",["Подключить GSC API или открыть период 28 дней для просмотра существующего снимка."]],
    stale:["Сначала обновить данные поиска","Последний подтверждённый поисковый отчёт устарел. По нему нельзя оценивать текущие результаты.",["Получить свежие показатели Search Console до массовых изменений SEO."]],
    zeroImpressions:["Получить первые показы в Google","В выбранном подтверждённом периоде показов нет. Для нового сайта это не доказывает техническую ошибку.",["Проверить индексацию страниц About, Free Situation Review и ключевых разделов Academy.","Улучшить конкретные ответы на вопросы и внутренние ссылки, затем оценить показатели после обхода Google."]],
    fewImpressions:["Накопить данные для оценки CTR","Показов пока слишком мало для надёжных выводов о заголовках и эффективности поискового сниппета.",["Наблюдать за показами и запросами, не переписывая все страницы заранее."]],
    ctrLow:["Проверить поисковые сниппеты","При существенном числе показов и умеренной позиции CTR выглядит низким. Универсальной нормы CTR нет.",["Найти запросы и посадочные страницы с показами в Search Console.","Уточнить title и description только там, где они недостаточно соответствуют запросу."]],
    lowPosition:["Повысить полезность приоритетных страниц","При наличии поисковых показов средняя позиция остаётся невысокой. Сначала важна релевантность содержания, а не только заголовка.",["Проверить поисковые намерения по основным услугам.","Дополнить страницы ответами и осмысленными внутренними ссылками, избегая дублей."]],
    activeSearch:["Развивать страницы, уже получающие показы","Органическая видимость появилась. Клики из поиска сами по себе ещё не означают заявки или продажи.",["Изучать наиболее полезные запросы и страницы и развивать связанные темы."]],
    indexEarly:["Отслеживать индексацию важных страниц","Проиндексирована лишь часть отслеживаемых URL, но молодой сайт может ещё ожидать обхода. Это не общая доля индексации всех страниц.",["Разобрать статусы важных URL в Search Console: обнаружено, ожидает или исключено.","Не запрашивать повторную индексацию одних и тех же URL ежедневно."]],
    indexInvestigate:["Разобрать причины отсутствия индексации","В датированном трекере доля индексируемых страниц остаётся небольшой; стоит проверить причины на уровне конкретных адресов.",["Проверить Google-selected canonical, robots, причины исключения и уникальность текстов.","Сначала исправить 3–5 основных страниц, потом повторить проверку."]],
    indexGood:["Продолжать мониторинг индексации","Большая часть отслеживаемых страниц в сохранённом отчёте индексируется. Массово создавать новые URL не требуется.",["Следить за возможной потерей индексации наиболее важных страниц."]],
    slowMobile:["Ускорить мобильный первый экран","Последний лабораторный Lighthouse ниже целевых 90 баллов или LCP больше 2,5 секунды. Измерение может предшествовать новым релизам.",["Повторить Lighthouse на актуальной версии и проверить hero, изображения, CSS и JavaScript.","Оптимизировать точечно с повторным измерением и без ухудшения дизайна."]],
    goodMobile:["Поддерживать хорошую мобильную скорость","В сохранённом лабораторном тесте мобильная скорость находится в целевом диапазоне.",["Сравнивать Lighthouse после крупных изменений."]],
    noAnalytics:["Измерять реальные обращения","Доступ GA4 и подтверждённые конверсии пока не проверены. SEO-клики нельзя считать обращениями за услугой.",["Подключить согласованную аналитику и проверять агрегированные заявки.","Никогда не передавать в аналитику личные ответы, симптомы или результаты тестов."]],
    valueSource:"Снимок", liveSource:"Данные Google", labSource:"Лабораторный тест", techSource:"Проверка сайта",
  },
  en: {
    labels:{P0:"Urgent",P1:"Priority",P2:"Planned",OK:"Healthy"},
    actionGsc:"Open Search Console",actionPlan:"Open SEO plan",actionAudit:"Open full audit",actionSpeed:"Open Lighthouse",actionMap:"Open sitemap",actionSetup:"How to connect",
    techIssue:["Fix technical crawl issues","The last audit includes failed or redirecting URLs. A sitemap should contain working canonical pages.",["Inspect HTTP statuses and paths in the audit.","Fix or remove redirecting paths from the sitemap and recheck."]],
    techGood:["The technical crawl is healthy","Audited pages returned HTTP 200, without errors or redirects in the saved run.",["Rerun the audit after major site changes."]],
    sitemapMismatch:["Reconcile the sitemap with Google","The live sitemap and Google's last report show different URL counts and may have been collected on different dates.",["Check the latest sitemap download in Google.","Avoid repeatedly submitting an unchanged sitemap."]],
    sitemapUnavailable:["Check sitemap availability","The current sitemap could not be retrieved. The displayed count may be archival.",["Check sitemap.xml availability and rerun the technical audit."]],
    gscConnect:["Connect automatic Google search updates","Search values still come from a verified snapshot. New queries and rankings cannot yet refresh automatically.",["Configure a read-only Google Search Console service account.","Keep the key in Vercel server environment variables only."]],
    gscError:["Restore the Google Search Console connection","The last Google request failed. A failed request is not the same as zero impressions.",["Check service-account property access and API configuration.","Use dated snapshots until connectivity returns."]],
    noPeriod:["No verified data for this date range","The verified 28-day snapshot does not represent a selected 7- or 90-day period.",["Connect the GSC API or open 28 days to review the existing snapshot."]],
    stale:["Refresh search data first","The last verified search report is old, so it cannot justify decisions about the current search situation.",["Get current Search Console data before changing titles or evaluating SEO."]],
    zeroImpressions:["Build initial search visibility","No impressions were recorded in the selected verified period. That does not prove a technical SEO failure on a new site.",["Inspect indexing for About, Free Situation Review and priority Academy pages.","Improve helpful content and internal links, then recheck after Google's next crawl."]],
    fewImpressions:["Gather enough impressions to judge CTR","The sample is too small to make confident snippet and title decisions.",["Monitor search queries and preserve existing working pages."]],
    ctrLow:["Review search result snippets","CTR may be low given meaningful impressions and moderate rankings. There is no universal target CTR.",["Inspect high-impression queries and their landing pages.","Improve inaccurate titles and descriptions selectively."]],
    lowPosition:["Improve relevance of priority pages","The site has impressions but a low average ranking. Content relevance may matter more than changing titles alone.",["Review high-value service queries.","Add concrete answers and internal links without duplicate pages."]],
    activeSearch:["Build on existing search impressions","Organic visibility is emerging. Search clicks are not evidence of lead conversion.",["Use verified queries and pages to guide future content."]],
    indexEarly:["Monitor indexing of priority pages","Only some tracked URLs are indexed, but Google's crawl may still be catching up. This is not a sitewide indexing rate.",["Inspect important URLs and their discovery, pending and exclusion states.","Avoid submitting the same URLs for indexing every day."]],
    indexInvestigate:["Investigate limited indexing","A dated tracker shows a low indexed share; inspect specific page-level reasons.",["Review Google's selected canonical, robots and unique content.","Prioritize 3–5 key pages for evidence-based fixes."]],
    indexGood:["Maintain indexing coverage","Most tracked URLs are indexed in the saved report. There is no need to create pages simply to increase the count.",["Watch for newly excluded key landing pages."]],
    slowMobile:["Improve mobile first-screen performance","The last lab Lighthouse score is below 90 or LCP exceeds 2.5 seconds; the result may predate recent deploys.",["Rerun Lighthouse on the latest production build and inspect hero assets, CSS and JS.","Make targeted changes and verify results without disrupting design."]],
    goodMobile:["Maintain healthy mobile performance","The saved lab result is within the mobile performance target.",["Rerun Lighthouse after major releases."]],
    noAnalytics:["Measure real inquiries and conversions","GA4 access and confirmed lead conversion data are not yet verified. SEO clicks are not inquiries.",["Connect privacy-conscious aggregate analytics.","Do not send private test answers or health details into analytics."]],
    valueSource:"Snapshot", liveSource:"Google data", labSource:"Lab test", techSource:"Site audit",
  },
};
const number = v => typeof v === "number" && Number.isFinite(v);
const ageDays = (s,now) => { const n=Date.parse(s || ""); return Number.isFinite(n)?Math.max(0,Math.floor((+now-n)/86400000)):Infinity; };
const rounded = (n,d=1) => Number(n.toFixed(d));
const rank = {P0:0,P1:1,P2:2,OK:3};

/** Pure, consistent priority decisions for the authenticated SEO dashboard. */
export function getSeoRecommendations({ search, baseline, sitemap, days=28, locale="ru", now=new Date() }) {
  const t=localeCopy[locale === "ru"?"ru":"en"];
  const items=[];
  const put=(id,priority,status,metric,copyKey,source,asOf,url,label)=>{
    const [title,meaning,steps]=t[copyKey];
    items.push({id,priority,status,metric,title,meaning,steps,source,asOf,action:{url,label}});
  };
  const tech=baseline.technical;
  const bad=Math.max(0,(tech.invalid||0)+(tech.networkFailures||0));
  const redirects=Math.max(0,tech.redirects||0);
  if(bad+redirects) put("crawl-errors","P0","action",String(bad)+" / "+redirects,"techIssue",t.techSource,tech.checkedAt,tech.reportUrl,t.actionAudit);
  else if(number(tech.ok200)) put("crawl-healthy","OK","positive",tech.ok200+"/"+tech.checked,"techGood",t.techSource,tech.checkedAt,tech.reportUrl,t.actionAudit);
  const googleMap=baseline.sitemap;
  if(sitemap?.status==="live" && number(sitemap.urls) && number(googleMap.submittedUrls) && sitemap.urls!==googleMap.submittedUrls)
    put("sitemap-mismatch","P1","action",sitemap.urls+" / "+googleMap.submittedUrls,"sitemapMismatch","Google sitemap",googleMap.fetchedAt,ACTIONS.sitemap,t.actionMap);
  else if(sitemap?.status!=="live")
    put("sitemap-missing","P1","needs_data","—","sitemapUnavailable","Google sitemap",googleMap.fetchedAt,ACTIONS.sitemap,t.actionMap);

  const live=search?.status==="live";
  const snapshot=!live && days===28 && baseline.search?.periodDays===28;
  const metrics=live?search:snapshot?baseline.search:null;
  const ended=live?(search.settledThrough||search.range?.endDate):baseline.search?.settledThrough;
  const asOf=live?(search.asOf||ended):baseline.capturedAt;
  const searchSource=live?t.liveSource:t.valueSource;
  if(!live) put(search?.status==="connection_error"?"gsc-error":"gsc-connect","P1","needs_data","GSC",search?.status==="connection_error"?"gscError":"gscConnect",searchSource,asOf,ACTIONS.settings,t.actionSetup);
  if(!metrics) put("period-no-data","P2","needs_data",days+" days","noPeriod",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
  else if(ageDays(ended,now)>30) put("search-stale","P1","needs_data",ended||"—","stale",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
  else if(number(metrics.impressions)) {
    const imps=metrics.impressions,clicks=metrics.clicks||0;
    if(imps===0) put("zero-impressions","P1","watch","0","zeroImpressions",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
    else if(imps<100) put("limited-impressions","P2","watch",String(imps),"fewImpressions",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
    else {
      const ctr=number(metrics.ctr)?metrics.ctr:clicks/imps;
      const pos=metrics.position;
      if(ctr<.02 && number(pos) && pos<=15) put("low-ctr","P1","action",rounded(100*ctr)+"%","ctrLow",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
      else if(number(pos)&&pos>20) put("low-position","P1","action",String(rounded(pos)),"lowPosition",searchSource,asOf,ACTIONS.issue,t.actionPlan);
      else put("search-active","P2","watch",String(imps),"activeSearch",searchSource,asOf,ACTIONS.gsc,t.actionGsc);
    }
  }
  const idx=baseline.tracker;
  if(number(idx.tracked)&&idx.tracked>0&&number(idx.indexed)) {
    const low=idx.indexed/idx.tracked<.5;
    const stale=ageDays(idx.checkedAt,now)>=14;
    const copy=low?(stale?"indexInvestigate":"indexEarly"):"indexGood";
    put("indexing",low&&stale?"P1":low?"P2":"OK",low?(stale?"action":"watch"):"positive",idx.indexed+"/"+idx.tracked,copy,"GSC Indexing Tracker",idx.checkedAt,ACTIONS.gsc,t.actionGsc);
  }
  const m=baseline.lighthouse.mobile;
  if(number(m.performance)&&number(m.lcpMs)) {
    const slow=m.performance<90||m.lcpMs>2500;
    put("mobile-speed",slow?"P1":"OK",slow?"action":"positive",m.performance+"/100 · "+rounded(m.lcpMs/1000,2)+" s",slow?"slowMobile":"goodMobile",t.labSource,baseline.lighthouse.checkedAt,baseline.lighthouse.reportUrl,t.actionSpeed);
  }
  put("ga4","P2","needs_data","GA4","noAnalytics","GA4",null,ACTIONS.settings,t.actionSetup);
  items.sort((a,b)=>rank[a.priority]-rank[b.priority]);
  const counts={P0:0,P1:0,P2:0,OK:0};
  items.forEach(item=>counts[item.priority]++);
  return {items,counts,labels:t.labels};
}
