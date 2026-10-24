"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./practitioner-article-social.module.css";

type SocialCount = { likes: number; comments: number };
export type PublicComment = { id: string; displayName: string; body: string; createdAt: string };

const copy = {
 en: {
  like: "Like", unlike: "Unlike", comments: "Comments", count: "comments",
  signIn: "Sign in with Google from your cabinet and return to join the discussion.",
  openCabinet: "Sign in", error: "Action unavailable. Try again.",
  title: "Join the discussion", approved: "Approved comments", noComments: "No published comments yet. Start a thoughtful conversation.",
  name: "Public display name", namePlaceholder: "How should your name appear?",
  body: "Your comment", bodyPlaceholder: "Share a question or thoughtful response…",
  consent: "I agree that my chosen name and comment may appear publicly after moderation.",
  send: "Submit comment", sending: "Submitting…", received: "Your comment was received and is awaiting review.",
  moderation: "Comments are reviewed before publication. Please avoid medical details, advertising links and client stories.",
 },
 ru: {
  like: "Нравится", unlike: "Убрать лайк", comments: "Комментарии", count: "комментариев",
  signIn: "Войдите через Google в кабинете и вернитесь к публикации, чтобы участвовать в обсуждении.",
  openCabinet: "Войти", error: "Действие недоступно. Попробуйте ещё раз.",
  title: "Обсудить публикацию", approved: "Опубликованные комментарии", noComments: "Пока нет комментариев. Вы можете начать обсуждение.",
  name: "Имя для публикации", namePlaceholder: "Как показывать ваше имя?",
  body: "Ваш комментарий", bodyPlaceholder: "Поделитесь вопросом или впечатлением о теме…",
  consent: "Я согласен(-на) на публичный показ указанного имени и комментария после модерации.",
  send: "Отправить комментарий", sending: "Отправляем…", received: "Комментарий получен и ожидает модерации.",
  moderation: "Комментарии проходят проверку. Не публикуйте медицинские данные, рекламу и личные истории клиентов.",
 },
 es: {
  like: "Me gusta", unlike: "Quitar me gusta", comments: "Comentarios", count: "comentarios",
  signIn: "Inicia sesión con Google en tu cuenta y vuelve para participar.",
  openCabinet: "Iniciar sesión", error: "Acción no disponible. Inténtalo de nuevo.",
  title: "Participa en la conversación", approved: "Comentarios aprobados", noComments: "Todavía no hay comentarios publicados. Puedes iniciar la conversación.",
  name: "Nombre visible", namePlaceholder: "¿Cómo quieres aparecer?",
  body: "Tu comentario", bodyPlaceholder: "Comparte una pregunta o reflexión…",
  consent: "Acepto que mi nombre elegido y comentario se publiquen tras la moderación.",
  send: "Enviar comentario", sending: "Enviando…", received: "Comentario recibido, pendiente de moderación.",
  moderation: "Los comentarios se revisan antes de publicarse. No incluyas datos médicos, publicidad ni historias privadas de clientes.",
 },
} as const;

function useLike(articleId: string, initialLikes: number, locale: PublicLocale) {
 const [likes,setLikes]=useState(initialLikes);
 const [liked,setLiked]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const t=copy[locale];
 async function toggle(){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/app/community/likes",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({articleId})});
   const data=await r.json().catch(()=>({}));
   if(r.status===401){setError(t.signIn);return;}
   if(!r.ok||typeof data.liked!=="boolean"||!Number.isInteger(data.likes))throw Error("NOT_SAVED");
   setLiked(data.liked);setLikes(data.likes);
  }catch{setError(t.error);}
  finally{setBusy(false);}
 }
 return {likes,liked,busy,error,toggle};
}

function SignInHint({locale}: {locale:PublicLocale}) {
 const t=copy[locale];
 return <Link href={"/"+(locale==="es"?"en":locale)+"/app"} prefetch={false} className={styles.signIn}>{t.openCabinet} →</Link>;
}

