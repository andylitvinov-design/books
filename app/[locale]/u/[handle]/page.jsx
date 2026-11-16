import Link from 'next/link'
import {notFound} from 'next/navigation'
import {getAppConfig} from '@/lib/app/config'
import {getPublicMyPage} from '@/lib/app/my-page'
import css from '@/components/app/my-page.module.css'

export const dynamic='force-dynamic'
export const revalidate=0
const C={
 en:{type:'Holistic House member',tests:'Completed tests',practices:'Completed practices',videos:'Saved videos',achievement:'Achievement',back:'Discover Holistic House',report:'Report a concern',empty:'No posts published yet.'},
 ru:{type:'Участник Holistic House',tests:'Пройденные тесты',practices:'Выполненные практики',videos:'Сохранённые видео',achievement:'Достижение',back:'Открыть Holistic House',report:'Сообщить о проблеме',empty:'Публикаций пока нет.'},
 es:{type:'Miembro de Holistic House',tests:'Tests completados',practices:'Prácticas terminadas',videos:'Vídeos guardados',achievement:'Logro',back:'Explorar Holistic House',report:'Informar de un problema',empty:'No hay publicaciones.'}
}
export async function generateMetadata({params}){
 const {locale,handle}=await params
 if(!['en','ru','es'].includes(locale))return {robots:{index:false,follow:false}}
 const data=await getPublicMyPage(getAppConfig(),handle).catch(()=>null)
 if(!data)return {robots:{index:false,follow:false},title:'Holistic House'}
 return {title:data.page.display_name+' | Holistic House',description:data.page.bio.slice(0,155),
  alternates:{canonical:'/'+locale+'/u/'+handle},
  robots:{index:true,follow:true}}
}
export default async function PublicUserPage({params}){
 const {locale,handle}=await params
 if(!['en','ru','es'].includes(locale))notFound()
 const data=await getPublicMyPage(getAppConfig(),handle).catch(()=>null)
 if(!data)notFound()
 const t=C[locale],p=data.page
 const counts=[
  p.share_tests?{key:'tests',count:p.test_count,label:t.tests}:null,
  p.share_practices?{key:'practices',count:p.practice_count,label:t.practices}:null,
  p.share_videos?{key:'videos',count:p.video_count,label:t.videos}:null
 ].filter(Boolean)
 const date=value=>{try{return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{dateStyle:'medium'}).format(new Date(value))}catch{return ''}}
 return <main className={css.page} data-public-my-page>
   <div className={css.top}><Link href={'/'+locale} prefetch={false}>‹ {t.back}</Link>
    <Link href={'/'+locale+'/my-page'} prefetch={false}>{locale==='ru'?'Моя страница':locale==='es'?'Mi página':'My Page'}</Link></div>
   <section className={css.card}>
     <div className={css.identity}><span className={css.avatar} aria-hidden="true">{p.display_name[0]?.toUpperCase()||'H'}</span>
       <div><p className={css.kicker}>{t.type}</p><h1>{p.display_name}</h1><p>@{p.handle}</p></div></div>
     {p.bio?<p className={css.bio}>{p.bio}</p>:null}
     {counts.length?<div className={css.counter}>{counts.map(c=><div key={c.key}>
       <strong>{c.count}</strong><span>{c.label}</span></div>)}</div>:null}
   </section>
   <section className={css.card}>
     <h2>{locale==='ru'?'Лента публикаций':locale==='es'?'Publicaciones':'Activity feed'}</h2>
     {!data.items.length?<p className={css.empty}>{t.empty}</p>:null}
     <div className={css.feed}>{data.items.map(item=><article key={item.id} className={css.entry}>
       <time dateTime={item.created_at}>{date(item.created_at)}</time>
       {item.kind==='post'?<p>{item.body}</p>:null}
       {item.kind==='achievement'?<h3>{t.achievement}: {item.achievement_value} {t[item.achievement_type]||item.achievement_type}</h3>:null}
       {item.kind==='video'?<><h3>{item.title}</h3><video controls playsInline preload="none"
         aria-label={item.title} src={'/api/public/my-page/video/'+item.id}/></>:null}
     </article>)}</div>
   </section>
   <p className={css.small}><Link href={'/'+locale+'/contact'} prefetch={false}>{t.report}</Link></p>
 </main>
}
