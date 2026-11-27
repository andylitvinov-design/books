'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {appFetch} from '@/lib/app/client-fetch'
import css from './my-page.module.css'
import ProfilePersonalSummary from './profile-personal-summary'
import CoachPersonalMemoryPanel from './coach-personal-memory-panel'

const C={
en:{title:'My Page',lead:'Your personal space to share videos, achievements and diary notes.',back:'Profile',login:'Continue with Google',guest:'Sign in to create your personal page. You decide what becomes public.',retry:'Try again',loading:'Loading your page…',error:'The action was not completed. Your private data stays private.',saved:'Changes saved.',name:'Public name',handle:'Page address',bio:'About me',saveProfile:'Save page details',publishPage:'Publish my page',unpublish:'Make page private',open:'Open public page',privacy:'Your diary is always private. You can choose whether to share your page, videos or achievements.',stats:'My verified activity',tests:'Completed tests',practices:'Completed practices',videos:'Saved videos',shareStats:'Choose the counts visitors may see',shareTests:'Show test count',sharePractices:'Show practice count',shareVideos:'Show saved-video count',saveStats:'Save shared statistics',milestone:'Add achievement',videoTitle:'My videos',noVideos:'No completed videos saved in My Videos yet.',library:'Open My Videos',addVideo:'Add to page privately',feed:'My private feed',feedPrivacy:'🔒 This is your personal, confidential space. Your notes and plans are visible only to you and are never shown on your public page.',write:'Write a plan, note or reflection…',post:'Publish',posted:'Published to your private feed.',publishing:'Publishing…',otherFeed:'My videos and achievements',noPosts:'There are no diary entries yet.',public:'Public',private:'Private',show:'Publish',hide:'Hide',remove:'Delete',edit:'Edit',saveEdit:'Save edit privately',cancel:'Cancel',achievement:'Achievement',video:'Video',postType:'Diary',signingIn:'Connecting to Google…',handleHelp:'3–30 lowercase Latin letters, numbers or hyphens. Changing it changes your page link.'},
ru:{title:'Моя страница',lead:'Личная страница с видео, достижениями и дневниковой лентой.',back:'Профиль',login:'Войти через Google',guest:'Войдите, чтобы открыть свою страницу. Вы сами решаете, что публиковать.',retry:'Повторить',loading:'Открываем страницу…',error:'Действие не выполнено. Личные данные остались закрытыми.',saved:'Изменения сохранены.',name:'Публичное имя',handle:'Адрес страницы',bio:'О себе',saveProfile:'Сохранить профиль',publishPage:'Опубликовать страницу',unpublish:'Сделать приватной',open:'Открыть мою страницу',privacy:'Дневник всегда приватный. Вы можете отдельно выбрать видимость страницы, видео и достижений.',stats:'Мои подтверждённые достижения',tests:'Пройденные тесты',practices:'Выполненные практики',videos:'Сохранённые видео',shareStats:'Выберите, какую статистику показывать другим',shareTests:'Показывать число тестов',sharePractices:'Показывать число практик',shareVideos:'Показывать число видео',saveStats:'Сохранить видимость статистики',milestone:'Добавить достижение',videoTitle:'Мои видео',noVideos:'В «Моих видео» пока нет подтверждённо сохранённых роликов.',library:'Открыть Мои видео',addVideo:'Добавить на страницу приватно',feed:'Моя личная лента',feedPrivacy:'🔒 Это ваше личное, конфиденциальное пространство. Заметки и планы видны только вам и не отображаются на публичной странице.',write:'Напишите план, заметку или мысли…',post:'Опубликовать',posted:'Запись опубликована в вашей личной ленте.',publishing:'Публикуем…',otherFeed:'Мои видео и достижения',noPosts:'Пока нет записей дневника.',public:'Публично',private:'Приватно',show:'Опубликовать',hide:'Скрыть',remove:'Удалить',edit:'Изменить',saveEdit:'Сохранить исправление приватно',cancel:'Отмена',achievement:'Достижение',video:'Видео',postType:'Дневник',signingIn:'Переход к Google…',handleHelp:'3–30 латинских строчных букв, цифр или дефисов. Изменение адреса меняет ссылку на страницу.'},
es:{title:'Mi página',lead:'Tu espacio personal para compartir vídeos, logros y notas.',back:'Perfil',login:'Continuar con Google',guest:'Inicia sesión para crear tu página. Tú decides qué publicar.',retry:'Reintentar',loading:'Cargando…',error:'No se completó la acción. Tus datos privados siguen protegidos.',saved:'Cambios guardados.',name:'Nombre público',handle:'Dirección de página',bio:'Sobre mí',saveProfile:'Guardar perfil',publishPage:'Publicar mi página',unpublish:'Hacer privada',open:'Abrir mi página',privacy:'El diario siempre es privado. Puedes elegir si compartes tu página, vídeos o logros.',stats:'Mi actividad verificada',tests:'Tests completados',practices:'Prácticas terminadas',videos:'Vídeos guardados',shareStats:'Elige las estadísticas visibles',shareTests:'Mostrar tests',sharePractices:'Mostrar prácticas',shareVideos:'Mostrar vídeos',saveStats:'Guardar visibilidad',milestone:'Añadir logro',videoTitle:'Mis vídeos',noVideos:'Aún no hay vídeos guardados y verificados.',library:'Abrir Mis vídeos',addVideo:'Añadir a página en privado',feed:'Mi diario privado',feedPrivacy:'🔒 Este es tu espacio personal y confidencial. Solo tú puedes ver tus notas y planes; nunca aparecen en tu página pública.',write:'Escribe un plan, una nota o una reflexión…',post:'Publicar',posted:'Publicación guardada en tu diario privado.',publishing:'Publicando…',otherFeed:'Mis vídeos y logros',noPosts:'No hay publicaciones todavía.',public:'Público',private:'Privado',show:'Publicar',hide:'Ocultar',remove:'Eliminar',edit:'Editar',saveEdit:'Guardar edición privada',cancel:'Cancelar',achievement:'Logro',video:'Vídeo',postType:'Diario',signingIn:'Conectando con Google…',handleHelp:'3–30 letras latinas minúsculas, números o guiones. Si cambias la dirección, cambia el enlace.'}
}
function dateOf(value,locale){try{return new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{dateStyle:'medium'}).format(new Date(value))}catch{return ''}}
export default function MyPageClient({locale='en',ownerMemorySearch=false,ownerMemorySelection=false}){
 const t=C[locale]||C.en
 const cabinetLocale=locale==='es'?'en':locale
 const [status,setStatus]=useState('loading')
 const [data,setData]=useState(null)
 const [profile,setProfile]=useState({handle:'',displayName:'',bio:''})
 const [entry,setEntry]=useState('')
 const [postNotice,setPostNotice]=useState('')
 const [posting,setPosting]=useState(false)
 const [editing,setEditing]=useState(null)
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const [editingProfile,setEditingProfile]=useState(false)
 const load=useCallback(async()=>{
   try{
     const next=await appFetch('my-page')
     setData(next)
     setProfile(next.page?{handle:next.page.handle,displayName:next.page.display_name,bio:next.page.bio}:{handle:next.suggested?.handle||'',displayName:next.suggested?.name||'',bio:''})
     setStatus('ready')
   }catch(err){setStatus(err?.code==='SIGN_IN_REQUIRED'?'guest':'error')}
 },[])
 useEffect(()=>{void load()},[load])
 async function perform(payload,{onSuccess}={}){
  if(busy)return
  setBusy(true);setNotice('')
  try{await appFetch('my-page',payload,'POST',{accountId:data?.accountId});await load();onSuccess?.();setNotice(t.saved)}
  catch(err){setNotice((err?.code==='PUBLIC_HANDLE_TAKEN'?'PUBLIC_HANDLE_TAKEN · ':err?.code==='INVALID_PUBLIC_HANDLE'?'INVALID_PUBLIC_HANDLE · ':err?.code==='PAGE_ITEM_LIMIT'?'PAGE_ITEM_LIMIT · ':'')+t.error)}
  finally{setBusy(false)}
 }
 async function publishEntry(){
  if(busy||posting||!entry.trim()||!data?.accountId)return
  const body=entry.trim()
  setBusy(true);setPosting(true);setPostNotice('')
  try{
   const result=await appFetch('my-page',{action:'addPost',body},'POST',{accountId:data.accountId})
   if(!result?.ok||!result.item?.id||result.item.kind!=='post'||result.item.visibility!=='private')throw Error('UNAVAILABLE')
   setData(current=>current?{...current,page:current.page||result.page||null,items:[result.item,...(current.items||[]).filter(item=>item.id!==result.item.id)]}:current)
   if(!data.page&&result.page)setProfile({handle:result.page.handle,displayName:result.page.display_name,bio:result.page.bio})
   setEntry('');setPostNotice(t.posted)
  }catch{setPostNotice(t.error)}
  finally{setPosting(false);setBusy(false)}
 }
 async function google(){
  if(busy)return
  setBusy(true);setNotice(t.signingIn)
  try{const result=await appFetch('auth/start',{locale:cabinetLocale},'POST');if(!result?.redirectUrl)throw Error('UNAVAILABLE');window.location.assign(result.redirectUrl)}
  catch{setNotice(t.error);setBusy(false)}
 }
 const page=data?.page
 const link=page?'/' + locale + '/u/' + page.handle:''
 const tags=[['tests',t.tests],['practices',t.practices],['videos',t.videos]]
 const posts=(data?.items||[]).filter(item=>item.kind==='post')
 const otherItems=(data?.items||[]).filter(item=>item.kind!=='post')
 const renderItem=item=><article className={css.entry} key={item.id}>
       <div className={css.row}><span className={css.pill+(item.kind!=='post'&&item.visibility==='public'?'':' '+css.private)}>{item.kind!=='post'&&item.visibility==='public'?t.public:t.private}</span>
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
        {item.kind!=='post'?<button type="button" className={css.secondary} disabled={busy||(!page?.is_published&&item.visibility!=='public')}
         onClick={()=>void perform({action:'setVisibility',itemId:item.id,visibility:item.visibility==='public'?'private':'public'})}>
          {item.visibility==='public'?t.hide:t.show}</button>:null}
        {item.kind==='post'&&editing?.id!==item.id?<button className={css.secondary} type="button" disabled={busy}
         onClick={()=>setEditing({id:item.id,body:item.body})}>{t.edit}</button>:null}
        <button className={css.danger} type="button" disabled={busy}
         onClick={()=>void perform({action:'deleteItem',itemId:item.id})}>{t.remove}</button>
       </div>
      </article>
 return <main className={css.page} data-universal-my-page data-cabinet-theme="daybook">
  <nav className={css.socialModes} data-profile-mode-switch data-profile-mode-active="live" aria-label={locale==='ru'?'Страницы профиля':locale==='es'?'Páginas del perfil':'Profile pages'}>
    <Link href={'/'+locale+'/my-page'} data-profile-mode="live" prefetch={false} aria-current="page">{locale==='ru'?'Моя страничка':locale==='es'?'Mi página':'My Page'}</Link>
    <Link href={'/'+locale+'/practice'} data-profile-mode="work" prefetch={false}>{locale==='ru'?'Профиль мастера':locale==='es'?'Perfil profesional':'Practitioner profile'}</Link>
   </nav>
  {status==='loading'?<p role="status">{t.loading}</p>:null}
  {(status==='guest'||status==='error')?<section className={css.card} data-my-page-public-fallback={status}>
    {status==='error'?<><p className={css.error}>{t.error}</p><button className={css.secondary} type="button" onClick={()=>void load()}>{t.retry}</button></>:<><p>{t.guest}</p>
    <button className={css.button} type="button" disabled={busy} onClick={()=>void google()} data-my-page-google>{t.login}</button></>}
    <div className={css.actions}><Link className={css.secondary} href={locale==='es'?'/es/app/portrait?discover=programs':'/'+cabinetLocale+'/app/portrait'} prefetch={false} data-my-page-discover>{({en:'Explore programs and tests',ru:'Посмотреть программы и тесты',es:'Explorar programas y tests'})[locale]||'Explore programs and tests'}</Link>
    <Link className={css.secondary} href={'/'+locale+'/holistic-support/mandala'} prefetch={false} data-my-page-my-video>MyVideo</Link></div></section>:null}
  {notice?<p role="status" className={notice===t.saved?css.notice:css.error}>{notice}</p>:null}
  {status==='ready'&&data?<>
   <ProfilePersonalSummary locale={locale} profile={profile} data={data} busy={busy}
       onEdit={()=>setEditingProfile(true)}
       onAddVideo={video=>void perform({action:'addVideo',videoId:video.id,title:video.theme+' · '+video.duration_seconds+'s'})}/>
   {ownerMemorySearch&&data.accountId?<CoachPersonalMemoryPanel key={data.accountId} accountId={data.accountId} locale={locale} selectionEnabled={ownerMemorySelection}/>:null}
   <p data-my-page-media-library style={{margin:'12px 0'}}>
     <Link href={'/'+locale+'/app/videos?tab=avatars'} className={css.secondary} prefetch={false}>
       {locale==='ru'?'Мои материалы · AI-аватары, видео, фотографии':
         locale==='es'?'Mis materiales · Avatares IA, vídeos, fotos':
           'My Materials · AI Avatars, Videos, Photos'}
     </Link>
   </p>
   {editingProfile?<>
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
       onClick={()=>void perform({action:'saveProfile',handle:profile.handle,displayName:profile.displayName,bio:profile.bio},{onSuccess:()=>setEditingProfile(false)})}>{t.saveProfile}</button>
     {page?<button type="button" className={page.is_published?css.secondary:css.button} disabled={busy}
       onClick={()=>void perform({action:'setPublished',published:!page.is_published})}>{page.is_published?t.unpublish:t.publishPage}</button>:null}
    </div><p className={css.small}>{t.privacy}</p>
   </section>
   </>:null}
   <section className={css.card} data-my-page-anti-stress-practices>
    <h2>{({ru:'Антистресс · практики',en:'Anti-Stress · Practices',es:'Antiestrés · Prácticas'})[locale]}</h2>
    <p>{({ru:'Три дня самостоятельных упражнений в личном Daybook.',en:'Three days of self-guided exercises in your private Daybook.',es:'Tres días de ejercicios autónomos en tu diario privado.'})[locale]}</p>
    <Link className={css.button} href={'/'+locale+'/app/daybook?program=anti-stress'} prefetch={false}>{({ru:'Открыть практики',en:'Open practices',es:'Abrir prácticas'})[locale]}</Link>
   </section>
   <section className={css.card} aria-label={t.feed} data-my-page-private-feed>
    <h2>{t.feed}</h2>
    <p className={css.small}>{t.feedPrivacy}</p>
    <label className={css.label} htmlFor="my-page-entry">{t.postType}</label>
    <textarea id="my-page-entry" className={css.area} maxLength={1200} rows={3} placeholder={t.write}
      disabled={posting} value={entry} onChange={e=>setEntry(e.target.value)}/>
    <div className={css.actions}><button className={css.button} type="button" disabled={busy||posting||!entry.trim()||!data.accountId}
       onClick={()=>void publishEntry()}>{posting?t.publishing:t.post}</button></div>
    {postNotice?<p role="status" className={postNotice===t.posted?css.notice:css.error}>{postNotice}</p>:null}
    <div className={css.feed}>{!posts.length?<p className={css.empty}>{t.noPosts}</p>:posts.map(renderItem)}</div>
   </section>
   {otherItems.length?<section className={css.card} aria-label={t.otherFeed}>
    <h2>{t.otherFeed}</h2><div className={css.feed}>{otherItems.map(renderItem)}</div>
   </section>:null}
  </>:null}
 </main>
}
