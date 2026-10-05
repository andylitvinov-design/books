import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";

type PageProps={params:Promise<{locale:string}>};
export const dynamic="force-dynamic";export const revalidate=0;
export async function generateMetadata({params}:PageProps):Promise<Metadata>{
 const {locale}=await params;if(!isSupportedLocale(locale))return{title:"Not found"};
 return{metadataBase:metadataBaseFor(),title:(locale==="ru"?"Практики":"Practitioners")+" | Holistic House",description:locale==="ru"?"Публичные профили практиков Holistic House.":"Public Holistic House practitioner profiles.",alternates:{canonical:`/${locale}/masters`,languages:{en:"/en/masters",ru:"/ru/masters"}}};
}
export default async function MastersPage({params}:PageProps){
 const {locale}=await params;if(!isSupportedLocale(locale))notFound();const ru=locale==="ru";
 let practitioners=[];try{practitioners=await createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale)}catch{}
 return <main className="services-shell services-shell--studio" lang={locale}><PublicSiteHeader locale={locale}/>
  <section className="services-studio-hero"><div className="services-studio-hero-copy"><p className="homeopathy-kicker">{ru?"Сеть Holistic House":"Holistic House network"}</p><h1>{ru?"Практики":"Practitioners"}</h1><p>{ru?"Публичные профили специалистов и ведущих, чьи услуги доступны через Holistic House.":"Public profiles of practitioners whose services are available through Holistic House."}</p><Link className="services-studio-primary" href={`/${locale}/services`}>{ru?"Смотреть услуги":"Explore services"}<span aria-hidden="true">→</span></Link></div></section>
  <section className="services-studio-grid services-studio-grid--three" aria-label={ru?"Практики":"Practitioners"}>{practitioners.map(p=>{const profile=p.profile||{},verified=p.credentials.some((x)=>x.verificationStatus==="verified");return <article className="services-studio-card services-studio-card--detailed" key={p.id}><p className="homeopathy-kicker">{[profile.city,profile.country].filter(Boolean).join(", ")||"Online"}</p><h2>{profile.displayName||profile.name||"Practitioner"}</h2><p className="services-studio-card-subtitle">{profile.professionalTitle||""}</p><p>{profile.shortBio||""}</p><p className="remedy-disclaimer">{verified?(ru?"Credentials проверены":"Credentials verified"):""}{verified&&p.isPartner?" · ":""}{p.isPartner?"Holistic House Partner":""}</p><Link href={`/${locale}/masters/${p.slug}`}>{ru?"Открыть профиль":"View profile"}<span aria-hidden="true">→</span></Link></article>})}</section>
  {!practitioners.length&&<p>{ru?"Каталог сейчас обновляется.":"The directory is being updated."}</p>}
 </main>
}
