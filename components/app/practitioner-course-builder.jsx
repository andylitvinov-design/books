'use client'
import {useEffect,useRef,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
import {preparePhoto} from '@/components/session-photo-uploader'
import {BookOpen,Image as ImageIcon,Headphones,Film,Link2,Plus,ArrowUp,ArrowDown,Trash2,Share2,Save,Eye,Globe2,Download,ExternalLink,ChevronRight,Copy,LockKeyhole,MessageCircleQuestion,AlignLeft,Pencil,X} from 'lucide-react'
import CourseSlideRecorder from './course-slide-recorder'
import styles from './practitioner-course-builder.module.css'

const translations={
 en:{advancedActions:'Other actions',startTitle:'What would you like to teach?',startHint:'Name your course. We will add its first lesson screen automatically.',startExample:'e.g. Five steps to everyday calm',createNow:'Create course and first slide',cancel:'Cancel',myCourses:'My courses',stepName:'Name',stepBuild:'Build',stepPublish:'Publish',moreSettings:'Description and language',nextScreen:'Next screen',addNext:'Add next screen',slideHint:'One useful idea per screen. Choose text, a photo, audio or video.',previewSlide:'Preview this screen',hideSlidePreview:'Hide preview',duplicate:'Duplicate screen',untitled:'Untitled screen',enterTitle:'Enter a course title first.',emptyScreen:'Add text or a title to this screen before publishing.',missingFile:'Upload media or add a video link before publishing.',ready:'Ready to review and publish. Only published courses are public.',notReady:'To publish:',discard:'Discard your unsaved changes?',intro:'Start with a name. You can add more lessons, media and description later.',createError:'Could not create the course.',heading:'Course editor',sub:'Create lessons with text, photos, audio, video or links. Drafts stay private.',unavailable:'The new course library could not be loaded. Your other materials are safe.',retry:'Try again',
 new:'New course',name:'Course title',summary:'Short description',lang:'Language',slides:'Slides',add:'Add slide',slideTitle:'Slide title',body:'Text / instructions',type:'Content type',text:'Text',image:'Photo',audio:'Audio',video:'Video file',embed:'YouTube / Vimeo',link:'Video link',upload:'Upload file',uploading:'Uploading…',private:'Private until published',save:'Save draft',saving:'Saving…',publish:'Publish course',republish:'Update published course',hide:'Unpublish',delete:'Archive',published:'Published',draft:'Draft',unsaved:'Unsaved changes',saved:'Saved on server',limit:'Photo 4 MB · audio 20 MB · video 25 MB. No autoplay.',share:'Share course',copied:'Link copied',preview:'Preview course',confirm:'Publish these slides to anyone with the link and in the public course search? Confirm you own the content rights and there is no client data.',remove:'Archive this course? Published course will disappear from search and shared links.',empty:'No courses yet. Create the first one.',select:'Choose a course',choose:'Choose a slide',up:'Up',down:'Down',removeSlide:'Remove slide',error:'Could not save changes',rev:'The course changed elsewhere. Reload to edit the newest version.',approved:'Your practitioner profile must be approved before publication.',search:'Published courses appear in Academy course search.',fileReady:'File uploaded and verified',photoAlt:'Image on slide',youtubePrep:'Prepare for YouTube (later)',youtubeDownload:'Download original',youtubeUploader:'Open Holistic House YouTube uploader',youtubeStudio:'Open YouTube Studio',youtubeNote:'Your video stays private here. Download a copy first, then choose a channel and explicitly upload it to YouTube. No automatic publishing; do not send private client videos.'},
 ru:{advancedActions:'Дополнительные действия',startTitle:'Чему будет посвящён ваш курс?',startHint:'Назовите курс — первый учебный экран мы добавим автоматически.',startExample:'Например, Пять шагов к спокойствию',createNow:'Создать курс и первый слайд',cancel:'Отмена',myCourses:'Мои курсы',stepName:'Название',stepBuild:'Слайды',stepPublish:'Публикация',moreSettings:'Описание и язык',nextScreen:'Следующий экран',addNext:'Добавить следующий экран',slideHint:'Одна полезная идея на экране. Выберите текст, фото, аудио или видео.',previewSlide:'Посмотреть экран',hideSlidePreview:'Скрыть предпросмотр',duplicate:'Дублировать экран',untitled:'Экран без названия',enterTitle:'Сначала введите название курса.',emptyScreen:'Перед публикацией добавьте текст или заголовок слайда.',missingFile:'Перед публикацией загрузите файл или добавьте ссылку на видео.',ready:'Можно проверить и опубликовать. Черновик пока приватный.',notReady:'Для публикации:',discard:'Отменить несохранённые изменения?',intro:'Начните с названия. Уроки, медиа и описание можно добавить позже.',createError:'Не удалось создать курс.',heading:'Редактор курсов',sub:'Уроки с текстом, фото, аудио, видео или ссылками. Черновики приватны.',unavailable:'Не удалось загрузить новые курсы. Остальные материалы доступны.',retry:'Повторить',
 new:'Новый курс',name:'Название курса',summary:'Краткое описание',lang:'Язык',slides:'Слайды',add:'Добавить слайд',slideTitle:'Заголовок слайда',body:'Текст / инструкция',type:'Тип содержимого',text:'Текст',image:'Фото',audio:'Аудио',video:'Видеофайл',embed:'YouTube / Vimeo',link:'Ссылка на видео',upload:'Загрузить файл',uploading:'Загрузка…',private:'Приватно до публикации',save:'Сохранить черновик',saving:'Сохраняем…',publish:'Опубликовать курс',republish:'Обновить публикацию',hide:'Снять с публикации',delete:'Архивировать',published:'Опубликован',draft:'Черновик',unsaved:'Не сохранено',saved:'Сохранено на сервере',limit:'Фото до 4 МБ · аудио до 20 МБ · видео до 25 МБ. Без автозапуска.',share:'Поделиться курсом',copied:'Ссылка скопирована',preview:'Открыть курс',confirm:'Опубликовать материалы для всех по ссылке и в поиске курсов? Подтвердите авторские права и отсутствие данных клиентов.',remove:'Архивировать курс? Публикация и ссылка перестанут работать.',empty:'Пока нет курсов. Создайте первый.',select:'Выберите курс',choose:'Выберите слайд',up:'Вверх',down:'Вниз',removeSlide:'Удалить слайд',error:'Не удалось сохранить',rev:'Курс изменён в другой вкладке. Обновите страницу.',approved:'Для публикации требуется одобренный профиль мастера.',search:'Опубликованные курсы появляются в поиске Академии.',fileReady:'Файл загружен и проверен',photoAlt:'Фото слайда',youtubePrep:'Подготовить для YouTube (позже)',youtubeDownload:'Скачать исходник',youtubeUploader:'Открыть загрузку YouTube',youtubeStudio:'Открыть YouTube Studio',youtubeNote:'Видео пока приватно. Сначала скачайте исходник, затем отдельно выберите канал и подтвердите загрузку в YouTube. Не отправляйте видео клиентов.'},
 es:{advancedActions:'Otras acciones',startTitle:'¿Qué quieres enseñar en este curso?',startHint:'Pon un nombre al curso. Añadiremos automáticamente la primera pantalla.',startExample:'Por ejemplo, Cinco pasos hacia la calma',createNow:'Crear curso y primera pantalla',cancel:'Cancelar',myCourses:'Mis cursos',stepName:'Nombre',stepBuild:'Pantallas',stepPublish:'Publicar',moreSettings:'Descripción e idioma',nextScreen:'Pantalla siguiente',addNext:'Añadir otra pantalla',slideHint:'Una idea útil por pantalla. Elige texto, foto, audio o vídeo.',previewSlide:'Vista previa de la pantalla',hideSlidePreview:'Ocultar vista previa',duplicate:'Duplicar pantalla',untitled:'Pantalla sin título',enterTitle:'Primero escribe el título del curso.',emptyScreen:'Añade texto o un título a la pantalla antes de publicar.',missingFile:'Sube el archivo o añade un enlace de vídeo antes de publicar.',ready:'Listo para revisar y publicar. El borrador sigue privado.',notReady:'Para publicar:',discard:'¿Descartar cambios sin guardar?',intro:'Empieza con un nombre. Añade lecciones, archivos y descripción después.',createError:'No se pudo crear el curso.',heading:'Editor de cursos',sub:'Lecciones con texto, fotos, audio, vídeo o enlaces. Los borradores son privados.',unavailable:'No se pudo cargar la biblioteca de cursos. Los otros materiales siguen disponibles.',retry:'Reintentar',
 new:'Nuevo curso',name:'Título del curso',summary:'Descripción breve',lang:'Idioma',slides:'Diapositivas',add:'Añadir diapositiva',slideTitle:'Título de la diapositiva',body:'Texto / instrucciones',type:'Tipo de contenido',text:'Texto',image:'Foto',audio:'Audio',video:'Archivo de vídeo',embed:'YouTube / Vimeo',link:'Enlace de vídeo',upload:'Subir archivo',uploading:'Subiendo…',private:'Privado hasta publicar',save:'Guardar borrador',saving:'Guardando…',publish:'Publicar curso',republish:'Actualizar curso publicado',hide:'Dejar de publicar',delete:'Archivar',published:'Publicado',draft:'Borrador',unsaved:'Cambios sin guardar',saved:'Guardado en servidor',limit:'Foto 4 MB · audio 20 MB · vídeo 25 MB. Sin reproducción automática.',share:'Compartir curso',copied:'Enlace copiado',preview:'Ver curso',confirm:'¿Publicar para todos con el enlace y en el buscador? Confirma los derechos sobre el material y que no contiene datos de clientes.',remove:'¿Archivar el curso? El enlace dejará de funcionar.',empty:'Aún no hay cursos. Crea el primero.',select:'Elige un curso',choose:'Elige una diapositiva',up:'Subir',down:'Bajar',removeSlide:'Quitar diapositiva',error:'No se pudieron guardar los cambios',rev:'Otro dispositivo ha modificado el curso. Recarga la página.',approved:'Para publicar necesitas un perfil profesional aprobado.',search:'Los cursos publicados aparecen en la búsqueda de la Academia.',fileReady:'Archivo subido y verificado',photoAlt:'Imagen de diapositiva',youtubePrep:'Preparar para YouTube (más tarde)',youtubeDownload:'Descargar original',youtubeUploader:'Abrir cargador de YouTube',youtubeStudio:'Abrir YouTube Studio',youtubeNote:'Este vídeo sigue privado. Descarga el original y sube una copia a un canal de YouTube por separado, con confirmación. Nunca subas vídeos de clientes.'}
}
Object.assign(translations.en,{
 removeMedia:'Remove media from this slide',invalidCta:'Use an HTTPS link or an internal /page URL.',elementToolbar:'Add to slide',elementText:'Text',elementPhoto:'Photo',elementAudio:'Audio',elementVideo:'Video',elementQuestion:'Question',elementCta:'Link / CTA',
 addPhoto:'Add photo',replacePhoto:'Change photo',removePhoto:'Remove photo',photoPlaceholder:'A photo you choose will appear here in the published course.',
 screenTitle:'Slide title',screenTitlePlaceholder:'Give this screen a short title…',questionLabel:'QUESTION FOR LEARNER',questionPlaceholder:'Add a question that invites reflection…',
 instructionLabel:'TEXT / INSTRUCTIONS',instructionPlaceholder:'Add one short idea, practice, or instruction…',
 optionalCta:'Add an optional button',buttonText:'Button text',buttonTextExample:'For example, Start free practice',buttonUrl:'HTTPS link or internal /page',
 ctaIncomplete:'Enter both the button label and link.',questionInfo:'This reflection question is shown to the learner; answers are not collected.',
 editSlide:'Edit screen',visualPreview:'Preview screen',uploadVideo:'Upload a video',externalVideo:'YouTube / Vimeo link',mediaTitle:'Audio or video for this screen',
 confirmReplaceMedia:'Change media type? The previous file will no longer appear on this slide.',nextScreen:'Next slide',saved:'Saved on server',
 addScreen:'Add slide',lessonCanvas:'Live slide canvas',noPhoto:'Photo placeholder (visible only in editor)',imageAction:'Add image',moveUp:'Move up',moveDown:'Move down'
})
Object.assign(translations.ru,{
 removeMedia:'Убрать медиа со слайда',invalidCta:'Нужна ссылка HTTPS или внутренняя ссылка, начинающаяся с /.',elementToolbar:'Добавить на слайд',elementText:'Текст',elementPhoto:'Фото',elementAudio:'Аудио',elementVideo:'Видео',elementQuestion:'Вопрос',elementCta:'Ссылка / кнопка',
 addPhoto:'Добавить фото',replacePhoto:'Заменить фото',removePhoto:'Убрать фото',photoPlaceholder:'Выбранное фото появится здесь после загрузки.',
 screenTitle:'Заголовок слайда',screenTitlePlaceholder:'Короткий заголовок этого экрана…',questionLabel:'ВОПРОС К КЛИЕНТУ',questionPlaceholder:'Какой вопрос поможет человеку задуматься?',
 instructionLabel:'ТЕКСТ / ИНСТРУКЦИЯ',instructionPlaceholder:'Одно полезное объяснение или короткая практика…',
 optionalCta:'Добавить кнопку (необязательно)',buttonText:'Текст кнопки',buttonTextExample:'Например, Начать практику',buttonUrl:'Ссылка HTTPS или внутренняя /страница',
 ctaIncomplete:'Укажите текст кнопки и ссылку.',questionInfo:'Вопрос виден ученику как приглашение к размышлению; ответы не собираются.',
 editSlide:'Редактировать экран',visualPreview:'Посмотреть экран',uploadVideo:'Загрузить видео',externalVideo:'Ссылка YouTube / Vimeo',mediaTitle:'Аудио или видео для этого экрана',
 confirmReplaceMedia:'Изменить тип медиа? Прежний файл больше не будет показан на этом слайде.',nextScreen:'Следующий слайд',saved:'Сохранено на сервере',
 addScreen:'Добавить слайд',lessonCanvas:'Визуальный редактор слайда',noPhoto:'Место для фото (только в редакторе)',imageAction:'Добавить изображение',moveUp:'Переместить вверх',moveDown:'Переместить вниз'
})
Object.assign(translations.es,{
 removeMedia:'Quitar medio de la diapositiva',invalidCta:'Usa un enlace HTTPS o una ruta interna /.',elementToolbar:'Añadir a la diapositiva',elementText:'Texto',elementPhoto:'Foto',elementAudio:'Audio',elementVideo:'Vídeo',elementQuestion:'Pregunta',elementCta:'Enlace / botón',
 addPhoto:'Añadir foto',replacePhoto:'Cambiar foto',removePhoto:'Quitar foto',photoPlaceholder:'La foto elegida aparecerá aquí cuando la subas.',
 screenTitle:'Título de la diapositiva',screenTitlePlaceholder:'Un título breve para esta pantalla…',questionLabel:'PREGUNTA PARA EL ALUMNO',questionPlaceholder:'¿Qué pregunta invita a reflexionar?',
 instructionLabel:'TEXTO / INSTRUCCIÓN',instructionPlaceholder:'Una idea útil, una práctica o una instrucción…',
 optionalCta:'Añadir botón (opcional)',buttonText:'Texto del botón',buttonTextExample:'Por ejemplo, Empezar',buttonUrl:'Enlace HTTPS o página interna /',
 ctaIncomplete:'Completa el texto y el enlace del botón.',questionInfo:'La pregunta es para reflexionar; no se recogen respuestas.',
 editSlide:'Editar pantalla',visualPreview:'Ver pantalla',uploadVideo:'Subir vídeo',externalVideo:'Enlace YouTube / Vimeo',mediaTitle:'Audio o vídeo de esta pantalla',
 confirmReplaceMedia:'¿Cambiar tipo de archivo? El anterior dejará de mostrarse en esta diapositiva.',nextScreen:'Siguiente diapositiva',saved:'Guardado en servidor',
 addScreen:'Añadir diapositiva',lessonCanvas:'Editor visual de diapositivas',noPhoto:'Espacio para foto (solo en el editor)',imageAction:'Añadir imagen',moveUp:'Mover arriba',moveDown:'Mover abajo'
})
const makeSlide=()=>({id:crypto.randomUUID(),kind:'text',title:'',body:''})
const request=async(body,accountId)=>{
 const response=await fetch('/api/app/practice/courses',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  ...(body?{headers:{'content-type':'application/json',...(accountId?{'x-hh-account-id':accountId}:{})},body:JSON.stringify(body)}:{headers:accountId?{'x-hh-account-id':accountId}:undefined})})
 const data=await response.json().catch(()=>({}))
 if(!response.ok)throw new Error(data.error||'REQUEST_FAILED')
 return data
}
const fileAccept={image:'image/jpeg,image/png,image/webp,image/heic,image/heif',audio:'audio/mpeg,audio/mp4,audio/x-m4a',video:'video/mp4,video/quicktime'}
function href(item){
 return '/'+(item?.published?.locale||item?.draft?.locale||'en')+'/courses/masters/'+item.slug
}
export default function PractitionerCourseBuilder({locale='en',accountId=null,searchQuery='',onOpenYoutube=null}){
 const t=translations[locale]||translations.en
 const api=body=>request(body,accountId)
 const [items,setItems]=useState([])
 const [selected,setSelected]=useState(null)
 const [draft,setDraft]=useState(null)
 const [slideId,setSlideId]=useState(null)
 const [creating,setCreating]=useState(false)
 const [newTitle,setNewTitle]=useState('')
 const [newLocale,setNewLocale]=useState(['en','ru','es'].includes(locale)?locale:'en')
 const [listOpen,setListOpen]=useState(false)
 const [showPreview,setShowPreview]=useState(false)
 const photoInputRef=useRef(null)
 const bodyRef=useRef(null)
 const questionRef=useRef(null)
 const ctaDetailsRef=useRef(null)
 const ctaLabelRef=useRef(null)
 const [loading,setLoading]=useState(true)
 const [loadFailed,setLoadFailed]=useState(false)
 const [retryKey,setRetryKey]=useState(0)
 const [busy,setBusy]=useState(false)
 const [uploading,setUploading]=useState(false)
 const [recording,setRecording]=useState(false)
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const current=items.find(x=>x.id===selected)
 const active=draft?.slides?.find(x=>x.id===slideId)
 const coverId=active?.coverAssetId||(active?.kind==='image'?active?.assetId:null)
 const dirty=!!current&&JSON.stringify(draft)!==JSON.stringify(current.draft)
 const unfinishedSlide=draft?.slides?.find(slide=>
  (slide.kind==='text'&&!String(slide.title||'').trim()&&!String(slide.body||'').trim()&&!String(slide.question||'').trim()&&!slide.coverAssetId)||
  (['image','audio','video'].includes(slide.kind)&&!slide.assetId)||
  (slide.kind==='embed'&&!String(slide.videoUrl||'').trim()))
 const invalidCta=draft?.slides?.some(slide=>Boolean(slide.ctaLabel?.trim())!==Boolean(slide.ctaUrl?.trim()))
 const publishIssue=!draft?.title?.trim()?t.enterTitle:!draft.slides.length?t.add:unfinishedSlide?
  (unfinishedSlide.kind==='text'?t.emptyScreen:t.missingFile):invalidCta?t.ctaIncomplete:''
 const shareHref=current?.status==='published'?href(current):''
 function applyItem(item,{keepSlide=false}={}){
  setItems(list=>[item,...list.filter(x=>x.id!==item.id)])
  setSelected(item.id)
  setDraft(JSON.parse(JSON.stringify(item.draft)))
  setSlideId(previous=>keepSlide&&item.draft.slides?.some(slide=>slide.id===previous)?previous:item.draft.slides?.[0]?.id||null)
  setCreating(false);setListOpen(false)
 }
 useEffect(()=>{
  let alive=true
  setLoading(true);setLoadFailed(false);setError('')
  setItems([]);setSelected(null);setDraft(null);setSlideId(null);setCreating(false);setListOpen(false);setShowPreview(false)
  api().then(data=>{
   if(!alive)return
   const list=data.items||[]
   setItems(list)
   setCreating(!list.length)
   if(list.length){setSelected(list[0].id);setDraft(JSON.parse(JSON.stringify(list[0].draft)));setSlideId(list[0].draft?.slides?.[0]?.id||null)}
  }).catch(()=>{if(alive)setLoadFailed(true)})
    .finally(()=>{if(alive)setLoading(false)})
  return ()=>{alive=false}
 },[accountId,retryKey])
 function choose(item){
  if(busy||uploading||recording)return
  if(dirty&&!creating&&!window.confirm(t.discard))return
  setError('');setMessage('');setShowPreview(false);applyItem(item)
 }
 function openCreate(){
  if(busy||uploading||recording)return
  if(dirty&&!creating&&!window.confirm(t.discard))return
  if(dirty&&current)setDraft(JSON.parse(JSON.stringify(current.draft)))
  setError('');setMessage('');setNewTitle('');setNewLocale(['en','ru','es'].includes(locale)?locale:'en')
  setCreating(true);setListOpen(false);setShowPreview(false)
 }
 function updateSlide(patch){
  setDraft(d=>({...d,slides:d.slides.map(s=>s.id===slideId?{...s,...patch}:s)}))
  setMessage('')
 }
 function focusBlock(ref){
  setShowPreview(false)
  requestAnimationFrame(()=>ref.current?.focus())
 }
 function changeMediaKind(kind){
  if(!active||uploading||busy||recording)return
  if(active.kind===kind){setShowPreview(false);return}
  if(active.assetId&&['audio','video'].includes(active.kind)&&!window.confirm(t.confirmReplaceMedia))return
  const coverAssetId=active.coverAssetId||(active.kind==='image'?active.assetId:null)
  updateSlide({kind,assetId:kind==='image'?coverAssetId:null,coverAssetId:kind==='image'?null:coverAssetId,videoUrl:''})
  setShowPreview(false)
 }
 function removeCover(){
  if(active.kind==='image')updateSlide({assetId:null})
  else updateSlide({coverAssetId:null})
 }
 function addSlide(){
  if(busy||uploading||recording)return
  const slide=makeSlide()
  setDraft(d=>({...d,slides:[...d.slides,slide]}))
  setSlideId(slide.id);setShowPreview(false)
  setMessage('')
 }
 function moveSlide(direction){
  if(busy||uploading||recording)return
  const index=draft.slides.findIndex(s=>s.id===slideId),j=index+direction
  if(index<0||j<0||j>=draft.slides.length)return
  setDraft(d=>{
   const slides=[...d.slides];[slides[index],slides[j]]=[slides[j],slides[index]]
   return {...d,slides}
  })
 }
 function removeSlide(){
  if(busy||uploading||recording)return
  const slides=draft.slides.filter(s=>s.id!==slideId)
  setDraft(d=>({...d,slides}))
  setSlideId(slides[0]?.id||null);setShowPreview(false)
 }
 function duplicateSlide(){
  if(busy||uploading||recording||!active||draft.slides.length>=60)return
  const copy={...active,id:crypto.randomUUID()}
  setDraft(d=>{
   const index=d.slides.findIndex(s=>s.id===slideId)
   const slides=[...d.slides];slides.splice(index+1,0,copy)
   return {...d,slides}
  })
  setSlideId(copy.id);setShowPreview(false);setMessage('')
 }
 function nextSlide(){
  const index=draft.slides.findIndex(s=>s.id===slideId)
  if(index>=0&&index<draft.slides.length-1){setSlideId(draft.slides[index+1].id);setShowPreview(false)}
  else addSlide()
 }
 async function create(event){
  event?.preventDefault()
  if(busy||recording||uploading)return
  const title=newTitle.trim()
  if(!title){setError(t.enterTitle);return}
  setBusy(true);setError('');setMessage('')
  try{
   const course={title,description:'',locale:newLocale,slides:[makeSlide()]}
   const {item}=await api({action:'create',course})
   applyItem(item);setMessage(t.saved)
  }catch(e){setError(e.message||t.createError)}
  finally{setBusy(false)}
 }
 async function save(){
  if(!current||!draft)return null
  if(!dirty)return current
  const {item}=await api({action:'save',id:current.id,expectedRevision:current.revision,course:draft})
  applyItem(item,{keepSlide:true})
  return item
 }
 async function operate(action){
  if(busy||uploading||recording||!current)return
  if(action==='publish'&&!window.confirm(t.confirm))return
  if(action==='archive'&&!window.confirm(t.remove))return
  setBusy(true);setError('');setMessage('')
  try{
   if(action==='save'){
    await save();setMessage(t.saved)
   }else{
    const saved=action==='publish'?await save():current
    const {item}=await api({action,id:saved.id,expectedRevision:saved.revision,reviewed:action==='publish'})
    if(action==='archive'){
     setItems(list=>list.filter(x=>x.id!==item.id));setSelected(null);setDraft(null);setSlideId(null)
    }else applyItem(item,{keepSlide:true})
    setMessage(action==='publish'?t.search:t.saved)
   }
  }catch(e){setError(e.message==='REVISION_CONFLICT'?t.rev:e.message==='PRACTITIONER_REVIEW_REQUIRED'?t.approved:e.message==='INVALID_COURSE_CTA'?t.invalidCta:e.message||t.error)}
  finally{setBusy(false)}
 }
 async function upload(file,fromCapture=false,target='media'){
  if(!active||!file||uploading||busy||(recording&&!fromCapture))return false
  setUploading(true);setError('');setMessage('')
  const slideBefore=active.id,courseBefore=current.id
  const mediaKind=target==='cover'?'image':active.kind
  try{
   const prepared=mediaKind==='image'?await preparePhoto(file):file
   const mime=prepared.type.split(';')[0].toLowerCase()
   if(!Object.keys({image:{'image/jpeg':1,'image/png':1,'image/webp':1},audio:{'audio/mpeg':1,'audio/mp4':1,'audio/x-m4a':1},video:{'video/mp4':1,'video/quicktime':1}}[mediaKind]||{}).includes(mime))throw new Error('MEDIA_TYPE_NOT_ALLOWED')
   const limit=mediaKind==='image'?4000000:mediaKind==='audio'?20000000:25000000
   if(prepared.size>limit||prepared.size<128)throw new Error('MEDIA_SIZE_NOT_ALLOWED')
   const {item:intent}=await api({action:'upload-intent',courseId:courseBefore,mime,bytes:prepared.size})
   const client=createClient(intent.supabaseUrl,intent.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
   const result=await client.storage.from(intent.bucket).uploadToSignedUrl(intent.objectKey,intent.token,prepared,{contentType:mime,upsert:false})
   if(result.error)throw new Error(result.error.message||'MEDIA_UPLOAD_FAILED')
   await api({action:'upload-complete',assetId:intent.assetId})
   if(selected!==courseBefore)throw new Error('ACCOUNT_CHANGED')
   setDraft(d=>({...d,slides:d.slides.map(s=>s.id===slideBefore?{...s,...(target==='cover'?(s.kind==='image'?{assetId:intent.assetId,coverAssetId:null}:{coverAssetId:intent.assetId}):{assetId:intent.assetId})}:s)}))
   setMessage(t.fileReady+' · '+t.save)
   return true
  }catch(e){setError(e.message);return false}
  finally{setUploading(false)}
 }
 async function share(){
  if(!current||!shareHref)return
  const url=new URL(shareHref,window.location.origin).href
  try{if(navigator.share){await navigator.share({title:current.published?.title||current.draft?.title,url});return}
   await navigator.clipboard.writeText(url);setMessage(t.copied)}
  catch(e){if(e.name!=='AbortError')setError('SHARE_UNAVAILABLE')}
 }
 return <section className={styles.root} data-practitioner-course-builder>
  <header className={styles.heading}><div><h3><BookOpen size={19}/>{t.heading}</h3><p>{t.sub}</p></div>
   {creating?items.length>0&&<button type="button" className={styles.secondary} disabled={busy||uploading||recording} onClick={()=>setCreating(false)}>{t.cancel}</button>
   :<button type="button" className={styles.primary} disabled={busy||uploading||recording} onClick={openCreate}><Plus size={17}/>{t.new}</button>}
  </header>
  {loading?<p aria-live="polite">…</p>:loadFailed?
   <div className={styles.loadFailure} role="status"><p>{t.unavailable}</p><button type="button" className={styles.secondary} onClick={()=>setRetryKey(n=>n+1)}>{t.retry}</button></div>:
   <div className={styles.columns}>
    {items.length>0&&<button type="button" className={styles.courseSwitch} aria-expanded={listOpen} onClick={()=>setListOpen(open=>!open)}><BookOpen size={17}/>{t.myCourses} · {items.length}<ChevronRight size={16} aria-hidden="true"/></button>}
    {items.length>0&&<aside className={styles.courseList} aria-label={t.select} data-mobile-open={listOpen}>
     {items.filter(item=>[item.draft?.title,item.draft?.description].join(' ').toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())).map(item=><button type="button" key={item.id} disabled={busy||uploading||recording}
       className={item.id===selected?styles.selected:''} aria-pressed={item.id===selected} onClick={()=>choose(item)}>
       <span className={styles.courseArtwork}><BookOpen size={21} aria-hidden="true"/></span>
       <span className={styles.courseCardCopy}><strong>{item.draft?.title||t.new}</strong>
        <small>{item.draft?.locale?.toUpperCase()} · {item.draft?.slides?.length||0} {t.slides.toLowerCase()}</small>
        <span className={item.status==='published'?styles.publishedTag:styles.draftTag}>{item.status==='published'?t.published:t.draft}</span>
       </span><ChevronRight size={17} aria-hidden="true"/>
      </button>)}
    </aside>}
    {creating&&<form className={styles.quickStart+(!items.length?' '+styles.fullWidth:'')} onSubmit={event=>void create(event)} data-course-quick-start>
     <div className={styles.progress} aria-label={t.stepName+' / '+t.stepBuild+' / '+t.stepPublish}><span className={styles.progressActive}>1 · {t.stepName}</span><span>2 · {t.stepBuild}</span><span>3 · {t.stepPublish}</span></div>
     <h4>{t.startTitle}</h4><p>{t.startHint}</p>
     <label>{t.name}<input type="text" required maxLength={140} value={newTitle} placeholder={t.startExample} onChange={event=>setNewTitle(event.target.value)} disabled={busy||uploading||recording}/></label>
     <label>{t.lang}<select value={newLocale} onChange={event=>setNewLocale(event.target.value)} disabled={busy||uploading||recording}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
     <small className={styles.privateNote}><LockKeyhole size={14} aria-hidden="true"/>{t.intro} {t.private}.</small>
     <button type="submit" className={styles.primary} disabled={busy||uploading||recording||!newTitle.trim()}><Plus size={17}/>{busy?t.saving:t.createNow}</button>
    </form>}
    {!creating&&current&&draft&&<div className={styles.editor}>
     <div className={styles.progress} aria-label={t.stepName+' / '+t.stepBuild+' / '+t.stepPublish}><span>1 · {t.stepName}</span><span className={styles.progressActive}>2 · {t.stepBuild}</span><span>3 · {t.stepPublish}</span></div>
     <div className={styles.simpleTitle}><label>{t.name}<input value={draft.title} maxLength={140} required onChange={e=>setDraft({...draft,title:e.target.value})} disabled={busy||uploading||recording}/></label></div>
     <details className={styles.courseSettings}><summary>{t.moreSettings} · {draft.locale.toUpperCase()}</summary>
      <div className={styles.fields}>
       <label>{t.lang}<select value={draft.locale} disabled={busy||uploading||recording} onChange={e=>setDraft({...draft,locale:e.target.value})}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option></select></label>
       <label className={styles.wide}>{t.summary}<textarea rows={2} maxLength={900} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} disabled={busy||uploading||recording}/></label>
      </div>
     </details>
     <div className={styles.slideHeading}><strong>{t.slides} · {draft.slides.length}/60</strong>
      <button type="button" onClick={addSlide} disabled={busy||uploading||recording||draft.slides.length>=60}><Plus size={15}/>{t.add}</button></div>
     <div className={styles.elementToolbar} role="toolbar" aria-label={t.elementToolbar} data-course-slide-types data-course-element-toolbar>
      <button type="button" disabled={busy||uploading||recording||!active} onClick={()=>focusBlock(bodyRef)}><AlignLeft size={20}/><span>{t.elementText}</span></button>
      <button type="button" disabled={busy||uploading||recording||!active} onClick={()=>photoInputRef.current?.click()}><ImageIcon size={20}/><span>{t.elementPhoto}</span></button>
      <button type="button" disabled={busy||uploading||recording||!active} aria-pressed={active?.kind==='audio'} onClick={()=>changeMediaKind('audio')}><Headphones size={20}/><span>{t.elementAudio}</span></button>
      <button type="button" disabled={busy||uploading||recording||!active} aria-pressed={active?.kind==='video'||active?.kind==='embed'} onClick={()=>changeMediaKind('video')}><Film size={20}/><span>{t.elementVideo}</span></button>
      <button type="button" disabled={busy||uploading||recording||!active} onClick={()=>focusBlock(questionRef)}><MessageCircleQuestion size={20}/><span>{t.elementQuestion}</span></button>
      <button type="button" disabled={busy||uploading||recording||!active} onClick={()=>{
       setShowPreview(false)
       requestAnimationFrame(()=>{if(ctaDetailsRef.current){ctaDetailsRef.current.open=true;ctaLabelRef.current?.focus()}})
      }}><Link2 size={20}/><span>{t.elementCta}</span></button>
     </div>
     {active&&<div className={styles.slideEditor} key={active.id}>
      <div className={styles.canvasFrame} data-course-visual-canvas>
       <div className={styles.canvasActions} role="group" aria-label={t.slides}>
        <button type="button" title={t.moveUp} aria-label={t.moveUp} onClick={()=>moveSlide(-1)} disabled={busy||uploading||recording||draft.slides[0]?.id===slideId}><ArrowUp size={17}/></button>
        <button type="button" title={t.moveDown} aria-label={t.moveDown} onClick={()=>moveSlide(1)} disabled={busy||uploading||recording||draft.slides[draft.slides.length-1]?.id===slideId}><ArrowDown size={17}/></button>
        <button type="button" title={t.duplicate} aria-label={t.duplicate} onClick={duplicateSlide} disabled={busy||uploading||recording||draft.slides.length>=60}><Copy size={17}/></button>
        <button type="button" className={styles.deleteScreen} title={t.removeSlide} aria-label={t.removeSlide} onClick={removeSlide} disabled={busy||uploading||recording}><Trash2 size={17}/></button>
       </div>
       <div className={styles.slideCanvas} data-course-slide-preview aria-label={t.lessonCanvas}>
        {(!showPreview||coverId)&&<div className={styles.photoStage} data-course-photo-placeholder>
         {coverId?<img loading="lazy" src={'/api/practitioner-course-media/'+coverId} alt={active.title||t.photoAlt}/>:
          <div className={styles.landscapePlaceholder} aria-label={t.noPhoto}><span aria-hidden="true" className={styles.sunGlow}/></div>}
         {!showPreview&&<div className={styles.photoControls}>
          <button type="button" className={styles.photoUpload} disabled={busy||uploading||recording} onClick={()=>photoInputRef.current?.click()}>
           <Plus size={20} aria-hidden="true"/>{uploading?t.uploading:coverId?t.replacePhoto:t.addPhoto}
          </button>
          {coverId&&<button type="button" className={styles.photoRemove} onClick={removeCover} disabled={busy||uploading||recording} aria-label={t.removePhoto}><X size={17}/></button>}
         </div>}
        </div>}
        <input ref={photoInputRef} type="file" className={styles.visuallyHidden} accept={fileAccept.image}
         disabled={busy||uploading||recording} aria-label={t.addPhoto}
         onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file,false,'cover')}}/>
        <div className={styles.pageContent}>
         {showPreview?
          (active.title&&<h4 className={styles.canvasTitle}>{active.title}</h4>):
          <label className={styles.canvasTitleField}><span className={styles.visuallyHidden}>{t.slideTitle}</span>
           <input className={styles.canvasTitleInput} value={active.title} maxLength={140} placeholder={t.screenTitlePlaceholder}
            disabled={busy||uploading||recording} onChange={e=>updateSlide({title:e.target.value})}/></label>}
         {(!showPreview||active.question)&&<div className={styles.questionBlock} data-course-question-block>
          <span className={styles.blockIcon}><MessageCircleQuestion size={22} aria-hidden="true"/></span>
          <div className={styles.blockCopy}><strong>{t.questionLabel}</strong>
           {showPreview?<p>{active.question}</p>:
            <textarea ref={questionRef} aria-label={t.questionLabel} rows={2} maxLength={500} value={active.question||''} placeholder={t.questionPlaceholder}
             disabled={busy||uploading||recording} onChange={e=>updateSlide({question:e.target.value})}/>}
          </div>
         </div>}
         {(!showPreview||active.body)&&<div className={styles.instructionBlock} data-course-text-block>
          <span className={styles.blockIcon}><AlignLeft size={22} aria-hidden="true"/></span>
          <div className={styles.blockCopy}><strong>{t.instructionLabel}</strong>
           {showPreview?<p>{active.body}</p>:
            <textarea ref={bodyRef} aria-label={t.instructionLabel} rows={3} maxLength={4000} value={active.body} placeholder={t.instructionPlaceholder}
             disabled={busy||uploading||recording} onChange={e=>updateSlide({body:e.target.value})}/>}
          </div>
         </div>}
         {(!showPreview||(active.ctaLabel&&active.ctaUrl))&&<div className={styles.ctaBlock} data-course-cta-block>
          {showPreview?<span className={styles.ctaPreview}><Link2 size={17}/>{active.ctaLabel}<ChevronRight size={16}/></span>:
           <details ref={ctaDetailsRef} key={active.id+':cta'} className={styles.ctaDetails} defaultOpen={!!(active.ctaLabel||active.ctaUrl)}>
            <summary><Link2 size={19}/>{active.ctaLabel||t.optionalCta}<ChevronRight size={16}/></summary>
            <div className={styles.ctaFields}>
             <label>{t.buttonText}<input ref={ctaLabelRef} type="text" maxLength={90} value={active.ctaLabel||''} placeholder={t.buttonTextExample}
              disabled={busy||uploading||recording} onChange={e=>updateSlide({ctaLabel:e.target.value})}/></label>
             <label>{t.buttonUrl}<input type="text" inputMode="url" maxLength={900} value={active.ctaUrl||''} placeholder="https://…"
              disabled={busy||uploading||recording} onChange={e=>updateSlide({ctaUrl:e.target.value})}/></label>
            </div>
           </details>}
         </div>}
         {(active.kind==='audio'||active.kind==='video'||active.kind==='embed')&&<div className={styles.mediaBox} data-course-media-attachment>
          <strong><Film size={16}/>{t.mediaTitle}</strong>
          {active.kind==='embed'?
           <label><Link2 size={15}/>{t.link}<input type="url" value={active.videoUrl||''} placeholder="https://youtu.be/…"
            disabled={busy||uploading||recording} onChange={e=>updateSlide({videoUrl:e.target.value})}/></label>:
           <>
            {!showPreview&&<label className={styles.mediaUpload}><Plus size={16}/>{uploading?t.uploading:t.upload}
             <input type="file" accept={fileAccept[active.kind]} disabled={busy||uploading||recording}
              onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file)}}/></label>}
            {!showPreview&&<CourseSlideRecorder key={active.id+':'+active.kind} kind={active.kind} locale={locale} busy={busy||uploading}
             onRecordingChange={setRecording} onUpload={file=>upload(file,true)}/>}
            {active.assetId&&<div className={styles.preview}>
             {active.kind==='audio'?<audio controls preload="none" src={'/api/practitioner-course-media/'+active.assetId}/>:
              <video controls playsInline preload="none" src={'/api/practitioner-course-media/'+active.assetId}/>}
            </div>}
           </>}
          {!showPreview&&(active.kind==='video'||active.kind==='embed')&&<button type="button" className={styles.mediaMode} disabled={busy||uploading||recording}
           onClick={()=>changeMediaKind(active.kind==='embed'?'video':'embed')}>{active.kind==='embed'?t.uploadVideo:t.externalVideo}</button>}
          {active.kind==='video'&&active.assetId&&<details className={styles.youtubePrepare} data-course-youtube-handoff>
           <summary><ExternalLink size={16}/>{t.youtubePrep}</summary>
           <p>{t.youtubeNote}</p><div className={styles.youtubeActions}>
            <a href={'/api/practitioner-course-media/'+active.assetId+'?download=1'}><Download size={16}/>{t.youtubeDownload}</a>
            {typeof onOpenYoutube==='function'
             ?<button type="button" onClick={onOpenYoutube} disabled={busy||uploading||recording}><ExternalLink size={16}/>{t.youtubeUploader}</button>
             :<a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>{t.youtubeStudio}</a>}
           </div>
          </details>}
          <small>{t.limit} · {t.private}</small>
          {!showPreview&&<button type="button" className={styles.mediaMode} disabled={busy||uploading||recording}
           onClick={()=>changeMediaKind('text')}>{t.removeMedia}</button>}
         </div>}
        </div>
       </div>
      </div>
      <div className={styles.canvasFooter}>
       <button type="button" className={styles.previewToggle} aria-expanded={showPreview} onClick={()=>setShowPreview(v=>!v)}>
        {showPreview?<Pencil size={16}/>:<Eye size={16}/>} {showPreview?t.editSlide:t.visualPreview}
       </button>
      </div>
     </div>}
     <div className={styles.slidePicker} role="group" aria-label={t.slides} data-course-slide-thumbnails>
      {draft.slides.map((slide,i)=><button type="button" key={slide.id} aria-pressed={slide.id===slideId}
       onClick={()=>{setSlideId(slide.id);setShowPreview(false)}} disabled={busy||uploading||recording}>
       <span className={styles.thumbnailArt}>
        {slide.coverAssetId||(slide.kind==='image'&&slide.assetId)?
         <img loading="lazy" src={'/api/practitioner-course-media/'+(slide.coverAssetId||slide.assetId)} alt=""/>:
         <ImageIcon size={23} aria-hidden="true"/>}
       </span><span className={styles.thumbnailNumber}>{i+1}</span><small>{slide.title||t.untitled}</small>
      </button>)}
      <button type="button" className={styles.addSlideTile} onClick={addSlide} disabled={busy||uploading||recording||draft.slides.length>=60}>
       <Plus size={23}/><small>{t.addScreen}</small>
      </button>
     </div>
     {active&&<div className={styles.slideTail}>
      <button type="button" className={styles.nextScreen} disabled={busy||uploading||recording||draft.slides.length>=60&&draft.slides[draft.slides.length-1]?.id===slideId}
       onClick={nextSlide}>{draft.slides[draft.slides.length-1]?.id===slideId?t.addNext:t.nextScreen}<ChevronRight size={17}/></button>
     </div>}
     <div className={styles.publishReadiness} role="status"><LockKeyhole size={14} aria-hidden="true"/>{publishIssue?t.notReady+' '+publishIssue:t.ready}</div>
     <div className={styles.bottom}>
      <span className={dirty?styles.dirty:styles.saved}>{dirty?t.unsaved:t.saved}</span>
      <button type="button" className={styles.secondary} disabled={busy||uploading||recording||!dirty} onClick={()=>void operate('save')}><Save size={16}/>{busy?t.saving:t.save}</button>
      <button type="button" className={styles.primary} disabled={busy||uploading||recording||!!publishIssue} onClick={()=>void operate('publish')}><Globe2 size={16}/>{current.status==='published'?t.republish:t.publish}</button>
     </div>
     {current.status==='published'&&<div className={styles.publicControls}>
      <a href={shareHref} target="_blank" rel="noopener noreferrer"><Eye size={16}/>{t.preview}</a>
      <button type="button" onClick={()=>void share()} disabled={busy||uploading||recording}><Share2 size={16}/>{t.share}</button>
      <button type="button" onClick={()=>void operate('unpublish')} disabled={busy||uploading||recording}>{t.hide}</button>
     </div>}
     <details className={styles.advanced}><summary>{t.advancedActions}</summary><button className={styles.archive} type="button" disabled={busy||uploading||recording} onClick={()=>void operate('archive')}>{t.delete}</button></details>
    </div>}
   </div>}
  {error&&!loadFailed&&<p className={styles.error} role="alert">{error}</p>}
  {message&&<p className={styles.message} role="status" aria-live="polite">{message}</p>}
 </section>
}
