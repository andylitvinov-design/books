import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";

type PageProps={params:Promise<{locale:string}>};
export const dynamic="force-dynamic";export const revalidate=0;
export async function generateMetadata({params}:PageProps):Promise<Metadata>{
 const {locale}=await params;if(!isPublicLocale(locale))return{title:"Not found"};
 return{metadataBase:metadataBaseFor(),title:(locale==="ru"?"Практики":locale==="es"?"Profesionales":"Practitioners")+" | Holistic House",description:locale==="ru"?"Публичные профили практиков Holistic House.":locale==="es"?"Perfiles públicos de los profesionales de Holistic House.":"Public Holistic House practitioner profiles.",alternates:{canonical:`/${locale}/masters`,languages:{en:"/en/masters",ru:"/ru/masters",es:"/es/masters"}}};
}
export default async function MastersPage({params}:PageProps){
 const {locale}=await params;if(!isPublicLocale(locale))notFound();const ru=locale==="ru",es=locale==="es";
 let practitioners: PublicPractitioner[]=[];try{practitioners=await createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale)}catch{}
 return <main className="services-shell services-shell--studio" lang={locale}><PublicSiteHeader locale={locale}/>
  <section className="services-studio-hero"><div className="services-studio-hero-copy"><p className="homeopathy-kicker">{ru?"Сеть Holistic House":es?"Red de Holistic House":"Holistic House network"}</p><h1>{ru?"Практики":es?"Profesionales":"Practitioners"}</h1><p>{ru?"Публичные профили специалистов и ведущих, чьи услуги доступны через Holistic House.":es?"Conoce a los profesionales y facilitadores que ofrecen sesiones a través de Holistic House.":"Public profiles of practitioners whose services are available through Holistic House."}</p><Link className="services-studio-primary" href={`/${locale}/services`}>{ru?"Смотреть услуги":es?"Explorar servicios":"Explore services"}<span aria-hidden="true">→</span></Link></div></section>
  <MarketplaceMasterFinder practitioners={practitioners} locale={locale} />
 </main>
}
