import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {isPublicLocale} from "@/data/academy/catalog";
import {PublicSiteHeader} from "@/components/public-site-header";
import {MandalaGuestVoiceMessage} from "@/components/mandala-guest-voice-message";

type Props={params:Promise<{locale:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const {locale}=await params;
  if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
  return {
    title:locale==="ru"?"Голосовое послание | Holistic House":locale==="es"?"Mensaje de voz | Holistic House":"Voice message | Holistic House",
    robots:{index:false,follow:false},
  };
}
export default async function GuestVoiceMessagePage({params}:Props){
  const {locale}=await params;
  if(!isPublicLocale(locale))notFound();
  return <main lang={locale} data-hh-design="holistic-light" data-guest-message-page>
    <PublicSiteHeader locale={locale}/>
    <MandalaGuestVoiceMessage locale={locale}/>
  </main>;
}