"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { ArrowLeft,CalendarDays,CheckCircle2,LockKeyhole } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./monthly-support-client.module.css";

type Slot={ordinal:number;scheduledAt:string|null;completedAt:string|null};
type Programme={id:string;format:string;phase:string;remainingSessions:number;completedSessions:number;
  includedSessions:number;startsAt:string;endsAt:string;sessions:Slot[]};
const translations={
  en:{title:"My personal support",intro:"Your sessions and progress, visible only after signing in.",
    loading:"Loading your private programme…",empty:"You do not have an activated monthly programme yet.",
    signIn:"Sign in to your private space",browse:"Explore personal support",total:"Sessions included",
    done:"Completed",remaining:"Remaining",first:"Session",noDate:"Time to be agreed",
    active:"Active",expired:"Month ended",paid:"Monthly programme · €200",
    online_call:"Online conversation",remote_no_call:"Remote session · no call",
    toronto_in_person:"In person · Toronto",back:"Back to my space",materials:"Open my private materials",
    privacy:"Payment is confirmed separately by the owner. This view cannot request payment or issue new session credits."},
  ru:{title:"Моё личное сопровождение",intro:"Ваши встречи и прогресс, доступные только после входа.",
    loading:"Загружаем защищённую программу…",empty:"У вас пока нет активированной месячной программы.",
    signIn:"Войти в личный кабинет",browse:"Посмотреть сопровождение",total:"Включено сессий",
    done:"Проведено",remaining:"Осталось",first:"Сессия",noDate:"Время согласуется",
    active:"Активна",expired:"Месяц завершён",paid:"Месячная программа · €200",
    online_call:"Онлайн со звонком",remote_no_call:"Дистанционно · без звонка",
    toronto_in_person:"Очно · Торонто",back:"Вернуться в кабинет",materials:"Мои приватные материалы",
    privacy:"Оплату подтверждает владелец отдельно. Эта страница не принимает платежи и не выдаёт дополнительные сессии."},
  es:{title:"Mi acompañamiento personal",intro:"Tus sesiones y progreso, privados después de iniciar sesión.",
    loading:"Cargando tu programa privado…",empty:"Aún no tienes un programa mensual activado.",
    signIn:"Entrar en mi espacio privado",browse:"Explorar acompañamiento",total:"Sesiones incluidas",
    done:"Completadas",remaining:"Restantes",first:"Sesión",noDate:"Horario por confirmar",
    active:"Activo",expired:"Mes finalizado",paid:"Programa mensual · 200 €",
    online_call:"Conversación por vídeo",remote_no_call:"A distancia · sin llamada",
    toronto_in_person:"Presencial · Toronto",back:"Volver a mi espacio",materials:"Mis materiales privados",
    privacy:"El propietario confirma el pago por separado. Esta página no cobra ni concede sesiones adicionales."},
} as const;

export function MonthlySupportClient({locale}:{locale:PublicLocale}) {
  const t=translations[locale];
  const formatNames={online_call:t.online_call,remote_no_call:t.remote_no_call,
    toronto_in_person:t.toronto_in_person};
  const [programmes,setProgrammes]=useState<Programme[]|null>(null);
  const [unauthorized,setUnauthorized]=useState(false);
  const [error,setError]=useState(false);
  const accountLocale=locale==="es"?"en":locale;
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/client/personal-support",{credentials:"same-origin",cache:"no-store"})
      .then(async response=>{
        if(!response.ok) {if(response.status===401) return {signin:true};throw Error("LOAD");}
        return response.json();
      }).then(data=>{if(!cancelled){if(data.signin)setUnauthorized(true);else setProgrammes(data.programs||[]);}})
      .catch(()=>{if(!cancelled)setError(true);});
    return ()=>{cancelled=true};
  },[]);
  const date=(value:string)=>new Intl.DateTimeFormat(locale,{year:"numeric",month:"short",day:"numeric"}).format(new Date(value));
  return <main className={styles.page} lang={locale} data-monthly-support-client>
    <div className={styles.shell}>
      <Link className={styles.back} href={"/"+accountLocale+"/app"}><ArrowLeft size={16}/>{t.back}</Link>
      <h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p>
      {unauthorized ? <div className={styles.notice}><LockKeyhole size={20}/><p>{t.signIn}</p>
        <Link href={"/"+accountLocale+"/app"}>{t.signIn}</Link></div> : error ?
        <p role="alert" className={styles.notice}>{locale==="ru"?"Не удалось загрузить программу. Попробуйте снова.":"Could not load the programme. Please retry."}</p> :
        programmes===null ? <p role="status">{t.loading}</p> : programmes.length===0 ?
        <div className={styles.notice}><p>{t.empty}</p><Link href={"/"+locale+"/services/personal-support"}>{t.browse}</Link></div> :
        programmes.map(program=><section key={program.id} className={styles.card}>
          <div className={styles.header}><div><span>{t.paid}</span><h2>{formatNames[program.format as keyof typeof formatNames]||program.format}</h2></div>
            <strong>{program.phase==="expired"?t.expired:t.active}</strong></div>
          <p className={styles.period}><CalendarDays size={16}/>{date(program.startsAt)} – {date(program.endsAt)}</p>
          <div className={styles.stats}>
            <div><span>{t.total}</span><strong>{program.includedSessions}</strong></div>
            <div><span>{t.done}</span><strong>{program.completedSessions}</strong></div>
            <div><span>{t.remaining}</span><strong>{program.remainingSessions}</strong></div>
          </div>
          <div className={styles.sessions}>{program.sessions.map(slot=><article key={slot.ordinal}>
            <span>{t.first} {slot.ordinal}</span><strong>{slot.completedAt?<><CheckCircle2 size={16}/>{t.done}</>:slot.scheduledAt?date(slot.scheduledAt):t.noDate}</strong>
          </article>)}</div>
        </section>)
      }
      <Link className={styles.materials} href={"/"+accountLocale+"/app"}><LockKeyhole size={16}/>{t.materials}</Link>
      <p className={styles.privacy}>{t.privacy}</p>
    </div>
  </main>;
}
