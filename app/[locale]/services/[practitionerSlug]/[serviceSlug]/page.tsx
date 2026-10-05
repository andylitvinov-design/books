import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { isSupportedLocale } from "@/data/remedies";
import type { Locale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";

type PageProps={params:Promise<{locale:string;practitionerSlug:string;serviceSlug:string}>};
export const dynamic="force-dynamic";
export const revalidate=0;

async function load(locale:string,practitionerSlug:string,serviceSlug:string){
  try{return await createPractitionerRepository(getAppConfig()).getPublicService(practitionerSlug,serviceSlug,locale)}
  catch{return null}
}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isSupportedLocale(locale))return{title:"Not found"};
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)return{title:"Not found",robots:{index:false,follow:false}};
  const title=value.service.copy.title+" — "+value.service.practitionerName+" | Holistic House";
  return{metadataBase:metadataBaseFor(),title,description:value.service.copy.shortDescription,alternates:{canonical:`/${locale}/services/${practitionerSlug}/${serviceSlug}`},robots:{index:true,follow:true}};
}
export default async function ServiceDetail({params}:PageProps){
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isSupportedLocale(locale))notFound();
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)notFound();
  const {service,practitioner}=value,ru=locale==="ru";
  const verified=practitioner.credentials.some((item)=>item.verificationStatus==="verified");
  const price=service.pricingMode!=="contact"&&service.confirmedPrice!=null?`${service.pricingMode==="from"?(ru?"от ":"from "):""}${service.currency||""} ${service.confirmedPrice}`:ru?"Стоимость согласуется до записи":"Price agreed before booking";
  return <main className="services-shell services-shell--studio" lang={locale}>
    <PublicSiteHeader locale={locale}/>
    <section className="services-studio-hero">
      <div className="services-studio-hero-copy">
        <p className="homeopathy-kicker">{ru?"Услуга":"Service"}</p>
        <h1>{service.copy.title}</h1>
        <p>{service.copy.shortDescription}</p>
        <div className="hh-actions">
          <Link className="services-studio-primary" href={`/${locale}/app/consultations`}>{ru?"Запросить услугу":"Request this service"}<span aria-hidden="true">→</span></Link>
          <Link href={`/${locale}/masters/${practitioner.slug}`}>{ru?"О практике":"About practitioner"}</Link>
        </div>
      </div>
    </section>
    <section className="services-studio-approach">
      <div><p className="homeopathy-kicker">{ru?"Практик":"Practitioner"}</p><h2>{service.practitionerName}</h2><p>{service.professionalTitle}</p>{verified&&<p className="hh-badge">{ru?"Credentials проверены":"Credentials verified"}</p>}{practitioner.isPartner&&<p className="hh-badge">Holistic House Partner</p>}</div>
      <div><p>{service.copy.description||service.copy.shortDescription}</p><p>{[service.deliveryFormat==="hybrid"?(ru?"Онлайн / очно":"Online / in person"):service.deliveryFormat==="in_person"?(ru?"Очно":"In person"):"Online",service.locationLabel,service.durationMinutes?`${service.durationMinutes} min`:"",price].filter(Boolean).join(" · ")}</p><p>{(service.languages||[]).join(" · ").toUpperCase()}</p></div>
    </section>
    <p className="remedy-disclaimer services-disclaimer">{ru?"Информация представлена для выбора формата поддержки и не является медицинской диагностикой или гарантией результата.":"This information is for choosing a support format and is not medical diagnosis or a guarantee of outcome."}</p>
    <PublicConsultationCta locale={locale as Locale}/>
  </main>
}
