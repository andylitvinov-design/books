import Link from "next/link";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {PrescriptionAdminHeader} from "@/components/prescription-admin-header";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {uiLocaleCookie} from "@/lib/ui-locale";
import {getMyTubeTaxonomy} from "@/lib/mandala/mytube-content-taxonomy.mjs";
import {getMyTubeScenarioPhotos,MYTUBE_SCENARIO_PHOTO_COVERAGE,MYTUBE_SCENARIO_PHOTO_SUMMARY} from "@/lib/mandala/story-photo-library.mjs";
import styles from "../video-library.module.css";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={
 title:"256 scenario photography coverage — Holistic House",
 robots:{index:false,follow:false},
};
type Locale="ru"|"en"|"es";
type Props={searchParams:Promise<{scenario?:string}>};
const copy={
 ru:{title:"Фотобиблиотека · 256 сценариев",intro:"Шесть разных фотографий для каждого сценария MyTube",
  back:"Видеобиблиотека",scenarios:"Сценарии",photos:"Фото с проверенными JPEG-ответами",links:"Привязки",
  titleScene:"Фото выбранного сюжета",choose:"Выбрать сценарий",review:"Проверенные источники и лицензия",
  note:"Все фотографии доступны через ограниченный фотопрокси сайта. При создании видео браузер повторно проверяет фактическую загрузку и размер JPEG. Наличие ссылки не означает, что MP4 уже создан.",
  source:"Автор и источник",old:"Отдельный аудит 120 старых историй (JSON)",missing:"Подборка не найдена"},
 en:{title:"Photo library · 256 scenarios",intro:"Six distinct real photos for each canonical MyTube scenario",
  back:"Video library",scenarios:"Scenarios",photos:"JPEG-response-checked photos",links:"Story photo links",
  titleScene:"Selected story photos",choose:"Choose a scenario",review:"Checked sources and licensing",
  note:"All photos use the site's limited first-party proxy. The browser rechecks JPEG decoding and image dimensions during rendering. A source photo is not proof of a finished MP4.",
  source:"Photographer and source",old:"Legacy 120-story photo audit (JSON)",missing:"No matching photo selection"},
 es:{title:"Biblioteca de fotos · 256 guiones",intro:"Seis fotos distintas para cada guion de MyTube",
  back:"Videoteca",scenarios:"Guiones",photos:"Fotos con respuesta JPEG comprobada",links:"Vínculos de fotos",
  titleScene:"Fotos de la historia elegida",choose:"Elegir guion",review:"Fuentes y licencias comprobadas",
  note:"Todas las fotos usan el proxy limitado del sitio. El navegador vuelve a comprobar las imágenes antes de crear el vídeo. Una fotografía no confirma un MP4 terminado.",
  source:"Autor y fuente",old:"Auditoría anterior de 120 historias (JSON)",missing:"No se encontró la selección"},
} as const;
export default async function VideoLibraryPhotosPage({searchParams}:Props){
 if(!await requireAdminRequest())redirect("/admin/login");
 const raw=(await cookies()).get(uiLocaleCookie)?.value;
 const locale:Locale=raw==="en"?"en":raw==="es"?"es":"ru";
 const t=copy[locale],taxonomy=getMyTubeTaxonomy(),selectedId=(await searchParams).scenario||"";
 const scenarios=taxonomy.categories.flatMap(category=>category.subcategories.flatMap(sub=>
  sub.topics.flatMap(topic=>topic.scenarios)));
 const selected=scenarios.find(scenario=>scenario.id===selectedId)||scenarios[0];
 const binding=selected?MYTUBE_SCENARIO_PHOTO_COVERAGE[selected.id]:null;
 const photos=selected?getMyTubeScenarioPhotos(selected.id):[];
 const stats=[
  {name:t.scenarios,value:MYTUBE_SCENARIO_PHOTO_SUMMARY.scenarios+"/256"},
  {name:t.photos,value:MYTUBE_SCENARIO_PHOTO_SUMMARY.photos},
  {name:t.links,value:MYTUBE_SCENARIO_PHOTO_SUMMARY.links},
 ];
 return <main className={styles.page} data-hh-design="holistic-light" lang={locale}>
  <PrescriptionAdminHeader title={{ru:copy.ru.title,en:copy.en.title}}
    description={{ru:copy.ru.intro,en:copy.en.intro}}/>
  <div className={styles.content}>
   <nav className={styles.links} aria-label={t.title}>
    <Link href="/admin/video-library">{t.back}</Link>
    <Link href="/api/admin/video-library/photos">{t.old}</Link>
   </nav>
   <div className={styles.stats}>{stats.map(stat=>
    <div className={styles.stat} key={stat.name}>
      <strong>{stat.value}</strong><span>{stat.name}</span>
    </div>)}</div>
   <p className={styles.disclaimer}>{t.note}</p>
   <section className={styles.section} aria-labelledby="selected-photo-story">
    <h1 id="selected-photo-story">{t.titleScene} · {selected?.label[locale]||t.missing}</h1>
    <p className={styles.subtle}>{binding?.categoryId} · {binding?.topicId} · {selected?.id}</p>
    <div data-admin-mytube-six-photos style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:12}}>
     {photos.map((photo,index)=>
      <div key={photo.id} style={{minWidth:0,padding:8,background:"#FFFCF7",border:"1px solid #E9DFD1",borderRadius:14}}>
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img src={photo.src} alt={photo.labels[locale]} loading="lazy" width="320" height="480"
         style={{width:"100%",height:"auto",aspectRatio:"2 / 3",objectFit:"cover",borderRadius:10,background:"#F5ECDC"}}/>
       <div style={{paddingTop:5,fontSize:13,lineHeight:1.4}}>
        <strong>{index+1}. {photo.labels[locale]}</strong>
        <small style={{display:"block",color:"#5D6A71"}}>{photo.attribution}</small>
        <a href={photo.sourcePage} target="_blank" rel="noopener noreferrer"
         style={{color:"#067A67",textDecoration:"underline"}}>{t.source}</a>
       </div>
      </div>)}
    </div>
   </section>
   <section className={styles.section}>
    <h2>{t.choose} · {scenarios.length}</h2>
    <div className={styles.categories}>
     {taxonomy.categories.map(category=>
      <details className={styles.category} key={category.id}>
       <summary><strong>{category.label[locale]}</strong> · 64</summary>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,padding:12}}>
        {category.subcategories.flatMap(sub=>sub.topics.flatMap(topic=>topic.scenarios.map(scenario=>
         <Link key={scenario.id} href={"/admin/video-library/photos?scenario="+encodeURIComponent(scenario.id)}
           aria-current={scenario.id===selected?.id?"page":undefined}
           style={{display:"block",borderRadius:10,padding:10,background:scenario.id===selected?.id?"#E6F6F1":"#FFFCF7",
             border:"1px solid #E9DFD1",color:"#143D3A",textDecoration:"none",fontSize:14}}>
          {scenario.label[locale]}
         </Link>)))}
       </div>
      </details>)}
    </div>
   </section>
  </div>
 </main>;
}
