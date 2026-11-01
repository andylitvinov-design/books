import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { AlchemyExampleReport } from "@/components/alchemy-example-report";
import { isPublicLocale } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

type Props={params:Promise<{locale:string}>};
export function generateStaticParams(){return [{locale:"en"},{locale:"ru"},{locale:"es"}]}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params;
 if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
 const titles={en:"Psychic Alchemy — fictional sample report",ru:"Алхимия души — пример отчёта",es:"Alquimia del Alma — informe de ejemplo"};
 return {title:titles[locale as PublicLocale]+" | Holistic House",robots:{index:false,follow:true}};
}
export default async function ExampleReportPage({params}:Props){
 const {locale}=await params;
 if(!isPublicLocale(locale))notFound();
 return <><PublicSiteHeader locale={locale as PublicLocale}/><AlchemyExampleReport locale={locale as PublicLocale}/></>;
}
