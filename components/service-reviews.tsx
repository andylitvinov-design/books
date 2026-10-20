"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import styles from "./service-reviews.module.css";

type Review={
  id:string;displayName:string;rating:number;body:string;status?:string;
  createdAt:string;updatedAt:string;
};
type ReviewPayload={
  summary:{count:number;average:number};
  reviews:Review[];page:number;hasMore:boolean;
  viewer:{signedIn:boolean;canReview:boolean;mine:Review|null;suggestedName:string};
};
const COPY={
  en:{
    kicker:"Community feedback",title:"Reviews of this service",
    note:"Reviews are written by registered Holistic House members. A booking or completed session is not independently verified.",
    average:"Average rating",reviewCount:"reviews",empty:"No reviews yet. Be the first to share a real experience.",
    write:"Write a review",edit:"Edit my review",signin:"Sign in to leave a review",
    owner:"Practitioners cannot review their own services.",inactive:"Complete your member profile to leave a review.",
    publicName:"Public display name",rating:"Your rating",experience:"Your experience",
    experienceHint:"50–1200 characters. Please avoid personal, medical or contact details.",
    publish:"Publish review",save:"Save changes",cancel:"Cancel",delete:"Delete my review",
    confirmDelete:"Delete your review of this service?",saved:"Your review has been saved.",
    deleted:"Your review has been deleted.",hidden:"Your review is under moderation and is not shown publicly.",
    prev:"Previous",next:"Next",page:"Page",loading:"Loading reviews…",retry:"Try again",
    genericError:"We couldn't complete this request. Please try again.",
    errorSignin:"Please sign in again to post a review.",
    errorRate:"Too many changes. Please try again later.",
    errorInvalid:"Please enter 1–5 stars, a public name (2–60 characters), and a review of 50–1200 characters.",
    errorPersonal:"Please remove email addresses, phone numbers and other private contact details.",
    member:"Member review",edited:"Edited",stars:"stars out of 5",
  },
  ru:{
    kicker:"Отзывы сообщества",title:"Отзывы об этой услуге",
    note:"Отзывы оставляют зарегистрированные участники Holistic House. Факт заказа или прохождения сеанса отдельно не проверен.",
    average:"Средняя оценка",reviewCount:"отзывов",empty:"Пока нет отзывов. Поделитесь реальным личным опытом первым.",
    write:"Оставить отзыв",edit:"Редактировать мой отзыв",signin:"Войти, чтобы оставить отзыв",
    owner:"Мастер не может оценивать собственные услуги.",inactive:"Завершите оформление профиля, чтобы оставить отзыв.",
    publicName:"Публичное имя",rating:"Ваша оценка",experience:"Ваш опыт",
    experienceHint:"50–1200 символов. Не добавляйте личные, медицинские данные и контакты.",
    publish:"Опубликовать отзыв",save:"Сохранить изменения",cancel:"Отмена",delete:"Удалить мой отзыв",
    confirmDelete:"Удалить ваш отзыв об этой услуге?",saved:"Отзыв сохранён.",
    deleted:"Отзыв удалён.",hidden:"Ваш отзыв скрыт на модерации и не виден другим.",
    prev:"Назад",next:"Далее",page:"Страница",loading:"Загрузка отзывов…",retry:"Повторить",
    genericError:"Не получилось выполнить действие. Попробуйте ещё раз.",
    errorSignin:"Войдите в аккаунт заново, чтобы оставить отзыв.",
    errorRate:"Слишком много изменений. Попробуйте позже.",
    errorInvalid:"Укажите 1–5 звёзд, публичное имя (2–60 символов) и отзыв длиной 50–1200 символов.",
    errorPersonal:"Удалите email, номера телефонов и контактные данные.",
    member:"Отзыв участника",edited:"Изменён",stars:"звёзд из 5",
  },
  es:{
    kicker:"Opiniones de la comunidad",title:"Opiniones sobre este servicio",
    note:"Las opiniones pertenecen a miembros registrados de Holistic House. La reserva o realización del servicio no se verifica por separado.",
    average:"Valoración media",reviewCount:"opiniones",empty:"Todavía no hay opiniones. Comparte tu experiencia real.",
    write:"Escribir opinión",edit:"Editar mi opinión",signin:"Inicia sesión para opinar",
    owner:"Los profesionales no pueden valorar sus propios servicios.",inactive:"Completa tu perfil para escribir una opinión.",
    publicName:"Nombre público",rating:"Tu valoración",experience:"Tu experiencia",
    experienceHint:"Entre 50 y 1200 caracteres. Evita datos personales, médicos o de contacto.",
    publish:"Publicar opinión",save:"Guardar cambios",cancel:"Cancelar",delete:"Eliminar mi opinión",
    confirmDelete:"¿Eliminar tu opinión sobre este servicio?",saved:"Opinión guardada.",
    deleted:"Opinión eliminada.",hidden:"Tu opinión está oculta por moderación.",
    prev:"Anterior",next:"Siguiente",page:"Página",loading:"Cargando opiniones…",retry:"Reintentar",
    genericError:"No se pudo completar la solicitud. Inténtalo de nuevo.",
    errorSignin:"Inicia sesión de nuevo para publicar una opinión.",
    errorRate:"Demasiados cambios. Inténtalo más tarde.",
    errorInvalid:"Indica entre 1 y 5 estrellas, un nombre (2–60 caracteres) y una opinión (50–1200 caracteres).",
    errorPersonal:"Elimina correos electrónicos, teléfonos y datos de contacto.",
    member:"Opinión de miembro",edited:"Editada",stars:"estrellas de 5",
  },
} as const;

