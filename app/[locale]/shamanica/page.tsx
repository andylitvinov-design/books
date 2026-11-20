import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { ShamanicaMobile } from "@/components/shamanica-mobile";
type Props={params:Promise<{locale:string}>};
const title={ru:"Шаманик — практики, поддержка и обучение",en:"Shamanic — practices, support & learning",es:"Shamanic — prácticas, apoyo y aprendizaje"} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params;
 if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
 return {metadataBase:metadataBaseFor(),title:title[locale],description:"Reiki, symbolic practices, energy support and learning at Holistic House.",
 alternates:{canonical:"/"+locale+"/shamanica",languages:{ru:"/ru/shamanica",en:"/en/shamanica",es:"/es/shamanica","x-default":"/en/shamanica"}}};
}
export default async function ShamanicaPage({params}:Props){
 const {locale}=await params;
 if(!isPublicLocale(locale))notFound();
 return <ShamanicaMobile locale={locale}/>;
}
