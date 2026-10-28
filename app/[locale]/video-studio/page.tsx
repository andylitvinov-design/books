import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PersonalVideoStudio } from "@/components/personal-video-studio";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "@/components/personal-video-studio.module.css";

type Props={params:Promise<{locale:string}>};
const copy={
  en:{title:"Personal video studio — your photo and own voice",desc:"Create an animated video with your own photo and original voice, no Telegram bot or AI payment. Private on-device browser export."},
  ru:{title:"Личная видеостудия — фото и свой голос",desc:"Создайте видео со своим фото и голосом из Telegram-чата, без бота, регистрации и платных нейросетей. Всё остаётся на устройстве."},
  es:{title:"Estudio de vídeo personal — foto y voz propias",desc:"Crea vídeo animado con tu foto y voz sin bot de Telegram, pago de IA o subida al servidor."},
} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  if(!isPublicLocale(locale))return{title:"Not found",robots:{index:false}};
  return {metadataBase:metadataBaseFor(),title:copy[locale].title+" | Holistic House",
    description:copy[locale].desc,alternates:{
      canonical:"/"+locale+"/video-studio",
      languages:{en:"/en/video-studio",ru:"/ru/video-studio",es:"/es/video-studio","x-default":"/en/video-studio"},
    }};
}
export default async function PersonalVideoStudioPage({params}:Props){
  const {locale}=await params;
  if(!isPublicLocale(locale))notFound();
  return <main className={styles.page} lang={locale} data-personal-video-studio-page>
    <PublicSiteHeader locale={locale}/><PersonalVideoStudio locale={locale}/>
  </main>;
}