function messageFor(code:string|undefined,t:typeof COPY.en|typeof COPY.ru|typeof COPY.es){
  if(code==="SIGN_IN_REQUIRED"||code==="ACCOUNT_REQUIRED")return t.errorSignin;
  if(code==="RATE_LIMITED")return t.errorRate;
  if(code==="REVIEW_PERSONAL_DATA")return t.errorPersonal;
  if(code==="INVALID_REVIEW"||code==="INVALID_RATING")return t.errorInvalid;
  return t.genericError;
}
export function ServiceReviews({serviceId,locale}:{serviceId:string;locale:string}){
  const language=locale==="ru"?"ru":locale==="es"?"es":"en";
  const t=COPY[language];
  const [data,setData]=useState<ReviewPayload|null>(null);
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [formOpen,setFormOpen]=useState(false);
  const [displayName,setDisplayName]=useState("");
  const [rating,setRating]=useState(5);
  const [body,setBody]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const refresh=useCallback(async(nextPage:number)=>{
    setLoading(true);
    try{
      const response=await fetch("/api/marketplace/reviews?serviceId="+encodeURIComponent(serviceId)+"&page="+nextPage,{
        credentials:"same-origin",cache:"no-store",
      });
      const value=await response.json();
      if(!response.ok||!value?.summary||!Array.isArray(value.reviews))throw new Error(value?.error||"SERVICE_UNAVAILABLE");
      setData(value as ReviewPayload);
      setPage(nextPage);
      setError("");
    }catch(cause){
      setError(messageFor(cause instanceof Error?cause.message:undefined,t));
    }finally{setLoading(false);}
  },[serviceId,t]);
  useEffect(()=>{void refresh(1);},[refresh]);

  const mine=data?.viewer.mine;
  const canReview=Boolean(data?.viewer.canReview);
  const bodyCharacterCount=Array.from(body.trim()).length;
  function openEditor(){
    setDisplayName(mine?.displayName||data?.viewer.suggestedName||"");
    setRating(mine?.rating||5);
    setBody(mine?.body||"");
    setError("");
    setNotice("");
    setFormOpen(true);
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(saving||Array.from(body.trim()).length<50)return;
    setSaving(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/marketplace/reviews",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({serviceId,displayName,rating,body}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"SERVICE_UNAVAILABLE");
      setFormOpen(false);
      await refresh(1);
      setNotice(t.saved);
    }catch(cause){setError(messageFor(cause instanceof Error?cause.message:undefined,t));}
    finally{setSaving(false);}
  }
  async function remove(){
    if(saving||!window.confirm(t.confirmDelete))return;
    setSaving(true);setError("");setNotice("");
    try{
      const response=await fetch("/api/marketplace/reviews",{
        method:"DELETE",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceId}),
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"SERVICE_UNAVAILABLE");
      setFormOpen(false);
      await refresh(1);
      setNotice(t.deleted);
    }catch(cause){setError(messageFor(cause instanceof Error?cause.message:undefined,t));}
    finally{setSaving(false);}
  }
  const dateLocale=language==="ru"?"ru-RU":language==="es"?"es-ES":"en-CA";
  return (
    <section id="reviews" className={styles.root} aria-labelledby="service-reviews-heading">
      <div className={styles.header}>
        <div><p className={styles.kicker}>{t.kicker}</p><h2 id="service-reviews-heading">{t.title}</h2></div>
        {data&&<div className={styles.score} aria-label={t.average}>
          <strong>{data.summary.count?data.summary.average.toFixed(1):"—"}</strong>
          <span aria-hidden="true">★</span>
          <small>{data.summary.count} {t.reviewCount}</small>
        </div>}
      </div>
      <p className={styles.note}>{t.note}</p>
      {data&&!loading&&(
        <div className={styles.actions}>
          {data.viewer.canReview&&mine?.status!=="hidden"&&
            <button type="button" className={styles.primary} onClick={openEditor}>{mine?t.edit:t.write}</button>}
          {mine?.status==="published"&&
            <button type="button" className={styles.secondary} disabled={saving} onClick={()=>void remove()}>{t.delete}</button>}
          {!data.viewer.signedIn&&<Link className={styles.primary} href={"/"+(language==="es"?"en":language)+"/app"}>{t.signin} →</Link>}
          {data.viewer.signedIn&&!data.viewer.canReview&&<span className={styles.note}>
            {data.viewer.suggestedName?t.owner:t.inactive}</span>}
          {mine?.status==="hidden"&&<span className={styles.note}>{t.hidden}</span>}
        </div>
      )}
      {formOpen&&canReview&&<form className={styles.form} onSubmit={submit}>
        <label>{t.publicName}<input value={displayName} onChange={event=>setDisplayName(event.target.value)}
          required minLength={2} maxLength={60} autoComplete="nickname"/></label>
        <fieldset className={styles.stars}><legend>{t.rating}</legend>
          {[1,2,3,4,5].map(value=><button type="button" key={value}
            aria-label={value+" "+t.stars} aria-pressed={rating===value}
            onClick={()=>setRating(value)} className={value<=rating?styles.starActive:styles.starEmpty}>★</button>)}
        </fieldset>
        <label>{t.experience}<textarea value={body} onChange={event=>setBody(event.target.value)}
          required minLength={50} maxLength={1200} rows={4}/></label>
        <p className={styles.note} aria-live="polite">{bodyCharacterCount} / 50 · {t.experienceHint}</p>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={saving||bodyCharacterCount<50}>{saving?t.loading:(mine?t.save:t.publish)}</button>
          <button type="button" className={styles.secondary} disabled={saving} onClick={()=>setFormOpen(false)}>{t.cancel}</button>
        </div>
      </form>}
      {notice&&<p className={styles.success} role="status">{notice}</p>}
      {error&&<div className={styles.error} role="alert">{error} <button type="button" onClick={()=>void refresh(page)}>{t.retry}</button></div>}
      {loading&&!data&&<p className={styles.note} role="status">{t.loading}</p>}
      {data&&!loading&&(
        <>
          {data.reviews.length===0?<p className={styles.empty}>{t.empty}</p>:
          <div className={styles.list}>
            {data.reviews.map(review=><article key={review.id} className={styles.card}>
              <div className={styles.reviewHead}>
                <span className={styles.avatar} aria-hidden="true">{review.displayName.slice(0,1).toUpperCase()}</span>
                <div><strong>{review.displayName}</strong><small>{t.member}</small></div>
                <div className={styles.stamp}><span aria-label={review.rating+" "+t.stars}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span>
                  <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(dateLocale)}</time>
                </div>
              </div>
              <p className={styles.reviewText}>{review.body}</p>
              {review.updatedAt!==review.createdAt&&<small className={styles.note}>{t.edited}</small>}
            </article>)}
          </div>}
          {(page>1||data.hasMore)&&<nav className={styles.pagination} aria-label={t.title}>
            <button type="button" disabled={page===1||loading} onClick={()=>void refresh(page-1)}>{t.prev}</button>
            <span>{t.page} {page}</span>
            <button type="button" disabled={!data.hasMore||loading} onClick={()=>void refresh(page+1)}>{t.next}</button>
          </nav>}
        </>
      )}
    </section>
  );
}
