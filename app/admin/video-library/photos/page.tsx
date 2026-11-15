import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {uiLocaleCookie} from "@/lib/ui-locale";
import {getPhotoLibrarySummary,PHOTO_SOURCE_QUEUE} from "@/lib/video-library/photo-library.mjs";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={title:"Photo Library — Holistic House",robots:{index:false,follow:false}};

type Locale="ru"|"en"|"es";
const copy={
 ru:{
  title:"Фотобиблиотека для концептов",sub:"Подбор настоящих фотографий под смысл сцены и раскадровку",
  back:"К видеобиблиотеке",approved:"Готовые фотографии",pending:"Источники, ожидающие импорта",
  topics:"Темы с фотографиями",aspects:"Форматы",license:"Лицензия",source:"Карточка источника",
  tags:"Теги",topicsLabel:"Темы",pendingNote:"Источник и условия использования проверены. Файл ещё не импортирован в проект и поэтому пока недоступен генератору.",
  noPhotos:"Пока нет импортированных фотографий",videoFirst:"Правило отбора: сначала проверяется подходящее одобренное видео. Фото используется только при отсутствии подходящего видео.",
  p0:"Первая очередь: отношения и бизнес",p1:"Следующая очередь: стресс, восстановление и энергия",
  target:"Цель — минимум 4 разных фото на каждую тему",status:"Ожидает импорта",portrait:"Вертикальный",landscape:"Горизонтальный",
  generated:"Сгенерированные изображения ведутся отдельно от фотографий",refresh:"В реестре пока нет готовых файлов"
 },
 en:{
  title:"Concept Photo Library",sub:"Real photographs matched to each concept and storyboard beat",
  back:"Back to video library",approved:"Approved photographs",pending:"Sources awaiting import",
  topics:"Topics with photos",aspects:"Aspect ratios",license:"License",source:"Source page",
  tags:"Tags",topicsLabel:"Topics",pendingNote:"The source and license have been reviewed. The file has not yet been imported into the project and is not available to the generator.",
  noPhotos:"No imported photographs yet",videoFirst:"Selection rule: an approved matching video is checked first. A photo is used only when no suitable video exists.",
  p0:"First priority: relationships and business",p1:"Next: stress, recovery and energy",
  target:"Target: at least 4 distinct photos per topic",status:"Awaiting import",portrait:"Portrait",landscape:"Landscape",
  generated:"Generated images are tracked separately from photographs",refresh:"No ready files in the registry yet"
 },
 es:{
  title:"Biblioteca de fotografías para conceptos",sub:"Fotografías reales vinculadas a cada concepto y escena",
  back:"Volver a la videoteca",approved:"Fotografías aprobadas",pending:"Fuentes pendientes de importación",
  topics:"Temas con fotografías",aspects:"Formatos",license:"Licencia",source:"Página de origen",
  tags:"Etiquetas",topicsLabel:"Temas",pendingNote:"La fuente y la licencia se han revisado. El archivo aún no se ha importado al proyecto y no está disponible para el generador.",
  noPhotos:"Todavía no hay fotografías importadas",videoFirst:"Primero se comprueba si existe un vídeo aprobado adecuado. La foto solo se usa cuando no hay un vídeo apropiado.",
  p0:"Primera prioridad: relaciones y negocios",p1:"Después: estrés, recuperación y energía",
  target:"Objetivo: al menos 4 fotografías distintas por tema",status:"Pendiente de importación",portrait:"Vertical",landscape:"Horizontal",
  generated:"Las imágenes generadas se registran por separado de las fotografías",refresh:"Todavía no hay archivos listos en el registro"
 }
} as const;
const categoryLabel=(value:string,locale:Locale)=>{
 const map:Record<string,Record<Locale,string>>={
  love:{ru:"Любовь и отношения",en:"Love & relationships",es:"Amor y relaciones"},
  business:{ru:"Работа, бизнес и деньги",en:"Work, business & money",es:"Trabajo, negocios y dinero"},
  stress:{ru:"Стресс и восстановление",en:"Stress & recovery",es:"Estrés y recuperación"},
  energy:{ru:"Энергия и уверенность",en:"Energy & confidence",es:"Energía y confianza"},
  body:{ru:"Тело и забота о себе",en:"Body & self-care",es:"Cuerpo y autocuidado"}
 };
 return map[value]?.[locale]||value;
};
export default async function PhotoLibraryPage(){
 if(!await requireAdminRequest())redirect("/admin/login");
 const raw=(await cookies()).get(uiLocaleCookie)?.value;
 const locale:Locale=raw==="en"||raw==="es"?raw:"ru";
 const t=copy[locale],summary=getPhotoLibrarySummary();
 const categories=["love","business","stress","energy","body"];
 const p0=PHOTO_SOURCE_QUEUE.filter(x=>x.categories.some(c=>["love","business"].includes(c)));
 return <main style={{maxWidth:1040,margin:"0 auto",padding:"22px 16px 56px",color:"#26362f"}}>
  <header style={{marginBottom:20}}>
   <Link href="/admin/video-library" style={{color:"#38694f",textDecoration:"none"}}>← {t.back}</Link>
   <h1 style={{fontSize:28,lineHeight:1.15,margin:"18px 0 6px"}}>{t.title}</h1>
   <p style={{color:"#63756c",margin:0}}>{t.sub}</p>
  </header>
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:18}}>
   {[{n:summary.approvedPhotos,l:t.approved},{n:summary.sourceVerifiedPendingImport,l:t.pending},{n:summary.topicsWithAnyPhoto+"/"+summary.totalTopics,l:t.topics},{n:Object.values(summary.byAspect).join(" / "),l:t.aspects}].map(card=>
    <div key={card.l} style={{border:"1px solid #dfe8e2",borderRadius:14,padding:14,background:"#fff"}}>
     <strong style={{fontSize:25}}>{card.n}</strong><div style={{fontSize:12,color:"#66776e",marginTop:4}}>{card.l}</div>
    </div>)}
  </section>
  <div style={{padding:"13px 15px",borderRadius:12,background:"#edf5ef",marginBottom:20,fontSize:14,lineHeight:1.55}}>
   <strong>{t.videoFirst}</strong><div style={{marginTop:5}}>{t.target}</div>
  </div>
  <section style={{marginBottom:24}}>
   <h2 style={{fontSize:18}}>{locale==="ru"?"Покрытие по направлениям":locale==="es"?"Cobertura por tema":"Coverage by category"}</h2>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
    {categories.map(category=><div key={category} style={{border:"1px solid #e1e9e4",borderRadius:11,padding:12}}>
     <div style={{fontWeight:650,fontSize:14}}>{categoryLabel(category,locale)}</div>
     <div style={{fontSize:23,marginTop:4}}>{summary.byCategory[category as keyof typeof summary.byCategory]||0}</div>
     <div style={{fontSize:11,color:"#718078"}}>{locale==="ru"?"одобренных фото":locale==="es"?"fotos aprobadas":"approved photos"}</div>
    </div>)}
   </div>
  </section>
  <section>
   <h2 style={{fontSize:18}}>{t.pending} · {PHOTO_SOURCE_QUEUE.length}</h2>
   <p style={{fontSize:13,color:"#697970"}}>{t.pendingNote}</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
    {PHOTO_SOURCE_QUEUE.map(asset=><article key={asset.id} style={{border:"1px solid #dfe8e2",borderRadius:14,padding:14,background:"#fff",minWidth:0}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
      <strong style={{fontSize:15}}>{asset.title[locale]}</strong>
      <span style={{fontSize:10,background:"#fff3d9",color:"#79571a",borderRadius:20,padding:"4px 8px",whiteSpace:"nowrap"}}>{t.status}</span>
     </div>
     <p style={{fontSize:12,color:"#63746a",lineHeight:1.45}}>{asset.description[locale]}</p>
     <div style={{fontSize:11,color:"#51645a",marginBottom:8}}><b>{t.license}:</b> {asset.licenseId}</div>
     <div style={{fontSize:11,color:"#51645a",lineHeight:1.5,marginBottom:8}}><b>{t.tags}:</b> {asset.tags.join(" · ")}</div>
     <div style={{fontSize:11,color:"#51645a",lineHeight:1.5,marginBottom:8}}><b>{t.topicsLabel}:</b> {asset.categories.map(c=>categoryLabel(c,locale)).join(" · ")}</div>
     <a href={asset.sourcePageUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#286444"}}>{t.source} ↗</a>
     <div style={{fontSize:10,color:"#829088",marginTop:8}}>{asset.photographer} · {asset.aspect==="portrait"?t.portrait:t.landscape}</div>
    </article>)}
   </div>
  </section>
  <p style={{fontSize:12,color:"#7b8981",marginTop:22}}>{t.generated}. {t.refresh}</p>
 </main>;
}
