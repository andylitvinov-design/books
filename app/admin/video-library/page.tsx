import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {PrescriptionAdminHeader} from "@/components/prescription-admin-header";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {uiLocaleCookie} from "@/lib/ui-locale";
import {auditVideoSiteCoverage} from "@/lib/video-library/coverage.mjs";
import {auditSiteVideoSlotCoverage} from "@/lib/video-library/site-placements.mjs";
import {getOwnerVaultRegistrySnapshot} from "@/lib/video-library/registry-health-server.js";
import {SITE_VIDEO_SLOTS} from "@/lib/site-videos/model";
import taxonomy from "@/data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json";
import videoResearch from "@/data/video-catalog/pexels-video-research-20261119.json";
import {auditResearchedVideoCandidates,researchVideoLinksForOwner} from "@/lib/video-library/researched-video-candidates.mjs";
import AdminVideoLibraryClips from "@/components/admin-video-library-clips";
import {buildUnifiedVideoInventory,VIDEO_SOURCE_FOLDERS} from "@/lib/video-library/unified-video-inventory.mjs";
import styles from "./video-library.module.css";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"Video Library Coverage — Holistic House",robots:{index:false,follow:false}};

type Locale="ru"|"en"|"es";
type Props={searchParams:Promise<{aspect?:string}>};
const words={
 ru:{title:"Покрытие видеобиблиотеки",subtitle:"Реальные источники, анимации и пробелы по темам — без фиктивной готовности",inventory:"Исходный каталог",all:"Все MP4",licensed:"Локальные видеокомпозиции",motion:"Анимации",matching:"Тем с кандидатами",four:"Тем с четырьмя кандидатами",unknown:"Vault: физическое состояние не проверено этим отчётом",storyReviewed:"Проверенные раскадровки",vaultDb:"Vault: одобрено в БД",vaultBrowser:"Vault: доступно для монтажа",dbChecked:"Реестр Supabase проверен",dbUnknown:"Реестр Supabase недоступен; число неизвестно",r2Unverified:"Cloudflare R2 не перепроверен; готовый монтаж не подтверждён",sources:"Темы MyTube",needed:"Очередь недостающих сцен",sites:"Видео по разделам сайта",portrait:"Вертикально 9:16",landscape:"Горизонтально 16:9",square:"Квадрат",back:"К видеоматериалам",json:"JSON-отчёт",zero:"Нет тематических кандидатов",some:"Есть редакционные кандидаты",fourStatus:"Есть 4+ варианта (не готовый фильм)",limit:"Количество подходящих по тегам источников; не подтверждает реальные кадры, права конкретного сюжета или готовность экспорта.",unbound:"Для 120 сюжетов Studio пока нет 480 индивидуально подтверждённых привязок кадров.",count:"Видео-кандидатов",state:"Состояние",source:"Источник",notVerified:"Нет подтверждения воспроизведения и прав в этом аудите",focus:"Первые потребности"},
 en:{title:"Video Library Coverage",subtitle:"Real footage, animation and topic gaps — no invented readiness",inventory:"Source inventory",all:"All MP4s",licensed:"Local licensed compositions",motion:"Animations",matching:"Topics with candidates",four:"Topics with four candidates",unknown:"Vault: physical state was not checked by this report",storyReviewed:"Frame-reviewed storyboards",vaultDb:"Vault: DB approved",vaultBrowser:"Vault: usable in editor",dbChecked:"Supabase registry checked",dbUnknown:"Supabase registry unavailable; count unknown",r2Unverified:"Cloudflare R2 not rechecked; final export not verified",sources:"MyTube topics",needed:"Missing footage queue",sites:"Video placement by site section",portrait:"Portrait 9:16",landscape:"Landscape 16:9",square:"Square",back:"Website video manager",json:"JSON report",zero:"No topic-matched candidates",some:"Editorial candidates available",fourStatus:"4+ options (not an export-ready film)",limit:"Topic-tagged source counts do not prove frame content, story-specific rights or a finished export.",unbound:"None of the 480 individual Studio story beats has independently verified media binding.",count:"Tagged candidates",state:"State",source:"Source",notVerified:"Playback and rights are not verified by this audit",focus:"Priority gaps"},
 es:{title:"Cobertura de videoteca",subtitle:"Fuentes reales, animaciones y temas faltantes, sin promesas falsas",inventory:"Inventario",all:"Todos los MP4",licensed:"Composiciones locales",motion:"Animaciones",matching:"Temas con candidatos",four:"Temas con cuatro candidatos",unknown:"Vault: este informe no comprobó el estado físico",storyReviewed:"Guiones con revisión visual",vaultDb:"Vault: aprobados en BD",vaultBrowser:"Vault: disponibles en editor",dbChecked:"Registro Supabase comprobado",dbUnknown:"Registro Supabase inaccesible; cifra desconocida",r2Unverified:"Cloudflare R2 sin verificar de nuevo; exportación no confirmada",sources:"Temas MyTube",needed:"Escenas que faltan",sites:"Vídeos por sección",portrait:"Vertical 9:16",landscape:"Horizontal 16:9",square:"Cuadrado",back:"Gestor de vídeos",json:"Informe JSON",zero:"Sin candidatos temáticos",some:"Candidatos editoriales",fourStatus:"4+ opciones (no es una película lista)",limit:"Las etiquetas no confirman fotogramas, derechos específicos ni un vídeo final exportable.",unbound:"Las 480 posiciones de los 120 guiones aún no tienen vínculos verificados.",count:"Candidatos",state:"Estado",source:"Fuente",notVerified:"Este informe no verifica reproducción ni derechos",focus:"Prioridades"}
} as const;

