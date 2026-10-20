"use client";
import styles from "./crm-business-enquiries.module.css";

const text={
 en:{title:"Business consulting requests",intro:"Private website requests · consent to reply only · not marketing subscribers.",none:"No business website enquiries yet.",free:"Free written review",express:"30 min · €50",full:"60 min · €100",mentoring:"Goals Mentoring",status:"Status",new:"New",contacted:"Contacted",booked:"Booked",closed:"Closed",source:"Campaign",received:"Received",unverified:"Contact details are self-reported, not independently verified."},
 ru:{title:"Заявки на бизнес-консалтинг",intro:"Личные заявки с сайта · согласие только на ответ · не подписка на рекламу.",none:"Бизнес-заявок с сайта пока нет.",free:"Бесплатный письменный разбор",express:"30 мин · €50",full:"60 мин · €100",mentoring:"Goals Mentoring",status:"Статус",new:"Новая",contacted:"Связались",booked:"Записан",closed:"Закрыта",source:"Кампания",received:"Получена",unverified:"Контакты указаны посетителем, но ещё не подтверждены."},
 es:{title:"Solicitudes de consultoría empresarial",intro:"Solicitudes privadas · consentimiento solo para responder · no marketing.",none:"Todavía no hay solicitudes.",free:"Revisión escrita gratuita",express:"30 min · €50",full:"60 min · €100",mentoring:"Goals Mentoring",status:"Estado",new:"Nueva",contacted:"Contactado",booked:"Reservado",closed:"Cerrada",source:"Campaña",received:"Recibida",unverified:"Datos de contacto proporcionados por el visitante, sin verificar."},
};
export default function CrmBusinessEnquiries({locale="en",enquiries=[],busy=false,onAction}){
  const t=text[locale]||text.en;
  return <section className={styles.box} data-business-crm-inbox aria-labelledby="crm-business-title">
    <div className={styles.head}>
      <h3 id="crm-business-title">{t.title} <span>({enquiries.length})</span></h3>
      <p>{t.intro}</p>
    </div>
    {!enquiries.length?<p className={styles.empty}>{t.none}</p>:
      <ul className={styles.list}>{enquiries.map(item=><li key={item.id} className={styles.item}>
        <div className={styles.heading}>
          <strong>{item.name||"—"}</strong>
          <span>{t[item.format]||item.format}</span>
          <time dateTime={item.createdAt}>{t.received}: {new Date(item.createdAt).toLocaleDateString(locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-CA",{day:"2-digit",month:"short",year:"numeric"})}</time>
        </div>
        <div className={styles.contacts}>
          {item.email&&<span>{item.email}</span>}
          {item.phone&&<span>{item.phone}</span>}
        </div>
        <p className={styles.question}>{item.question}</p>
        {(item.attribution?.source||item.attribution?.medium||item.attribution?.campaign)&&<small className={styles.attribution}>
          {t.source}: {[item.attribution?.source,item.attribution?.medium,item.attribution?.campaign].filter(Boolean).join(" / ")}
        </small>}
        <label className={styles.control}>{t.status}
          <select value={item.status} disabled={busy} onChange={event=>onAction("update_business_enquiry",{id:item.id,status:event.target.value,expectedRevision:item.revision})}
            aria-label={t.status+" — "+(item.name||"")}>
            {["new","contacted","booked","closed"].map(status=><option key={status} value={status}>{t[status]}</option>)}
          </select>
        </label>
      </li>)}</ul>}
    <p className={styles.caution}>{t.unverified}</p>
  </section>;
}
