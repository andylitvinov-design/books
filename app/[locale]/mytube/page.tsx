import type {Metadata, Viewport} from "next";
import Link from "next/link";
import {ArrowLeft, BookOpen, Play} from "lucide-react";
import {notFound} from "next/navigation";
import {VideoDiscovery} from "@/components/video-discovery";
import {buildPublicVideoDiscoveryItems} from "@/components/library-hub";
import {loadPublicMyTubeVideos} from "@/lib/public-library-feed";
import {loadApprovedVideoDiscoveries} from "@/lib/video-discovery/approved-meditations";
import {isPublicLocale} from "@/data/academy/catalog";
import {metadataBaseFor} from "@/data/site-metadata";
import styles from "./mytube.module.css";

export const viewport:Viewport={themeColor:"#0f0f0f"};
export const dynamic="force-dynamic";
export const revalidate=0;
type Props={params:Promise<{locale:string}>};
const t={
  ru:{title:"MyTube — развивающие видео",description:"Ищите развивающие видео и практики по цели, жизненной сфере, методу и автору.",back:"В видеостудию",library:"Библиотека",subtitle:"Осмысленные видео, практики и учебные записи",note:"Публичная видеотека Holistic House. Видео остаются у авторов."},
  en:{title:"MyTube — videos for growth",description:"Discover curated learning videos by goal, life area, creator, method, and original language.",back:"Video Studio",library:"Library",subtitle:"Thoughtful videos, practices and learning sessions",note:"Public Holistic House video library. Videos stay with their creators."},
  es:{title:"MyTube — vídeos para crecer",description:"Descubre vídeos educativos por objetivo, área de vida, autor, método e idioma original.",back:"Estudio de vídeo",library:"Biblioteca",subtitle:"Vídeos, prácticas y lecciones para aprender",note:"Videoteca pública de Holistic House. Los vídeos permanecen con sus autores."},
} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale:raw}=await params;
  if(!isPublicLocale(raw))return {title:"Not found",robots:{index:false}};
  return {metadataBase:metadataBaseFor(),title:t[raw].title+" | Holistic House",
    description:t[raw].description,
    alternates:{canonical:"/"+raw+"/mytube",
      languages:{en:"/en/mytube",ru:"/ru/mytube",es:"/es/mytube","x-default":"/en/mytube"}}};
}
export default async function MyTubePage({params}:Props){
  const {locale:raw}=await params;
  if(!isPublicLocale(raw))notFound();
  const locale=raw;
  const [videos,approvedMeditations]=await Promise.all([
    loadPublicMyTubeVideos(),loadApprovedVideoDiscoveries(),
  ]);
  const publicVideos=buildPublicVideoDiscoveryItems(locale,videos,approvedMeditations);
  const copy=t[locale];
  return <main className={styles.page} lang={locale} data-mytube-page>
    <header className={styles.topbar}>
      <Link href={"/"+locale+"/holistic-support/mandala"} prefetch={false}
        className={styles.back} aria-label={copy.back}>
        <ArrowLeft size={22} aria-hidden="true"/><span>{copy.back}</span>
      </Link>
      <div className={styles.brand} aria-label="MyTube">
        <span className={styles.playMark}><Play size={17} fill="currentColor" aria-hidden="true"/></span>
        <strong>My<span>Tube</span></strong>
      </div>
      <Link href={"/"+locale+"/library?view=videos"} prefetch={false}
        className={styles.library} aria-label={copy.library}>
        <BookOpen size={20} aria-hidden="true"/><span>{copy.library}</span>
      </Link>
    </header>
    <div className={styles.content}>
      <VideoDiscovery locale={locale} videos={publicVideos} variant="mytube" subtitle={copy.subtitle}/>
      <p className={styles.footerNote}>{copy.note}</p>
    </div>
  </main>;
}
