import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {isPublicLocale} from "@/data/academy/catalog";
import {metadataBaseFor} from "@/data/site-metadata";
import {ShamanicaMobile} from "@/components/shamanica-mobile";
type Props={params:Promise<{locale:string}>};
const title={ru:"Бизнес-анализ и поддержка — Holistic House",en:"Business analysis & support — Holistic House",es:"Análisis y apoyo empresarial — Holistic House"} as const;
const description={ru:"Экспресс-диагностика бизнес-ситуаций, расширенный анализ, поддержка команды и руководителя.",en:"Business situation review, in-depth analysis, team and leadership support.",es:"Diagnóstico empresarial, análisis, apoyo a equipos y líderes."} as const;
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params;
 if(!isPublicLocale(locale))return {title:"Not found",robots:{index:false}};
 return {metadataBase:metadataBaseFor(),title:title[locale],description:description[locale],
  alternates:{canonical:"/"+locale+"/shamanica/business",languages:{ru:"/ru/shamanica/business",en:"/en/shamanica/business",es:"/es/shamanica/business","x-default":"/en/shamanica/business"}}};
}
export default async function ShamanicaBusinessPage({params}:Props){
 const {locale}=await params;
 if(!isPublicLocale(locale))notFound();
 return <ShamanicaMobile locale={locale} audience="business"/>;
}
