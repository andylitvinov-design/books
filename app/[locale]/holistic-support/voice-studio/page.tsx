import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { PublicSiteHeader } from "@/components/public-site-header";
import { MandalaCloudVoiceStudio } from "@/components/mandala-cloud-voice-studio";
import css from "./voice-studio.module.css";

type Props={params:Promise<{locale:string}>};
const copy={
  ru:{back:"Вернуться к видео и медитациям",heading:"Голос и природное звучание",subtitle:"Выберите голос, прослушайте русский или английский образец, скачайте аудио с фоном природы. Ваш личный текст отправится внешней модели только с отдельного согласия."},
  en:{back:"Back to video and meditations",heading:"Voice & nature audio",subtitle:"Choose a voice, compare English and Russian samples, download narration with a nature background. Personal text is only sent with separate explicit consent."},
  es:{back:"Volver al vídeo y las meditaciones",heading:"Voces y sonidos naturales",subtitle:"Elige una voz, compara muestras en inglés y ruso, descarga audio con naturaleza. Solo se envía tu texto con consentimiento explícito."},
} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
  const canonical="/"+locale+"/holistic-support/voice-studio";
  return {
    metadataBase:metadataBaseFor(),
    title:copy[locale].heading+" | Holistic House",
    description:copy[locale].subtitle,
    alternates:{
      canonical,
      languages:{
        ru:"/ru/holistic-support/voice-studio",
        en:"/en/holistic-support/voice-studio",
        es:"/es/holistic-support/voice-studio",
        "x-default":"/en/holistic-support/voice-studio",
      },
    },
  };
}
export default async function VoiceStudioPage({params}:Props){
  const {locale}=await params;
  if(!isPublicLocale(locale))notFound();
  const t=copy[locale];
  return <main lang={locale} className={css.page} data-voice-studio-page>
    <PublicSiteHeader locale={locale}/>
    <div className={css.content}>
      <Link href={"/"+locale+"/holistic-support/mandala"} className={css.back} prefetch={false}>
        <ArrowLeft size={17} aria-hidden="true"/>{t.back}
      </Link>
      <h1>{t.heading}</h1>
      <p className={css.lead}>{t.subtitle}</p>
      <MandalaCloudVoiceStudio locale={locale}/>
    </div>
  </main>;
}
