'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {ArrowRight,BarChart3,LockKeyhole,Pencil,Play,Target,UserRound,Video,BookOpen,Heart,CalendarDays,MessageCircle,NotebookPen,Sparkles,Settings} from 'lucide-react'
import {appFetch,getCabinetBootstrap} from '@/lib/app/client-fetch'
import {buildProfileAssessmentView} from '@/lib/profile/profile-assessment-view'
import styles from './profile-personal-summary.module.css'
import MyPageCourses from './my-page-courses'

const COPY={
 ru:{about:'Обо мне',emptyBio:'Расскажите о себе в настройках своей странички.',edit:'Редактировать',privacy:'Личная страничка · ваши данные',goal:'Моя терапевтическая задача',goalEmpty:'Текст личной задачи пока не указан. Сформулировать направление работы можно в «Моём пути».',goalNote:'Самооценка выбранной цели — не диагноз и не результат теста.',goalLink:'Мой путь',goalRatings:['Ясность цели','Мотивация к цели','Уверенность в достижении цели'],tests:'Результаты моих тестов',testsEmpty:'Пока нет завершённых профессиональных тестов.',testsNote:'Это позиции в шкалах отдельных опросников, а не общий процент здоровья.',allTests:'Мои тесты',videos:'Мои видео и медитации',allVideos:'Все мои видео',videosEmpty:'Сохранённых видео пока нет.',open:'Смотреть',add:'Добавить на страничку',private:'Приватно',videoError:'Видео пока недоступно. Откройте его в библиотеке.',editIntro:'Настроить мою страничку',wait:'Загружаем личные результаты…',resultError:'Не удалось загрузить результаты. Откройте «Мои тесты».',personal:'Мои личные материалы',themes:{energy:'Энергия',relationships:'Отношения',goals:'Цели',money:'Деньги',health:'Самочувствие',life:'Жизнь'}},
 en:{about:'About me',emptyBio:'Add a short introduction in your page settings.',edit:'Edit page',privacy:'My private page',goal:'My therapy focus',goalEmpty:'No personal focus statement is saved here yet. You can explore your direction in My Path.',goalNote:'Personal goal self-ratings are not diagnoses or questionnaire results.',goalLink:'My Path',goalRatings:['Goal clarity','Motivation','Confidence'],tests:'My test results',testsEmpty:'No completed professional questionnaires yet.',testsNote:'Each bar shows a position within that questionnaire scale, not an overall health score.',allTests:'My tests',videos:'My videos and meditations',allVideos:'All my videos',videosEmpty:'No saved videos yet.',open:'Play',add:'Add to my page',private:'Private',videoError:'Could not open this video. Please try the video library.',editIntro:'Edit my page',wait:'Loading private results…',resultError:'Results are unavailable. Open My Tests.',personal:'My private materials',themes:{energy:'Energy',relationships:'Relationships',goals:'Goals',money:'Money',health:'Wellbeing',life:'Life'}},
 es:{about:'Sobre mí',emptyBio:'Añade una presentación breve en los ajustes.',edit:'Editar página',privacy:'Mi página privada',goal:'Mi objetivo terapéutico',goalEmpty:'Aún no has definido aquí una meta personal. Puedes trabajarla en Mi ruta.',goalNote:'Las autoevaluaciones no son diagnósticos ni resultados de pruebas.',goalLink:'Mi ruta',goalRatings:['Claridad de la meta','Motivación','Confianza'],tests:'Resultados de mis pruebas',testsEmpty:'Aún no hay cuestionarios profesionales completados.',testsNote:'Cada barra representa la escala de su prueba, no un porcentaje de salud.',allTests:'Mis pruebas',videos:'Mis vídeos y meditaciones',allVideos:'Todos mis vídeos',videosEmpty:'No hay vídeos guardados.',open:'Reproducir',add:'Añadir a mi página',private:'Privado',videoError:'No se puede abrir el vídeo. Prueba desde la biblioteca.',editIntro:'Editar página',wait:'Cargando resultados privados…',resultError:'No fue posible cargar los resultados. Abre Mis pruebas.',personal:'Mis materiales privados',themes:{energy:'Energía',relationships:'Relaciones',goals:'Metas',money:'Dinero',health:'Bienestar',life:'Vida'}}
}
const images=['imageSea','imageForest','imageLotus']
const formatNumber=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2})
export default function ProfilePersonalSummary({locale='en',profile={},data={},onEdit,onAddVideo,busy=false}){
 const language=Object.hasOwn(COPY,locale)?locale:'en'
 const t=COPY[language]
 const dashboard=({
 en:{goals:'My Goals',well:'Well-being',progress:'My Progress',journal:'My Journal',resources:'My Resources',guidance:'Personal Guidance',guideText:'Explore your next step with your AI coach.',guideAction:'Open My Coach',today:'My Today',todayText:'Open your Daybook and continue your personal practices.',todayAction:'Open Daybook',sessions:'My Sessions',sessionsText:'Review your saved sessions and reports.',coachProtocols:'AI coach protocols and drafts',settings:'Settings & More'},
 ru:{goals:'Мои цели',well:'Самочувствие',progress:'Мой прогресс',journal:'Мой дневник',resources:'Мои ресурсы',guidance:'Личная поддержка',guideText:'Определите следующий шаг вместе с ИИ-коучем.',guideAction:'Открыть коуча',today:'Мой день',todayText:'Откройте Daybook и продолжите личные практики.',todayAction:'Открыть Daybook',sessions:'Мои сессии',sessionsText:'Просмотрите сохранённые сессии и отчёты.',coachProtocols:'Протоколы и черновики AI-коуча',settings:'Настройки и другое'},
 es:{goals:'Mis metas',well:'Bienestar',progress:'Mi progreso',journal:'Mi diario',resources:'Mis recursos',guidance:'Orientación personal',guideText:'Explora tu próximo paso con tu coach IA.',guideAction:'Abrir mi coach',today:'Mi día',todayText:'Abre Daybook y continúa tus prácticas personales.',todayAction:'Abrir Daybook',sessions:'Mis sesiones',sessionsText:'Consulta tus sesiones e informes guardados.',coachProtocols:'Protocolos y borradores del coach IA',settings:'Ajustes y más'}
 })[language]
 const appLocale=language==='es'?'en':language
 const [privateState,setPrivateState]=useState({loading:true,bootstrap:null,goals:null,failed:false})
 const [playing,setPlaying]=useState(null)
 const [videoError,setVideoError]=useState('')
 const [loadingVideo,setLoadingVideo]=useState('')
 useEffect(()=>{
  let current=true
  Promise.allSettled([getCabinetBootstrap('portrait'),appFetch('development-goals')]).then(([a,b])=>{
   if(!current)return
   setPrivateState({loading:false,bootstrap:a.status==='fulfilled'?a.value:null,goals:b.status==='fulfilled'?b.value?.goals:null,failed:a.status!=='fulfilled'})
  })
  return ()=>{current=false}
 },[])
 const measured=useMemo(()=>privateState.bootstrap?buildProfileAssessmentView(privateState.bootstrap,appLocale).measured.slice(0,4):[],[privateState.bootstrap,appLocale])
 const checkin=privateState.goals?.goalCheckin
 const name=String(profile.displayName||data?.suggested?.name||'').trim()
 const bio=String(profile.bio||'').trim()
 const videos=Array.isArray(data?.videos)?data.videos:[]
 async function openVideo(id){
  if(loadingVideo)return
  if(playing?.id===id){setPlaying(null);return}
  setVideoError('')
  setLoadingVideo(id)
  try{
   const record=await appFetch('personal-videos/'+id)
   if(!record?.url)throw Error('VIDEO_URL_MISSING')
   setPlaying({id,url:record.url})
  }catch{setVideoError(t.videoError)}
  finally{setLoadingVideo('')}
 }
 return <div className={styles.root} data-profile-personal-social data-private-profile-only>
   <section className={styles.hero} aria-label={t.about}>
     <div className={styles.cover} role="img" aria-label="Holistic House"/>
     <div className={styles.identity}>
       <span className={styles.avatar} aria-hidden="true">{name?name.slice(0,1).toUpperCase():<UserRound size={40}/>}</span>
       <div className={styles.identityText}>
         <span className={styles.eyebrow}><LockKeyhole size={15} aria-hidden="true"/>{t.privacy}</span>
         <h1>{name||t.personal}</h1>
         <strong>{t.about}</strong>
         <p>{bio||t.emptyBio}</p>
       </div>
     </div>
     <div className={styles.heroActions}>
       <button type="button" onClick={onEdit} className={styles.primary}><Pencil size={19} aria-hidden="true"/>{t.edit}</button>
       <Link href={'/'+appLocale+'/app/portrait?space=path'} className={styles.outline}>{t.goalLink}<ArrowRight size={18} aria-hidden="true"/></Link>
     </div>
   </section>
   <nav className={styles.shortcuts} aria-label={dashboard.resources} data-my-page-dashboard-shortcuts>
    {[[Target,dashboard.goals,'/'+appLocale+'/app/my-coaching-plan'],[Heart,dashboard.well,'#my-wellbeing'],[BarChart3,dashboard.progress,'#my-progress'],[NotebookPen,dashboard.journal,'#my-page-entry'],[BookOpen,dashboard.resources,'#my-resources']].map(([Icon,label,href])=>href.startsWith('#')?<a key={href} href={href}><Icon size={24} aria-hidden="true"/><span>{label}</span></a>:<Link key={href} href={href} prefetch={false}><Icon size={24} aria-hidden="true"/><span>{label}</span></Link>)}
   </nav>
   <MyPageCourses locale={language} accountId={data?.accountId||data?.page?.account_id}/>
   <section className={styles.guidance} data-my-page-personal-guidance>
    <div className={styles.guidancePhoto} aria-hidden="true"/>
    <div className={styles.guidanceBody}><h2><Sparkles size={23} aria-hidden="true"/>{dashboard.guidance}</h2><p>{dashboard.guideText}</p><Link href={'/'+language+'/my-coach'} prefetch={false}>{dashboard.guideAction}<ArrowRight size={18} aria-hidden="true"/></Link></div>
   </section>
   <section className={styles.card} data-my-page-today><header className={styles.heading}><CalendarDays size={23} aria-hidden="true"/><h2>{dashboard.today}</h2></header><p className={styles.goalEmpty}>{dashboard.todayText}</p><Link className={styles.more} href={'/'+appLocale+'/app/daybook'} prefetch={false}>{dashboard.todayAction}<ArrowRight size={18}/></Link></section>
   <section className={styles.card} data-my-page-sessions><header className={styles.heading}><MessageCircle size={23} aria-hidden="true"/><h2>{dashboard.sessions}</h2></header><p className={styles.goalEmpty}>{dashboard.sessionsText}</p><Link className={styles.more} href={'/'+appLocale+'/app/my-coaching-plan?tab=reports'} prefetch={false} data-my-page-coach-protocols>{dashboard.coachProtocols}<ArrowRight size={18} aria-hidden="true"/></Link><Link className={styles.more} href={'/'+appLocale+'/app/portrait?space=sessions'} prefetch={false}>{dashboard.sessions}<ArrowRight size={18}/></Link></section>
   <section className={styles.card} aria-label={language==='ru'?'Мой кабинет':language==='es'?'Mi espacio':'My cabinet'}>
    <header className={styles.heading}><UserRound size={23} aria-hidden="true"/><h2>{language==='ru'?'Мой кабинет':language==='es'?'Mi espacio':'My cabinet'}</h2></header>
    <div className={styles.measures}>{[
     ['/'+appLocale+'/app/my-coaching-plan',language==='ru'?'Цели и отчёты коучинга':language==='es'?'Metas e informes de coaching':'Goals & coaching reports'],
     ['/'+appLocale+'/app/portrait?space=reports',language==='ru'?'Мои отчёты':language==='es'?'Mis informes':'My reports'],
     ['/'+appLocale+'/app/portrait?space=sessions',language==='ru'?'Мои сессии':language==='es'?'Mis sesiones':'My sessions'],
     ['/'+language+'/holistic-support/mandala','MyVideo'],
     ['/'+appLocale+'/app/settings',language==='ru'?'Настройки':language==='es'?'Ajustes':'Settings']
    ].map(([href,title])=><Link key={href} href={href} prefetch={false} className={styles.measure} data-my-page-my-video={href==='/'+language+'/holistic-support/mandala'?true:undefined}><span className={styles.measureTop}><strong>{title}</strong><ArrowRight size={16} aria-hidden="true"/></span></Link>)}</div>
   </section>
   <section className={styles.card} id="my-wellbeing" aria-label={t.goal}>
     <header className={styles.heading}><Target size={23} aria-hidden="true"/><h2>{t.goal}</h2><Link href={'/'+appLocale+'/app/portrait?space=path'} aria-label={t.goalLink}><ArrowRight size={20}/></Link></header>
     <p className={styles.goalEmpty}>{t.goalEmpty}</p>
     {checkin?.values?<div className={styles.ratings}>
        {['clarity','motivation','confidence'].map((key,i)=><div className={styles.rating} key={key}><span>{t.goalRatings[i]}</span><strong>{checkin.values[key]} / 10</strong></div>)}
       </div>:null}
     {checkin?.values?<p className={styles.hint}>{t.goalNote}</p>:null}
   </section>
   <section className={styles.card} data-daybook-dual-vector-entry>
     <header className={styles.heading}><Target size={23} aria-hidden="true"/>
       <h2>{appLocale==='ru'?'Два вектора развития':appLocale==='es'?'Dos vectores de desarrollo':'Two development vectors'}</h2>
       <Link href={'/'+appLocale+'/development-vectors'} aria-label="Development vectors"><ArrowRight size={20}/></Link>
     </header>
     <p className={styles.goalEmpty}>{appLocale==='ru'
      ?'Внутреннее: 8 смысловых осей. Внешнее: 8 жизненных сфер. Оцените «сейчас» и «хочу» отдельно.'
      :appLocale==='es'?'Interior: 8 ejes. Exterior: 8 áreas de vida. Evalúa ahora y deseado.':
       'Inner: 8 meaning axes. Outer: 8 life areas. Rate now and desired separately.'}</p>
     <Link className={styles.more} href={'/'+appLocale+'/development-vectors'}>
       {appLocale==='ru'?'Заполнить самостоятельно или с коучем':appLocale==='es'?'Completar con preguntas guiadas':'Fill in alone or with guided questions'}
       <ArrowRight size={16}/></Link>
   </section>
   <section className={styles.card} id="my-progress" aria-label={t.tests}>
     <header className={styles.heading}><BarChart3 size={23} aria-hidden="true"/><h2>{t.tests}</h2><Link href={'/'+appLocale+'/app/tests'} aria-label={t.allTests}><ArrowRight size={20}/></Link></header>
     {privateState.loading?<p className={styles.hint} role="status">{t.wait}</p>:
      privateState.failed?<p className={styles.empty}>{t.resultError}</p>:
      measured.length?<div className={styles.measures}>{measured.map(item=><Link key={item.key} href={'/'+appLocale+'/app/results/'+encodeURIComponent(item.sourceResultId)} className={styles.measure}>
       <span className={styles.measureTop}><span>{item.label}</span><strong>{formatNumber(item.value)} / {formatNumber(item.max)}</strong></span>
       {item.displayKind==='screening-count'?<small>{item.screeningLabel||item.testTitle}</small>:
        <span className={styles.track} aria-hidden="true"><span style={{width:(Math.max(0,Math.min(1,item.ratio))*100)+'%'}}/></span>}
       <small>{item.testTitle}</small>
      </Link>)}</div>:<p className={styles.empty}>{t.testsEmpty}</p>}
     <p className={styles.hint}>{t.testsNote}</p>
     <Link href={'/'+appLocale+'/app/tests'} className={styles.more}>{t.allTests}<ArrowRight size={16}/></Link>
   </section>
   <section className={styles.card} id="my-resources" aria-label={t.videos}>
     <header className={styles.heading}><Video size={23} aria-hidden="true"/><h2>{t.videos}</h2><Link href={'/'+appLocale+'/app/videos'} aria-label={t.allVideos}><ArrowRight size={20}/></Link></header>
     {videoError?<p className={styles.alert} role="alert">{videoError}</p>:null}
     {!videos.length?<p className={styles.empty}>{t.videosEmpty}</p>:
      <div className={styles.videos}>{videos.slice(0,6).map((video,index)=><article className={styles.video} key={video.id}>
       <div className={styles.poster+' '+styles[images[index%images.length]]}>
         {playing?.id===video.id?<video src={playing.url} controls playsInline preload="metadata" autoPlay className={styles.player} aria-label={t.open}/>:
          <button type="button" disabled={Boolean(loadingVideo)} onClick={()=>void openVideo(video.id)} aria-label={t.open} className={styles.play}>
            <Play size={25} fill="currentColor" aria-hidden="true"/>
          </button>}
         <span className={styles.duration}>{video.duration_seconds}s</span>
       </div>
       <strong>{t.themes[video.theme]||video.theme}</strong>
       <div className={styles.videoFooter}><span><LockKeyhole size={13}/>{t.private}</span>
         <button type="button" disabled={busy||!data.page} onClick={()=>onAddVideo(video)}>{t.add}</button></div>
      </article>)}</div>}
     <Link href={'/'+appLocale+'/app/videos'} className={styles.more}>{t.allVideos}<ArrowRight size={16}/></Link>
   </section>
   <section className={styles.card} data-my-page-settings><header className={styles.heading}><Settings size={23} aria-hidden="true"/><h2>{dashboard.settings}</h2></header><div className={styles.measures}><button type="button" className={styles.measure} onClick={onEdit}>{t.edit}<ArrowRight size={16}/></button><Link className={styles.measure} href={'/'+appLocale+'/app/settings'} prefetch={false}>{dashboard.settings}<ArrowRight size={16}/></Link></div></section>
 </div>
}
