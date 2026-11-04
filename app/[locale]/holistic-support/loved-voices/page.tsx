import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {PublicSiteHeader} from "@/components/public-site-header";
import {MandalaLovedVoices} from "@/components/mandala-loved-voices";
import {isPublicLocale} from "@/data/academy/catalog";
import {metadataBaseFor} from "@/data/site-metadata";

type Props={params:Promise<{locale:string}>};
const copy={
  ru:{title:"Голоса близких",description:"Личная озвучка коротких поддерживающих фраз с подтверждённым согласием владельца голоса."},
  en:{title:"Loved Ones Voices",description:"Short supportive phrases with a voluntarily supplied voice and recorded speaker consent."},
  es:{title:"Voces de seres queridos",description:"Frases de apoyo con una voz compartida voluntariamente y consentimiento grabado."},
} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
  return {metadataBase:metadataBaseFor(),
    title:copy[locale].title+" | Holistic House",
    description:copy[locale].description,
    robots:{index:false,follow:true},
    alternates:{canonical:"/"+locale+"/holistic-support/loved-voices",
      languages:{ru:"/ru/holistic-support/loved-voices",en:"/en/holistic-support/loved-voices",
        es:"/es/holistic-support/loved-voices","x-default":"/en/holistic-support/loved-voices"}},
  };
}
export default async function LovedVoicesPage({params}:Props){
  const {locale}=await params;
  if(!isPublicLocale(locale))notFound();
  const back={ru:"Назад в видеостудию",en:"Back to Video Studio",es:"Volver al editor de vídeo"}[locale];
  return <main lang={locale} className="min-h-screen bg-[#f6f4ed] text-slate-900">
    <div className="mx-auto max-w-7xl px-4 pt-3"><PublicSiteHeader locale={locale}/></div>
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={"/"+locale+"/holistic-support/mandala"} className="mb-5 inline-block text-sm font-semibold text-emerald-900 underline">{back}</Link>
      <MandalaLovedVoices locale={locale}/>
    </div>
  </main>;
}