export default async function VideoLibraryCoveragePage({searchParams}:Props){
 if(!await requireAdminRequest())redirect("/admin/login");
 const localeRaw=(await cookies()).get(uiLocaleCookie)?.value;
 const locale:Locale=localeRaw==="es"?"es":localeRaw==="en"?"en":"ru";
 const t=words[locale];
 const requested=(await searchParams).aspect;
 const aspect=requested==="landscape"||requested==="square"?requested:"portrait";
 const report=auditVideoSiteCoverage({aspect});
 const inventory=buildUnifiedVideoInventory();
 const liveVault=await getOwnerVaultRegistrySnapshot();
 const labels=new Map(taxonomy.categories.map(category=>[category.id,category.label[locale]] as const));
 const topicNames=new Map(taxonomy.categories.flatMap(category=>
   category.subcategories.flatMap(sub=>sub.topics.map(topic=>[topic.id,topic.label[locale]] as const))));
 const count=report.summary;
 const videoSourcing=auditResearchedVideoCandidates(videoResearch);
 const slots=auditSiteVideoSlotCoverage();
 const slotLabels=new Map(SITE_VIDEO_SLOTS.map(slot=>[slot.id,slot.label[locale==="es"?"en":locale]] as const));
 const slotStatus=(value:string)=>value==="built_in_public_reference_playback_unverified"?
   (locale==="ru"?"Есть исходная публикация; воспроизведение не проверено":
    locale==="es"?"Publicación existente; reproducción sin verificar":"Published reference; playback unverified"):
   (locale==="ru"?"Нет исходной записи или требуется проверка страницы":
    locale==="es"?"Sin fuente inicial o falta comprobar la página":"No built-in source or page-level check missing");

 const cards=[
  {label:t.all,value:report.inventory.combinedCatalogRows},
  {label:t.licensed,value:report.inventory.localLicensedCatalogRows},
  {label:t.motion,value:report.inventory.proceduralAnimationCatalogRows},
  {label:t.matching,value:count.mytubeTopicsWithAnyTaggedOption+"/64"},
  {label:t.four,value:count.mytubeTopicsWithFourTaggedOptions+"/64"},
  {label:t.storyReviewed,value:report.storyboardEvidence.frameApprovedPlans},
  {label:t.vaultDb,value:liveVault.visibleApprovedRows??"—"},
  {label:t.vaultBrowser,value:liveVault.browserEligibleRows??"—"},
 ];
 return <main className={styles.page} data-hh-design="holistic-light" lang={locale}>
  <PrescriptionAdminHeader
    title={{en:words.en.title,ru:words.ru.title}}
    description={{en:words.en.subtitle,ru:words.ru.subtitle}}
  />
  <div className={styles.content}>
   <nav className={styles.links} aria-label={t.title}>
    <Link href="/admin/videos">{t.back}</Link>
    <Link href="/admin/music-library">{locale==="ru"?"Моя музыка · загрузка до 30":locale==="es"?"Mi música · subir hasta 30":"My music · upload up to 30"}</Link>
    <Link href="#owner-video-upload">{locale==="ru"?"Добавить MP4":locale==="es"?"Subir MP4":"Add MP4"}</Link>
    <Link href="/admin/video-library/photos">{locale==="ru"?"Фото по сценам":locale==="es"?"Fotos por escena":"Photos by scene"}</Link>
    <Link href="/admin/automations">{locale==='ru'?'Автоматизации':locale==='es'?'Automatizaciones':'Automations'}</Link>
    <Link href={"/api/admin/video-library/coverage?aspect="+aspect}>{t.json}</Link>
   </nav>
   <div className={styles.stats} aria-label={t.inventory}>
    {cards.map(card=><div className={styles.stat} key={card.label}>
      <strong>{card.value}</strong><span>{card.label}</span>
    </div>)}
   </div>
   <p className={styles.disclaimer}>{t.limit} {t.unbound} {t.unknown}</p>
   <p className={styles.subtle}>{liveVault.observedAt?t.dbChecked+": "+liveVault.observedAt:t.dbUnknown}. {t.r2Unverified}.</p>
   <section className={styles.section} id="unified-video-inventory" aria-labelledby="unified-video-inventory-title">
    <h2 id="unified-video-inventory-title">{locale==="ru"?"Где хранятся наши видео":locale==="es"?"Dónde están nuestros vídeos":"Where our videos are stored"}</h2>
    <p className={styles.subtle}>{locale==="ru"?
      "Единый указатель без копирования файлов: 56 монтажных видеокомпозиций и 684 процедурные анимации уже есть в каталоге генератора. Анимации — не реальные видеосъёмки. Внешние записи ниже — ссылки, не подтверждение воспроизведения или публикации.":
      locale==="es"?"Índice sin copiar archivos: 56 composiciones y 684 animaciones procedimentales. Las animaciones no son filmaciones. Los enlaces externos no prueban reproducción ni publicación.":
      "One index without copying media: 56 video compositions and 684 procedural animations already share the generator manifests. Animations are not camera footage. External records below are references, not verified playback or publication."}
    </p>
    <div className={styles.siteRows}>
     <div className={styles.siteRow}><strong>Google Drive · {inventory.counts.driveListedMasters}</strong>
      <span>{locale==="ru"?"Архивные MP4-мастера":locale==="es"?"Másteres MP4 archivados":"Archived MP4 masters"}</span>
      <a href={VIDEO_SOURCE_FOLDERS.masters} target="_blank" rel="noopener noreferrer">{locale==="ru"?"Открыть архив":"Open archive"}</a></div>
     <div className={styles.siteRow}><strong>HeyGen · {inventory.counts.heygenApprovedEnglishMasters}</strong>
      <span>{locale==="ru"?"Утверждённые английские оригиналы; перенос на YouTube не подтверждён":"Approved English masters; YouTube transfer not verified"}</span>
      <a href="/admin/youtube-upload">{locale==="ru"?"Проверить публикации":"Check uploads"}</a></div>
     <div className={styles.siteRow}><strong>GitHub · {inventory.counts.separateCoachMotionFilesObserved}</strong>
      <span>{locale==="ru"?"Анимации коучей; отдельно от генератора персональных фильмов":"Coach animations; separate from personal video generation"}</span>
      <a href={VIDEO_SOURCE_FOLDERS.coachMotion} target="_blank" rel="noopener noreferrer">{locale==="ru"?"Папка исходников":"Source directory"}</a></div>
     <div className={styles.siteRow}><strong>MyTube · 42 MP4</strong>
      <span>{locale==="ru"?"Копии отдельных исходных сцен в Drive":"Scene source copies in Drive"}</span>
      <a href={VIDEO_SOURCE_FOLDERS.scenes} target="_blank" rel="noopener noreferrer">{locale==="ru"?"Открыть исходники":"Open sources"}</a></div>
     <div className={styles.siteRow}><strong>Video Vault</strong>
      <span>{locale==="ru"?"Приватный QA и неподтверждённые к публикации исходники":"Private QA and unreleased footage"}</span>
      <a href={VIDEO_SOURCE_FOLDERS.vaultReview} target="_blank" rel="noopener noreferrer">{locale==="ru"?"Реестр проверки":"Review register"}</a></div>
    </div>
    <details className={styles.category}>
     <summary><span className={styles.categoryName}>{locale==="ru"?"Отдельные исходники и мастера в Drive / HeyGen":locale==="es"?"Fuentes y másteres de Drive / HeyGen":"Individual Drive / HeyGen master references"}</span>
      <span className={styles.categoryCount}>{inventory.externalMasters.length}</span></summary>
     <p className={styles.subtle}>{locale==="ru"?"Ссылки не используются автоматически в генераторе, пока не подтверждены права, формат и воспроизведение. Для приватных записей отдельный доступ.":"These links are never auto-imported into the generator without media, rights and playback QA."}</p>
     <div className={styles.topicList}>
      {inventory.externalMasters.map(item=><div className={styles.topicRow} key={item.id}>
       <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
       <span className={styles.topicCount}>{item.provider}</span>
       <small className={styles.topicState}>{item.kind==="archived_master"?
        (locale==="ru"?"MP4 найден в архиве · просмотр не проверен":"Drive master listed · playback not rechecked"):
        (locale==="ru"?"Готовый мастер HeyGen · YouTube не подтверждён":"HeyGen master · YouTube upload unverified")}</small>
      </div>)}
     </div>
    </details>
    <p className={styles.subtle}>{locale==="ru"?
      "Приватные клиентские видео и черновики Telegram не входят в этот публичный каталог и не передаются в генератор. Данные Drive/HeyGen — сверка от 21.11.2026, не автоматическая синхронизация.":
      "Private client and Telegram draft videos are excluded from the public generator. Drive/HeyGen references were reconciled on 2026-11-21, not live synced."}</p>
   </section>
   <AdminVideoLibraryClips locale={locale} scenes={inventory.localScenes}/>
   <section className={styles.section} aria-labelledby="video-source-research-heading">
    <h2 id="video-source-research-heading">{locale==="ru"?"Новые источники видео":locale==="es"?"Nuevas fuentes de vídeo":"New video source leads"} · {videoSourcing.sourcePageCount}</h2>
    <p className={styles.subtle}>{locale==="ru"
      ?"Индивидуальные страницы реальных видеосъёмок, доступные для редакторского просмотра. Не загружены в монтаж, права и кадры пока не подтверждены. Здесь показаны только ссылки на оригинальные страницы."
      :locale==="es"?"Páginas de vídeo para revisión editorial. No son archivos aprobados ni importados al editor."
      :"Individual stock-video pages for editorial review only. No approved or downloaded MP4 has been added to the editor."}
    </p>
    <p className={styles.subtle}>{locale==="ru"?"Вертикальные":"Portrait"}: {videoSourcing.portraitSourcePages} · {locale==="ru"?"Горизонтальные":"Landscape"}: {videoSourcing.landscapeSourcePages} · {locale==="ru"?"Доступно в монтаже: 0":"Ready to render: 0"}</p>
    <div className={styles.categories}>
     {taxonomy.categories.map(category=>{
      const leads=researchVideoLinksForOwner(videoResearch,{categoryId:category.id,orientation:aspect,limit:30});
      return <details className={styles.category} key={category.id}>
       <summary><span className={styles.categoryName}>{category.label[locale]}</span>
        <span className={styles.categoryCount}>{leads.length}</span></summary>
       <div className={styles.topicList}>
        {leads.length?leads.map(item=><div key={item.id} className={styles.topicRow}>
         <a href={item.sourcePage} target="_blank" rel="noopener noreferrer">{item.visualTags.slice(0,4).join(" · ")}</a>
         <span className={styles.topicCount}>{item.durationClaimSeconds}s</span>
         <small className={styles.topicState}>{locale==="ru"?"Кандидат · проверка кадров и прав":"Source lead · footage and rights not verified"} · {item.id}</small>
        </div>):<p className={styles.subtle}>{locale==="ru"?"Нет исходных видео для этого формата":"No source pages for this aspect"}</p>}
       </div>
      </details>;
     })}
    </div>
   </section>
   <section className={styles.section} aria-labelledby="video-coverage-heading">
    <div className={styles.sectionHead}>
     <h1 id="video-coverage-heading">{t.sources}</h1>
     <div className={styles.segment} role="group" aria-label={t.sources}>
      {(["portrait","landscape","square"] as const).map(value=>
       <Link key={value} aria-current={aspect===value?"page":undefined}
        className={aspect===value?styles.selected:styles.option}
        href={"?aspect="+value}>{value==="portrait"?t.portrait:value==="landscape"?t.landscape:t.square}</Link>)}
     </div>
    </div>
    <div className={styles.categories}>
     {report.categories.map(category=>{
      const percent=Math.round(category.topicsWithAnyTaggedOption/category.totalTopics*100);
      const categoryTopics=report.topics.filter(topic=>topic.categoryId===category.id);
      return <details className={styles.category} key={category.id} open={category.topicsWithoutTaggedOptions>8}>
       <summary><span className={styles.categoryName}>{labels.get(category.id)||category.label}</span>
        <span className={styles.categoryCount}>{category.topicsWithAnyTaggedOption}/{category.totalTopics}</span></summary>
       <div className={styles.track} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={labels.get(category.id)||category.label}>
        <span style={{width:percent+"%"}}/>
       </div>
       <div className={styles.topicList}>
        {categoryTopics.map(topic=><div key={topic.topicId} className={styles.topicRow}>
         <span>{topicNames.get(topic.topicId)||topic.topicLabel}</span>
         <span className={styles.topicCount}>{topic.taggedCandidateCount}/4</span>
         <span className={styles.topicState}>{topic.taggedCandidateCount===0?t.zero:
           topic.taggedCandidateCount>=4?t.fourStatus:t.some}</span>
        </div>)}
       </div>
      </details>;
     })}
    </div>
   </section>
   <section className={styles.section}>
    <h2>{t.needed}</h2>
    <p className={styles.subtle}>{t.notVerified}</p>
    <ol className={styles.queue}>
      {report.sourcingQueue.slice(0,35).map(item=><li key={item.topicId}>
       <span>{topicNames.get(item.topicId)||item.topicLabel}</span>
       <small>{labels.get(item.categoryId)||item.categoryId} · {item.taggedOptions}/4</small>
      </li>)}
    </ol>
   </section>
   <section className={styles.section}>
    <h2>{t.sites} · {slots.summary.builtInPublicSourcePlacements}/{slots.summary.localePlacements}</h2>
    <p className={styles.subtle}>{t.notVerified}</p>
    <div className={styles.siteRows}>
     {slots.rows.filter(slot=>slot.pageMode==="fixed").map(slot=><div className={styles.siteRow} key={slot.slotId+slot.locale}>
      <strong>{slotLabels.get(slot.slotId)||slot.slotId}</strong>
      <span>{slot.locale.toUpperCase()} · {slot.path}</span>
      <small>{slotStatus(slot.sourceStatus)}</small>
     </div>)}
    </div>
   </section>
   <section className={styles.section}>
    <h2>{t.sites}</h2>
    <div className={styles.siteRows}>
     {report.sites.map(site=><div key={site.id} className={styles.siteRow}>
      <strong>{site.id}</strong>
      <span>{site.route.replace("{locale}",locale)}</span>
      <small>{t.notVerified} · {site.source}</small>
     </div>)}
    </div>
   </section>
  </div>
 </main>;
}
