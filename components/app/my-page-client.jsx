'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './my-page.module.css'

const C={
en:{title:'My Page',lead:'Your personal space to share videos, achievements and diary notes.',back:'Profile',login:'Continue with Google',guest:'Sign in to create your personal page. You decide what becomes public.',retry:'Try again',loading:'Loading your page…',error:'The action was not completed. Your private data stays private.',saved:'Changes saved.',name:'Public name',handle:'Page address',bio:'About me',saveProfile:'Save page details',publishPage:'Publish my page',unpublish:'Make page private',open:'Open public page',privacy:'A new page and every entry stay private until you publish them yourself.',stats:'My verified activity',tests:'Completed tests',practices:'Completed practices',videos:'Saved videos',shareStats:'Choose the counts visitors may see',shareTests:'Show test count',sharePractices:'Show practice count',shareVideos:'Show saved-video count',saveStats:'Save shared statistics',milestone:'Add achievement',videoTitle:'My videos',noVideos:'No completed videos saved in My Videos yet.',library:'Open My Videos',addVideo:'Add to page privately',feed:'My diary and achievements',write:'Write something about your day…',post:'Save diary entry privately',noPosts:'There are no diary entries yet.',public:'Public',private:'Private',show:'Publish',hide:'Hide',remove:'Delete',edit:'Edit',saveEdit:'Save edit privately',cancel:'Cancel',achievement:'Achievement',video:'Video',postType:'Diary',signingIn:'Connecting to Google…',handleHelp:'3–30 lowercase Latin letters, numbers or hyphens. Changing it changes your page link.'},
ru:{title:'Моя страница',lead:'Личная страница с видео, достижениями и дневниковой лентой.',back:'Профиль',login:'Войти через Google',guest:'Войдите, чтобы открыть свою страницу. Вы сами решаете, что публиковать.',retry:'Повторить',loading:'Открываем страницу…',error:'Действие не выполнено. Личные данные остались закрытыми.',saved:'Изменения сохранены.',name:'Публичное имя',handle:'Адрес страницы',bio:'О себе',saveProfile:'Сохранить профиль',publishPage:'Опубликовать страницу',unpublish:'Сделать приватной',open:'Открыть мою страницу',privacy:'Новая страница и каждая запись остаются приватными, пока вы сами их не опубликуете.',stats:'Мои подтверждённые достижения',tests:'Пройденные тесты',practices:'Выполненные практики',videos:'Сохранённые видео',shareStats:'Выберите, какую статистику показывать другим',shareTests:'Показывать число тестов',sharePractices:'Показывать число практик',shareVideos:'Показывать число видео',saveStats:'Сохранить видимость статистики',milestone:'Добавить достижение',videoTitle:'Мои видео',noVideos:'В «Моих видео» пока нет подтверждённо сохранённых роликов.',library:'Открыть Мои видео',addVideo:'Добавить на страницу приватно',feed:'Мой дневник и достижения',write:'О чём хочется рассказать сегодня…',post:'Сохранить запись приватно',noPosts:'Пока нет записей дневника.',public:'Публично',private:'Приватно',show:'Опубликовать',hide:'Скрыть',remove:'Удалить',edit:'Изменить',saveEdit:'Сохранить исправление приватно',cancel:'Отмена',achievement:'Достижение',video:'Видео',postType:'Дневник',signingIn:'Переход к Google…',handleHelp:'3–30 латинских строчных букв, цифр или дефисов. Изменение адреса меняет ссылку на страницу.'},
es:{title:'Mi página',lead:'Tu espacio personal para compartir vídeos, logros y notas.',back:'Perfil',login:'Continuar con Google',guest:'Inicia sesión para crear tu página. Tú decides qué publicar.',retry:'Reintentar',loading:'Cargando…',error:'No se completó la acción. Tus datos privados siguen protegidos.',saved:'Cambios guardados.',name:'Nombre público',handle:'Dirección de página',bio:'Sobre mí',saveProfile:'Guardar perfil',publishPage:'Publicar mi página',unpublish:'Hacer privada',open:'Abrir mi página',privacy:'La página y cada entrada son privadas hasta que decidas publicarlas.',stats:'Mi actividad verificada',tests:'Tests completados',practices:'Prácticas terminadas',videos:'Vídeos guardados',shareStats:'Elige las estadísticas visibles',shareTests:'Mostrar tests',sharePractices:'Mostrar prácticas',shareVideos:'Mostrar vídeos',saveStats:'Guardar visibilidad',milestone:'Añadir logro',videoTitle:'Mis vídeos',noVideos:'Aún no hay vídeos guardados y verificados.',library:'Abrir Mis vídeos',addVideo:'Añadir a página en privado',feed:'Mi diario y logros',write:'Escribe sobre tu día…',post:'Guardar entrada privada',noPosts:'No hay publicaciones todavía.',public:'Público',private:'Privado',show:'Publicar',hide:'Ocultar',remove:'Eliminar',edit:'Editar',saveEdit:'Guardar edición privada',cancel:'Cancelar',achievement:'Logro',video:'Vídeo',postType:'Diario',signingIn:'Conectando con Google…',handleHelp:'3–30 letras latinas minúsculas, números o guiones. Si cambias la dirección, cambia el enlace.'}
}
function dateOf(value,locale){try{return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{dateStyle:'medium'}).format(new Date(value))}catch{return ''}}
export default function MyPageClient({locale='en'}){
 const t=C[locale]||C.en
 const cabinetLocale=locale==='es'?'en':locale
 const [status,setStatus]=useState('loading')
 const [data,setData]=useState(null)
 const [profile,setProfile]=useState({handle:'',displayName:'',bio:''})
 const [shared,setShared]=useState({shareTests:false,sharePractices:false,shareVideos:false})
 const [entry,setEntry]=useState('')
 const [editing,setEditing]=useState(null)
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const load=useCallback(async()=>{
   try{
     const next=await appFetch('my-page')
     setData(next)
     setProfile(next.page?{handle:next.page.handle,displayName:next.page.display_name,bio:next.page.bio}:{handle:next.suggested?.handle||'',displayName:next.suggested?.name||'',bio:''})
     setShared(next.page?{shareTests:next.page.share_tests,sharePractices:next.page.share_practices,shareVideos:next.page.share_videos}:{shareTests:false,sharePractices:false,shareVideos:false})
     setStatus('ready')
   }catch(err){setStatus(err?.code==='SIGN_IN_REQUIRED'?'guest':'error')}
 },[])
 useEffect(()=>{void load()},[load])
 async function perform(payload,{onSuccess}={}){
  if(busy)return
  setBusy(true);setNotice('')
  try{await appFetch('my-page',payload,'POST');await load();onSuccess?.();setNotice(t.saved)}
  catch(err){setNotice((err?.code==='PUBLIC_HANDLE_TAKEN'?'PUBLIC_HANDLE_TAKEN · ':err?.code==='INVALID_PUBLIC_HANDLE'?'INVALID_PUBLIC_HANDLE · ':err?.code==='PAGE_ITEM_LIMIT'?'PAGE_ITEM_LIMIT · ':'')+t.error)}
  finally{setBusy(false)}
 }
 async function google(){
  if(busy)return
  setBusy(true);setNotice(t.signingIn)
  try{const result=await appFetch('auth/start',{locale:cabinetLocale},'POST');if(!result?.redirectUrl)throw Error('UNAVAILABLE');window.location.assign(result.redirectUrl)}
  catch{setNotice(t.error);setBusy(false)}
 }
 const page=data?.page
 const link=page?'/' + locale + '/u/' + page.handle:''
 const stats=data?.stats||{}
 const tags=[['tests',t.tests],['practices',t.practices],['videos',t.videos]]
 return <main className={css.page} data-universal-my-page>
  <div className={css.top}><Link href={'/'+cabinetLocale+'/app/portrait'} prefetch={false}>‹ {t.back}</Link>
   <Link href={'/'+locale+'/practice'} prefetch={false}>Work</Link></div>
  <p className={css.kicker}>HOLISTIC HOUSE · LIFE & WORK</p><h1>{t.title}</h1><p>{t.lead}</p>
  {status==='loading'?<p role="status">{t.loading}</p>:null}
  {status==='error'?<section className={css.card}><p className={css.error}>{t.error}</p><button className={css.secondary} onClick={()=>void load()}>{t.retry}</button></section>:null}
  {status==='guest'?<section className={css.card}><p>{t.guest}</p>
    <button className={css.button} type="button" disabled={busy} onClick={()=>void google()} data-my-page-google>{t.login}</button></section>:null}
  {notice?<p role="status" className={notice===t.saved?css.notice:css.error}>{notice}</p>:null}
  {status==='ready'&&data?<>
   <section className={css.card} aria-label={t.title}>
    <div className={css.row}><h2>{t.title}</h2>
      {page?.is_published?<Link href={link} className={css.secondary} prefetch={false}>{t.open}</Link>:<span className={css.pill+' '+css.private}>{t.private}</span>}
    </div>
    <label className={css.label} htmlFor="my-page-name">{t.name}</label>
    <input id="my-page-name" className={css.field} maxLength={80} value={profile.displayName}
      onChange={e=>setProfile({...profile,displayName:e.target.value})}/>
    <label className={css.label} htmlFor="my-page-handle">{t.handle}</label>
    <input id="my-page-handle" className={css.field} maxLength={30} pattern="[a-z][a-z0-9-]{2,29}" autoCapitalize="none" spellCheck={false} value={profile.handle}
      onChange={e=>setProfile({...profile,handle:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/>
    <p className={css.small}>{t.handleHelp}</p>
    <label className={css.label} htmlFor="my-page-bio">{t.bio}</label>
    <textarea id="my-page-bio" className={css.area} maxLength={420} rows={3}
      value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})}/>
    <div className={css.actions}>
     <button type="button" className={css.button} disabled={busy||profile.displayName.trim().length<2||profile.handle.length<3}
       onClick={()=>void perform({action:'saveProfile',handle:profile.handle,displayName:profile.displayName,bio:profile.bio})}>{t.saveProfile}</button>
     {page?<button type="button" className={page.is_published?css.secondary:css.button} disabled={busy}
       onClick={()=>void perform({action:'setPublished',published:!page.is_published})}>{page.is_published?t.unpublish:t.publishPage}</button>:null}
    </div><p className={css.small}>{t.privacy}</p>
   </section>
   <section className={css.card} aria-label={t.stats}>
    <h2>{t.stats}</h2><div className={css.grid}>{tags.map(([key,title])=><div className={css.stat} key={key}>
      <strong>{stats[key]??0}</strong><span>{title}</span>
      <button className={css.secondary} type="button" disabled={busy||!page||!stats[key]}
       onClick={()=>void perform({action:'addAchievement',achievement:key})}>{t.milestone}</button>
    </div>)}</div>
    <p className={css.small}>{t.shareStats}</p>
    {page?<>
     <label className={css.check}><input type="checkbox" checked={shared.shareTests} onChange={e=>setShared({...shared,shareTests:e.target.checked})}/>{t.shareTests}</label>
     <label className={css.check}><input type="checkbox" checked={shared.sharePractices} onChange={e=>setShared({...shared,sharePractices:e.target.checked})}/>{t.sharePractices}</label>
     <label className={css.check}><input type="checkbox" checked={shared.shareVideos} onChange={e=>setShared({...shared,shareVideos:e.target.checked})}/>{t.shareVideos}</label>
     <button className={css.secondary} type="button" disabled={busy} onClick={()=>void perform({action:'shareStats',...shared})}>{t.saveStats}</button>
    </>:null}
   </section>
   <section className={css.card} aria-label={t.videoTitle}><div className={css.row}><h2>{t.videoTitle}</h2>
    <Link href={'/'+cabinetLocale+'/app/videos'} className={css.secondary} prefetch={false}>{t.library}</Link></div>
    {!data.videos?.length?<p className={css.empty}>{t.noVideos}</p>:
      <div className={css.preview}>{data.videos.map(v=><div className={css.previewItem} key={v.id}>
        <strong>{v.theme} · {v.duration_seconds}s</strong><p className={css.small}>{dateOf(v.ready_at,locale)}</p>
        <button className={css.secondary} type="button" disabled={!page||busy}
        onClick={()=>void perform({action:'addVideo',videoId:v.id,title:v.theme+' · '+v.duration_seconds+'s'})}>{t.addVideo}</button>
      </div>)}</div>}
   </section>
   <section className={css.card} aria-label={t.feed}><h2>{t.feed}</h2>
    <label className={css.label} htmlFor="my-page-entry">{t.postType}</label>
    <textarea id="my-page-entry" className={css.area} maxLength={1200} rows={3} placeholder={t.write}
      value={entry} onChange={e=>setEntry(e.target.value)}/>
    <div className={css.actions}><button className={css.button} type="button" disabled={!page||busy||!entry.trim()}
       onClick={()=>void perform({action:'addPost',body:entry},{onSuccess:()=>setEntry('')})}>{t.post}</button></div>
    <div className={css.feed}>{!data.items?.length?<p className={css.empty}>{t.noPosts}</p>:
      data.items.map(item=><article className={css.entry} key={item.id}>
       <div className={css.row}><span className={css.pill+(item.visibility==='public'?'':' '+css.private)}>{item.visibility==='public'?t.public:t.private}</span>
        <time dateTime={item.created_at}>{dateOf(item.created_at,locale)}</time></div>
       {item.kind==='post'? editing?.id===item.id?
        <><textarea className={css.area} maxLength={1200} rows={4} value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/>
          <div className={css.actions}><button className={css.secondary} type="button" disabled={busy||!editing.body.trim()}
          onClick={()=>void perform({action:'editPost',itemId:item.id,body:editing.body},{onSuccess:()=>setEditing(null)})}>{t.saveEdit}</button>
          <button className={css.secondary} type="button" onClick={()=>setEditing(null)}>{t.cancel}</button></div></>
        :<p>{item.body}</p>:null}
       {item.kind==='video'?<><h3>{t.video}: {item.title}</h3>
        {item.visibility==='public'&&page?.is_published?<video controls playsInline preload="none" src={'/api/public/my-page/video/'+item.id} />:
        <Link href={'/'+cabinetLocale+'/app/videos'} prefetch={false}>{t.library}</Link>}</>:null}
       {item.kind==='achievement'?<h3>{t.achievement}: {item.achievement_value} {tags.find(([key])=>key===item.achievement_type)?.[1]||item.achievement_type}</h3>:null}
       <div className={css.actions}>
        <button type="button" className={css.secondary} disabled={busy||(!page?.is_published&&item.visibility!=='public')}
         onClick={()=>void perform({action:'setVisibility',itemId:item.id,visibility:item.visibility==='public'?'private':'public'})}>
          {item.visibility==='public'?t.hide:t.show}</button>
        {item.kind==='post'&&editing?.id!==item.id?<button className={css.secondary} type="button" disabled={busy}
         onClick={()=>setEditing({id:item.id,body:item.body})}>{t.edit}</button>:null}
        <button className={css.danger} type="button" disabled={busy}
         onClick={()=>void perform({action:'deleteItem',itemId:item.id})}>{t.remove}</button>
       </div>
      </article>)}</div>
   </section>
  </>:null}
 </main>
}
