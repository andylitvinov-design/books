import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { isPublicLocale } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicServiceDetail } from "@/lib/practitioners/public-types";
import styles from "@/components/marketplace-service-gallery.module.css";

type PageProps={params:Promise<{locale:string;practitionerSlug:string;serviceSlug:string}>};
export const dynamic="force-dynamic";
export const revalidate=0;

async function load(locale:string,practitionerSlug:string,serviceSlug:string):Promise<PublicServiceDetail|null>{
  try{return await createPractitionerRepository(getAppConfig()).getPublicService(practitionerSlug,serviceSlug,locale) as PublicServiceDetail}
  catch{return null}
}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isPublicLocale(locale))return{title:"Not found"};
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)return{title:"Not found",robots:{index:false,follow:false}};
  const title=value.service.copy.title+" — "+value.service.practitionerName+" | Holistic House";
  const languages=Object.fromEntries(value.service.displayLocales.map(lang=>[lang,`/${lang}/services/${practitionerSlug}/${serviceSlug}`]));
  return{metadataBase:metadataBaseFor(),title,description:value.service.copy.shortDescription,alternates:{canonical:`/${locale}/services/${practitionerSlug}/${serviceSlug}`,languages},robots:{index:true,follow:true}};
}
export default async function ServiceDetail({params}:PageProps){
  const {locale,practitionerSlug,serviceSlug}=await params;
  if(!isPublicLocale(locale))notFound();
  const value=await load(locale,practitionerSlug,serviceSlug);
  if(!value)notFound();
  const {service,practitioner}=value,ru=locale==="ru",es=locale==="es";
  const isWuXingGuide=service.slug==="free-wu-xing-diagnostic";
  const verified=practitioner.credentials.some((item)=>item.verificationStatus==="verified");
  const isFree=service.pricingMode==="free"||(service.pricingMode!=="contact"&&service.confirmedPrice===0);
  const formatted=service.confirmedPrice==null?"":new Intl.NumberFormat(ru?"ru-RU":es?"es-ES":"en-CA",{
    style:"currency",currency:service.currency||"CAD",maximumFractionDigits:2
  }).format(service.confirmedPrice);
  const price=isFree?(ru?"Бесплатно":es?"Gratis":"Free"):service.pricingMode!=="contact"&&service.confirmedPrice!=null
    ?(service.pricingMode==="from"?(ru?"от ":es?"desde ":"from "):"")+formatted
    :ru?"Стоимость согласуется до записи":es?"Precio acordado antes de reservar":"Price agreed before booking";
  return <main className="services-shell services-shell--studio" lang={locale}>
    <PublicSiteHeader locale={locale}/>
    <section className="services-studio-hero">
      <div className="services-studio-hero-copy">
        <p className="homeopathy-kicker">{ru?"Услуга":es?"Servicio":"Service"}</p>
        <h1>{service.copy.title}</h1>
        <p>{service.copy.shortDescription}</p>
        <div className="hh-actions">
          <Link id="request-service" className="services-studio-primary" href={`/${es?"en":locale}/app/consultations?service=${encodeURIComponent(service.id)}`}>{isFree?(ru?"Запросить бесплатно":es?"Solicitar gratis":"Request free service"):(ru?"Запросить услугу":es?"Consultar disponibilidad":"Request this service")}<span aria-hidden="true">→</span></Link>
          {isWuXingGuide&&<Link href={`/${locale}/wu-xing`}>{ru?"Методичка: уровни здоровья":es?"Guía: Niveles de salud":"Guide: Levels of Health"}</Link>}
          <Link href={`/${locale}/masters/${practitioner.slug}`}>{ru?"О практике":es?"Sobre el profesional":"About practitioner"}</Link>
        </div>
      </div>
    </section>
    {service.photos?.length ? <section className={styles.gallery} aria-label={ru?"Фото услуги":es?"Fotos del servicio":"Service photos"}>
      {service.photos.map((url,index)=><img key={url} src={url} alt={service.copy.title+" — "+(index+1)}
        width={800} height={500} loading={index===0?"eager":"lazy"}/>)}
    </section> : null}
    <section className="services-studio-approach">
      <div><p className="homeopathy-kicker">{ru?"Практик":es?"Profesional":"Practitioner"}</p><h2>{service.practitionerName}</h2><p>{service.professionalTitle}</p>{verified&&<p className="hh-badge">{ru?"Credentials проверены":es?"Credenciales verificadas":"Credentials verified"}</p>}{practitioner.isPartner&&<p className="hh-badge">{es?"Colaborador de Holistic House":"Holistic House Partner"}</p>}</div>
      <div><p>{service.copy.description||service.copy.shortDescription}</p><p>{[service.deliveryFormat==="hybrid"?(ru?"Онлайн / очно":es?"En línea / presencial":"Online / in person"):service.deliveryFormat==="in_person"?(ru?"Очно":es?"Presencial":"In person"):"Online",service.locationLabel,service.durationMinutes?`${service.durationMinutes} min`:"",price].filter(Boolean).join(" · ")}</p><p>{(service.languages||[]).join(" · ").toUpperCase()}</p></div>
    </section>
    {service.contacts?.whatsapp||service.contacts?.telegram?<section className={styles.contact}>
      <div><h2>{ru?"Написать мастеру":es?"Contactar al profesional":"Message the practitioner"}</h2>
        <p>{ru?"Выберите удобный мессенджер. Не отправляйте медицинские или конфиденциальные сведения в открытом чате.":es?"Elige un canal. No envíes información médica o privada por mensajería pública.":"Choose a messenger. Avoid sending sensitive medical or private details by public chat."}</p>
      </div>
      <div className={styles.links}>
        {service.contacts.whatsapp?<a href={"https://wa.me/"+service.contacts.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>:null}
        {service.contacts.telegram?<a href={"https://t.me/"+service.contacts.telegram} target="_blank" rel="noopener noreferrer">Telegram ↗</a>:null}
      </div>
    </section>:null}
    <p className="remedy-disclaimer services-disclaimer">{ru?"Информация представлена для выбора формата поддержки и не является медицинской диагностикой или гарантией результата.":es?"La información ayuda a elegir una modalidad de acompañamiento; no constituye diagnóstico médico ni garantía de resultados.":"This information is for choosing a support format and is not medical diagnosis or a guarantee of outcome."}</p>
    {practitioner.slug === "andy-litvinov" ? <PublicConsultationCta locale={locale as PublicLocale}/> : null}
  </main>
}
