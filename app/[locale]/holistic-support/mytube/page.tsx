import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {HolisticSupportMandalaDock} from "@/components/holistic-support-mandala-dock";
import {MyTubeFeed} from "@/components/mytube-feed";
import {buildLibraryFeedItems,buildPublicLibraryVideos} from "@/components/library-hub";
import {loadPublicLibraryFeed} from "@/lib/public-library-feed";
import {loadApprovedVideoDiscoveries} from "@/lib/video-discovery/approved-meditations";
import {isPublicLocale} from "@/data/academy/catalog";
import {metadataBaseFor} from "@/data/site-metadata";
import css from "@/components/mytube-feed.module.css";
export const dynamic="force-dynamic";
export const revalidate=0;
type Props={params:Promise<{locale:string}>};
const meta={
 ru:{title:"MyTube — видео для развития",description:"Каталог развивающих видео, медитаций и уроков с фильтрами по целям, темам и традициям."},
 en:{title:"MyTube — videos for growth",description:"Curated educational videos and meditations with advanced goal, topic and tradition filters."},
 es:{title:"MyTube — vídeos para crecer",description:"Vídeos educativos y meditaciones con filtros avanzados por metas, temas y tradiciones."}
} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params;
 if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
 return {metadataBase:metadataBaseFor(),title:meta[locale].title+" | Holistic House",description:meta[locale].description,
  alternates:{canonical:"/"+locale+"/holistic-support/mytube",
   languages:{en:"/en/holistic-support/mytube",ru:"/ru/holistic-support/mytube",es:"/es/holistic-support/mytube","x-default":"/en/holistic-support/mytube"}}};
}
export default async function MyTubePage({params}:Props){
 const {locale}=await params;
 if(!isPublicLocale(locale))notFound();
 const [{videos,articles},approved]=await Promise.all([loadPublicLibraryFeed(locale),loadApprovedVideoDiscoveries()]);
 const {feedItems}=buildLibraryFeedItems(locale,videos,articles);
 const catalog=buildPublicLibraryVideos(locale,feedItems,approved);
 return <div className={css.page} data-mytube-page>
  <HolisticSupportMandalaDock locale={locale}/>
  <MyTubeFeed locale={locale} videos={catalog}/>
 </div>;
}