export function ArticleSocialBar({locale,articleId,commentHref,initialLikes=0,commentCount=0}: {
 locale:PublicLocale;articleId:string;commentHref:string;initialLikes?:number;commentCount?:number;
}) {
 const t=copy[locale],like=useLike(articleId,initialLikes,locale);
 return <div className={styles.wrap} data-article-social={articleId}>
  <div className={styles.bar}>
   <button type="button" className={styles.like} aria-pressed={like.liked===true}
    aria-label={(like.liked?t.unlike:t.like)+" · "+like.likes} disabled={like.busy}
    onClick={like.toggle}><Heart size={18} fill={like.liked?"currentColor":"none"} aria-hidden="true"/>
    <span>{t.like} · {like.likes}</span></button>
   <Link href={commentHref} className={styles.comments}><MessageCircle size={18} aria-hidden="true" />
    <span>{t.comments} · {commentCount}</span></Link>
  </div>
  {like.error&&<p role="status" className={styles.warning}>{like.error} {like.error===t.signIn&&<SignInHint locale={locale}/>}</p>}
 </div>;
}

export function ArticleDiscussion({locale,articleId,initialComments,initialStats}: {
 locale:PublicLocale;articleId:string;initialComments:PublicComment[];initialStats:SocialCount;
}) {
 const t=copy[locale];
 const [name,setName]=useState(""),[body,setBody]=useState("");
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(""),[error,setError]=useState(""),[needsAuth,setNeedsAuth]=useState(false);
 const operation=useRef<string|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||!consent)return;
  setBusy(true);setNotice("");setError("");setNeedsAuth(false);
  if(!operation.current)operation.current=crypto.randomUUID();
  try{
   const r=await fetch("/api/app/community/comments",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({articleId,operationId:operation.current,
      displayName:name,body,consent:true}),
   });
   const data=await r.json().catch(()=>({}));
   if(r.status===401){setNeedsAuth(true);setError(t.signIn);return;}
   if(!r.ok||data.saved!==true||data.status!=="pending")throw Error("NOT_SAVED");
   setNotice(t.received);setBody("");setConsent(false);operation.current=null;
  }catch{setError(t.error);}
  finally{setBusy(false);}
 }
 return <section className={styles.discussion} id="discussion" aria-labelledby="article-discussion-title" data-article-discussion>
   <h2 id="article-discussion-title">{t.title}</h2>
   <ArticleSocialBar locale={locale} articleId={articleId} commentHref="#approved-comments"
    initialLikes={initialStats.likes} commentCount={initialStats.comments}/>
   <div className={styles.commentList} id="approved-comments">
    <h3>{t.approved} · {initialStats.comments}</h3>
    {initialComments.length?initialComments.map(comment=><article className={styles.comment} key={comment.id}>
     <div className={styles.byline}><strong>{comment.displayName}</strong>
      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString(locale)}</time></div>
     <p>{comment.body}</p>
    </article>):<p className={styles.empty}>{t.noComments}</p>}
   </div>
   <form className={styles.form} onSubmit={submit}>
    <label>{t.name}<input required minLength={2} maxLength={60} autoComplete="nickname"
      value={name} onChange={event=>setName(event.target.value)} placeholder={t.namePlaceholder}/></label>
    <label>{t.body}<textarea required minLength={5} maxLength={800} rows={4}
      value={body} onChange={event=>{setBody(event.target.value);operation.current=null}}
      placeholder={t.bodyPlaceholder}/></label>
    <label className={styles.consent}><input type="checkbox" checked={consent}
      onChange={event=>setConsent(event.target.checked)} required/><span>{t.consent}</span></label>
    <button type="submit" className={styles.submit} disabled={busy||!consent}>
     <Send size={17} aria-hidden="true"/>{busy?t.sending:t.send}</button>
    <p className={styles.moderation}>{t.moderation}</p>
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    {error&&<p role="alert" className={styles.warning}>{error} {needsAuth&&<SignInHint locale={locale}/>}</p>}
   </form>
  </section>;
}
