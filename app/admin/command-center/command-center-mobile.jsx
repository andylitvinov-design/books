'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {suggestCommandTask,ownerTaskActions} from '@/lib/command-center/mobile-intake.mjs';
import styles from './command-center-mobile.module.css';
import CommandCenterVoiceButton from './command-center-voice-button';
import CommandCenterBatch from './command-center-batch';
import CommandCenterPrWatch from './command-center-pr-watch';
import {attachCommanderDraftReceiver} from '@/lib/command-center/task-transfer-receiver.mjs';

const labels={
 ru:{home:'Главная',tasks:'Задачи',agents:'Агенты',projects:'Проекты',hello:'Мой брифинг',subtitle:'Проекты и агенты · фактический статус',
   newTask:'Новая задача',today:'Главные приоритеты',allTasks:'Все задачи',working:'В работе',blocked:'Блокеры',
   verified:'Проверено',topProjects:'Состояние проектов',noProjects:'Создайте проект, чтобы группировать задачи',
   noTasks:'Задач пока нет. Добавьте первую — она сохранится в вашем списке.',
   plus:'Новая задача',add:'Добавить задачу',taskText:'Что нужно сделать?',taskPlaceholder:'Например: исправить проигрывание готового видео в Video Studio',
   description:'Критерий готовности или детали (необязательно)',project:'Проект',priority:'Приоритет',type:'Тип задачи',
   high:'Высокий',normal:'Обычный',source:'Ссылка на GitHub (при наличии)',save:'Сохранить задачу',saving:'Сохраняю…',
   close:'Закрыть',cancel:'Отмена',saved:'Задача сохранена',couldNotSave:'Не удалось сохранить задачу',
   needsSetup:'Ожидает настройки',view:'Подробнее',accepted:'Принята',executor:'Агент',pr:'PR',tests:'Тесты',live:'LIVE',
   current:'Текущий этап',iterations:'Итераций',history:'История выполнений',noRuns:'Пока нет запусков',notKnown:'Нет подтверждения',
   ready:'Готова к запуску',running:'Выполняется',needsSpec:'Нужен исполнитель',stopped:'Остановлена',
   verifiedMetadata:'Данные GitHub проверены',noRuntime:'Исполнитель для кода пока не подключён',
   noLive:'LIVE ещё не подтверждён',needsEvidence:'Нет независимого подтверждения',missingProofCount:'Задачи без доказательств',prOpened:'PR открыт',prMerged:'PR смержен',prWaiting:'PR ещё не найден',
   status:'Статус',start:'Запустить безопасную проверку',pause:'Приостановить проверки',
   resume:'Включить проверки',disabled:'Запуск пока недоступен',readOnly:'Только проверка GitHub',
   unavailable:'Хранилище задач недоступно. Не удалось подтвердить изменения.',
   retry:'Повторить разрешённую задачу',tasksFilter:'Фильтр задач',all:'Все',active:'Активные',
   kindCode:'Разработка',kindSpec:'План / ТЗ',kindPr:'Проверка PR',kindIssue:'Проверка Issue',
   reset:'Обновить',lastSync:'Последнее обновление',noAgents:'Не подключён',manual:'Ручной запуск',
   activeAgent:'Доступен для чтения',pausedAgent:'Выключен',chooseProject:'Без проекта',
   evidence:'Доказательства',noProof:'Нет доказательств выпуска',continue:'Следующий шаг',update:'Проверить статус',
   created:'Создана',taskCanceled:'Задача отменена',actionFailed:'Изменение не подтверждено',
   noMetrics:'Метрик пока нет',locked:'Войдите в админ-кабинет',admin:'Админка',
   healthy:'Доступны данные',unknown:'Статус неизвестен',newProject:'Новый проект',projectName:'Название проекта',
   projectSummary:'Для чего нужен проект?',createProject:'Создать проект',settings:'Управление автоматизацией',
   viewAutomations:'Все автоматизации',details:'Подробности',activity:'Журнал агентов',runSafe:'Проверить очередь сейчас',scheduler:'Циклы проверок',nothingVerified:'Нет подтверждённых результатов',partial:'Показаны только последние задачи',pm:'Большие задачи и планы',pmHint:'3 решения → работы → PR → LIVE',runEmpty:'Очередь пуста: ни один агент не запускался',runLimit:'Дневной лимит проверок исчерпан',runFailed:'Проверка не завершилась — смотрите журнал',pauseTask:'Приостановить задачу',cancelTask:'Отменить задачу',confirmCancel:'Подтвердить отмену',alreadyExists:'Такая проверка уже есть',suggestion:'GitHub-ссылка распознана. Проверка остаётся только для чтения',inspectDelivery:'Проверить PR, CI и production',delivery:'Проверка выпуска',releaseServed:'Код подтверждён на production',releaseUnproven:'Нет независимого подтверждения кода на production',releaseCi:'Текущие CI-проверки',releaseUnknown:'Недостаточно данных',releasePass:'Успешно',releaseFail:'Ошибка',releasePending:'Ещё выполняются',releaseBrowser:'Функциональная проверка интерфейса ещё не выполнена',proofFiles:'Изменённые файлы',proofMissing:'Список файлов не подтверждён',proofPartial:'неполный список',proofNext:'Следующее действие',proofOpenDiff:'Открыть изменения в GitHub'},
 en:{home:'Home',tasks:'Tasks',agents:'Agents',projects:'Projects',hello:'My briefing',subtitle:'Projects and agents · verified status',
   newTask:'New task',today:'Top priorities',allTasks:'All tasks',working:'Working',blocked:'Blocked',
   verified:'Verified',topProjects:'Projects',noProjects:'Create a project to group tasks',
   noTasks:'No tasks yet. Add one to your list.',plus:'New task',add:'Add task',taskText:'What needs to be done?',
   taskPlaceholder:'For example: fix video playback in Video Studio',description:'Acceptance criteria or details (optional)',
   project:'Project',priority:'Priority',type:'Task type',high:'High',normal:'Normal',source:'GitHub URL (optional)',
   save:'Save task',saving:'Saving…',close:'Close',cancel:'Cancel',saved:'Task saved',couldNotSave:'Task was not saved',
   needsSetup:'Needs setup',view:'Details',accepted:'Accepted',executor:'Agent',pr:'PR',tests:'Tests',live:'LIVE',
   current:'Current stage',iterations:'Iterations',history:'Execution history',noRuns:'No runs yet',notKnown:'Not verified',
   ready:'Ready',running:'In progress',needsSpec:'No executor',stopped:'Stopped',verifiedMetadata:'GitHub data verified',
   noRuntime:'Coding runtime is not connected',noLive:'LIVE has not been verified',needsEvidence:'No independent verification receipt',missingProofCount:'Tasks without evidence',prOpened:'PR opened',
   prMerged:'PR merged',prWaiting:'PR not linked',status:'Status',start:'Run safe check',pause:'Pause checks',
   resume:'Enable checks',disabled:'Execution unavailable',readOnly:'GitHub read-only',
   unavailable:'Task storage unavailable; changes could not be confirmed.',retry:'Retry permitted task',
   tasksFilter:'Task filter',all:'All',active:'Active',kindCode:'Development',kindSpec:'Plan / Spec',
   kindPr:'PR audit',kindIssue:'Issue audit',reset:'Refresh',lastSync:'Last updated',noAgents:'Not connected',
   manual:'Manual',activeAgent:'Read-only available',pausedAgent:'Disabled',chooseProject:'No project',
   evidence:'Evidence',noProof:'No release evidence',continue:'Next step',update:'Refresh status',
   created:'Created',taskCanceled:'Task cancelled',actionFailed:'Change not confirmed',
   noMetrics:'No metrics yet',locked:'Admin login required',admin:'Admin',
   healthy:'Data available',unknown:'Unknown',newProject:'New project',projectName:'Project name',
   projectSummary:'What is the project for?',createProject:'Create project',settings:'Automation controls',
   viewAutomations:'All automations',details:'Details',activity:'Agent activity',runSafe:'Check safe queue now',scheduler:'Scheduler cycles',nothingVerified:'No verified results yet',partial:'Showing only the latest tasks',pm:'Major tasks and plans',pmHint:'3 solutions → tasks → PR → LIVE',runEmpty:'No ready work: no agent was launched',runLimit:'Daily audit limit reached',runFailed:'Audit not completed — see execution history',pauseTask:'Pause task',cancelTask:'Cancel task',confirmCancel:'Confirm cancellation',alreadyExists:'This audit task already exists',suggestion:'GitHub URL recognized. The audit is read-only',inspectDelivery:'Check PR, CI and production',delivery:'Release verification',releaseServed:'Code confirmed on production',releaseUnproven:'No independent production-code evidence',releaseCi:'Current CI checks',releaseUnknown:'Not independently confirmed',releasePass:'Passed',releaseFail:'Failed',releasePending:'Still running',releaseBrowser:'Functional UI acceptance is still pending',proofFiles:'Changed files',proofMissing:'File list not verified',proofPartial:'partial list',proofNext:'Next action',proofOpenDiff:'View changes on GitHub'},
 es:{home:'Inicio',tasks:'Tareas',agents:'Agentes',projects:'Proyectos',hello:'Mi informe',subtitle:'Proyectos y agentes · estado verificado',
   newTask:'Nueva tarea',today:'Prioridades',allTasks:'Todas las tareas',working:'En curso',blocked:'Bloqueadas',
   verified:'Verificadas',topProjects:'Proyectos',noProjects:'Crea un proyecto para organizar tareas',
   noTasks:'No hay tareas. Añade la primera.',plus:'Nueva tarea',add:'Añadir tarea',
   taskText:'¿Qué hay que hacer?',taskPlaceholder:'Ejemplo: arreglar la reproducción de vídeos',
   description:'Criterios de aceptación o detalles (opcional)',project:'Proyecto',priority:'Prioridad',type:'Tipo',
   high:'Alta',normal:'Normal',source:'Enlace GitHub (opcional)',save:'Guardar',saving:'Guardando…',
   close:'Cerrar',cancel:'Cancelar',saved:'Tarea guardada',couldNotSave:'No se guardó la tarea',
   needsSetup:'Necesita configuración',view:'Detalles',accepted:'Recibida',executor:'Agente',pr:'PR',tests:'Pruebas',live:'LIVE',
   current:'Estado',iterations:'Intentos',history:'Historial',noRuns:'Sin ejecuciones',
   notKnown:'Sin verificar',ready:'Lista',running:'En curso',needsSpec:'Sin ejecutor',
   stopped:'Detenida',verifiedMetadata:'Datos de GitHub verificados',
   noRuntime:'No hay ejecutor de código',noLive:'LIVE sin verificar',needsEvidence:'Sin comprobante independiente',missingProofCount:'Tareas sin pruebas',
   prOpened:'PR abierto',prMerged:'PR integrado',prWaiting:'PR sin vincular',status:'Estado',
   start:'Ejecutar revisión segura',pause:'Pausar',resume:'Activar revisiones',disabled:'No disponible',
   readOnly:'GitHub de solo lectura',unavailable:'Almacenamiento no disponible.',
   retry:'Reintentar tarea permitida',tasksFilter:'Filtrar tareas',all:'Todas',active:'Activas',
   kindCode:'Desarrollo',kindSpec:'Plan',kindPr:'Auditar PR',kindIssue:'Auditar Issue',reset:'Actualizar',
   lastSync:'Actualizado',noAgents:'No conectado',manual:'Manual',activeAgent:'Solo lectura',
   pausedAgent:'Desactivado',chooseProject:'Sin proyecto',evidence:'Evidencias',noProof:'Sin evidencia de LIVE',
   continue:'Siguiente paso',update:'Ver estado',created:'Creada',taskCanceled:'Cancelada',
   actionFailed:'Cambio sin confirmar',noMetrics:'Sin métricas',locked:'Requiere login',
   admin:'Admin',healthy:'Datos disponibles',unknown:'Desconocido',newProject:'Nuevo proyecto',
   projectName:'Nombre',projectSummary:'Objetivo',createProject:'Crear proyecto',
   settings:'Automatizaciones',viewAutomations:'Todas las automatizaciones',details:'Detalles',activity:'Actividad de agentes',runSafe:'Revisar cola segura ahora',scheduler:'Ciclos programados',nothingVerified:'Aún no hay resultados verificados',partial:'Solo se muestran las tareas recientes',pm:'Grandes tareas y planes',pmHint:'3 soluciones → tareas → PR → LIVE',runEmpty:'No hay tareas listas: ningún agente se inició',runLimit:'Límite diario de auditorías alcanzado',runFailed:'Auditoría sin completar: revisa el historial',pauseTask:'Pausar tarea',cancelTask:'Cancelar tarea',confirmCancel:'Confirmar cancelación',alreadyExists:'Esta auditoría ya existe',suggestion:'Enlace GitHub reconocido. La revisión es de solo lectura',inspectDelivery:'Verificar PR, CI y producción',delivery:'Verificación del lanzamiento',releaseServed:'Código confirmado en producción',releaseUnproven:'No hay prueba independiente de código en producción',releaseCi:'Verificaciones CI actuales',releaseUnknown:'No verificado',releasePass:'Correcto',releaseFail:'Error',releasePending:'En curso',releaseBrowser:'Falta la prueba funcional del sitio',proofFiles:'Archivos modificados',proofMissing:'Lista de archivos no verificada',proofPartial:'lista parcial',proofNext:'Siguiente acción',proofOpenDiff:'Ver cambios en GitHub'}
};
const deliveryNextLabels={
 ru:{inspect_again:'Повторить проверку данных',closed_without_merge:'PR закрыт без слияния',repair_checks:'Исправить проваленные проверки CI',wait_checks:'Дождаться окончания текущего CI',review_protected_merge:'Проверить защищённое слияние PR',check_ci_evidence:'Уточнить CI для текущего HEAD',check_functional_live:'Проверить работу функции на LIVE',verify_deployment_identity:'Проверить SHA production-деплоя',await_verified_deployment:'Проверить обновление production'},
 en:{inspect_again:'Repeat the evidence check',closed_without_merge:'PR was closed without merge',repair_checks:'Repair failed CI checks',wait_checks:'Wait for running CI',review_protected_merge:'Review protected PR merge',check_ci_evidence:'Verify CI evidence on current HEAD',check_functional_live:'Test the feature on LIVE',verify_deployment_identity:'Verify production deployment SHA',await_verified_deployment:'Check production deployment'},
 es:{inspect_again:'Repetir verificación',closed_without_merge:'PR cerrado sin integrar',repair_checks:'Corregir pruebas CI fallidas',wait_checks:'Esperar las pruebas CI',review_protected_merge:'Revisar integración protegida',check_ci_evidence:'Verificar CI del commit actual',check_functional_live:'Probar función en producción',verify_deployment_identity:'Verificar SHA del despliegue',await_verified_deployment:'Verificar despliegue de producción'}
};
const transferLabels={
 ru:{notice:'Черновик получен с отдельного Agent Commander. Проверьте данные и сохраните задачу вручную.',heading:'Полный промпт для исполнителя',explain:'База задач хранит описание до 800 символов. Краткая версия ниже будет сохранена по вашему нажатию; полный промпт пока доступен только здесь для копирования.',copy:'Копировать полный промпт',copied:'Полный промпт скопирован.',failed:'Копирование недоступно — выделите текст вручную.'},
 en:{notice:'Draft received from standalone Agent Commander. Review before saving.',heading:'Full executor prompt',explain:'Task storage currently limits descriptions to 800 characters. The short version below is saved only after your click; copy the full prompt here.',copy:'Copy full prompt',copied:'Full prompt copied.',failed:'Copy unavailable. Select text manually.'},
 es:{notice:'Borrador recibido. Revísalo antes de guardarlo.',heading:'Prompt completo',explain:'La base admite descripciones de 800 caracteres. La versión corta solo se guarda al confirmar; copia el prompt completo aquí.',copy:'Copiar prompt completo',copied:'Prompt copiado.',failed:'No se pudo copiar. Selecciona el texto manualmente.'}
};
const blockedStates=new Set(['needs_spec','blocked_dependency','blocked_no_runner','blocked_external','blocked_approval','blocked_budget','dead_letter']);
const runningStates=new Set(['running','awaiting_evidence','retry_wait','ready','planned']);
const verifiedStates=new Set(['completed_verified','completed_live']);
const safe=(value,max=180)=>typeof value==='string'?value.trim().slice(0,max):'';
const isTrustedEvidenceUrl=value=>typeof value==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/(pull|issues)\/[1-9]\d{0,7}$/.test(value);
const date=value=>{if(!value)return '—';try{return new Intl.DateTimeFormat('ru-RU',{timeZone:'America/Toronto',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return '—';}};
const glyph={home:'⌂',tasks:'☑',agents:'♧',projects:'▦'};
function stateLabel(state,t,hasEvidence=false){
 if(state==='completed_live')return 'LIVE ✓';
 if(state==='completed_verified')return hasEvidence===true?t.verifiedMetadata:t.needsEvidence;
 if(state==='running')return t.running;
 if(state==='ready'||state==='retry_wait')return t.ready;
 if(blockedStates.has(state))return t.needsSpec;
 if(state==='paused'||state==='canceled')return t.stopped;
 return state||t.notKnown;
}
/**
 * Explicitly type the owner-provided registry: an unannotated [] default
 * gets inferred as never[] by Next's TypeScript consumer.
 * @param {{lang?: string, initialSnapshot?: any, registry?: readonly any[], envReady?: boolean}} props
 */
export default function CommandCenterMobile({lang='ru',initialSnapshot=null,registry=[],envReady=false}){
 const t=labels[lang]||labels.ru,router=useRouter();
 const [snapshot,setSnapshot]=useState(initialSnapshot);
 const [tab,setTab]=useState('home'),[filter,setFilter]=useState('all');
 const [selected,setSelected]=useState(null),[composer,setComposer]=useState(false),[projectComposer,setProjectComposer]=useState(false);
 const [draft,setDraft]=useState(''),[details,setDetails]=useState(''),[source,setSource]=useState(''),[kind,setKind]=useState('code_change'),
   [project,setProject]=useState(''),[priority,setPriority]=useState('65'),[projectName,setProjectName]=useState(''),[projectSummary,setProjectSummary]=useState('');
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmCancel,setConfirmCancel]=useState(null);
 const [importedPrompt,setImportedPrompt]=useState('');
 const transferText=transferLabels[lang]||transferLabels.ru;
 const [deliveryCheck,setDeliveryCheck]=useState(null);
 const enabled=Boolean(snapshot?.settings?.enabled&&envReady),available=Boolean(snapshot);
 const tasks=snapshot?.tasks||[],projects=snapshot?.projects||[],runs=snapshot?.runs||[],evidences=snapshot?.evidence||[],slots=snapshot?.slots||[];
 const visibleTasks=useMemo(()=>[...tasks].filter(v=>filter==='all'||(filter==='active'?runningStates.has(v.state):blockedStates.has(v.state)))
   .sort((a,b)=>(b.priority||0)-(a.priority||0)),[tasks,filter]);
 const refresh=useCallback(async()=>{
  try{const res=await fetch('/api/admin/command-center',{method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!res.ok)return;const data=await res.json();if(data?.status==='database_available')setSnapshot(data);
  }catch{}
 },[]);
 useEffect(()=>{const onFocus=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',onFocus);
  const timer=setInterval(()=>{if(!document.hidden)refresh();},45000);
  return ()=>{document.removeEventListener('visibilitychange',onFocus);clearInterval(timer);};
 },[refresh]);
 useEffect(()=>attachCommanderDraftReceiver(task=>{
  // No source write: import only opens this existing owner-authenticated composer.
  setDraft(task.title);setDetails(task.description);setImportedPrompt(task.fullPrompt);
  setSource('');setKind('code_change');setProject('');setPriority('65');
  setTab('tasks');setSelected(null);setComposer(true);setNotice(transferText.notice);
 }),[transferText.notice]);
 useEffect(()=>{if(!composer&&!projectComposer)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(e)=>{if(e.key==='Escape'){setComposer(false);setProjectComposer(false);}};
  document.addEventListener('keydown',onKey);
  return ()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',onKey);};
 },[composer,projectComposer]);
 const send=async(action,extra={})=>{
  if(busy||!available)return null;setBusy(true);setNotice('');
  try{
   const res=await fetch('/api/admin/command-center',{method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'same-origin',cache:'no-store',body:JSON.stringify({action,requestId:crypto.randomUUID(),...extra})});
   const result=await res.json();
   if(!res.ok||result.error||['unconfirmed','stale_unconfirmed','transition_denied','not_found'].includes(result.status)){
    setNotice(t.actionFailed+(result?.error?' · '+result.error:result?.status?' · '+result.status:''));return null;
   }
   if(action==='run_now'&&result.status!=='completed_verified'){
    setNotice(result.status==='no_ready_work'?t.runEmpty:
      result.status==='budget_paused'?t.runLimit:t.runFailed);
    await refresh();return null;
   }
   await refresh();router.refresh();return result;
  }catch{setNotice(t.actionFailed);return null;}
  finally{setBusy(false);}
 };
 const saveTask=async e=>{e.preventDefault();const title=safe(draft,140);
  if(title.length<6){setNotice(t.taskText);return;}
  const description=safe(details,800)||title+(title.length<10?' — '+t.details:'');
  const result=await send('create_task',{title,description,kind,projectId:project||null,sourceRef:safe(source)||null,priority:Number(priority)});
  if(result){setComposer(false);setDraft('');setDetails('');setSource('');setImportedPrompt('');
    setNotice(result.status==='already_exists'?t.alreadyExists:t.saved);
    setTab('tasks');setFilter('all');if(result.task?.id)setSelected(result.task.id);}
 };
 const saveProject=async e=>{e.preventDefault();const result=await send('create_project',{title:safe(projectName,120),summary:safe(projectSummary,550)});
  if(result){setProjectComposer(false);setProjectName('');setProjectSummary('');setTab('projects');}
 };
 const inspectDelivery=async()=>{
   if(!selected)return;
   const id=selected;
   const result=await send('inspect_delivery',{taskId:id});
   if(result?.status==='observed'&&result.proof)setDeliveryCheck({id,proof:result.proof});
 };
 const selectedTask=tasks.find(v=>v.id===selected);
 const selectedProof=deliveryCheck?.id===selected?deliveryCheck.proof:null;
 const taskActions=ownerTaskActions(selectedTask);
 const taskEvidence=evidences.filter(v=>v.task_id===selectedTask?.id);
 const latestEvidence=taskEvidence[0]||null;
 const observed=latestEvidence?.observed||null;
 const prMatched=Boolean(selectedTask?.source_ref?.includes('/pull/'));
 const merged=selectedProof?selectedProof.prState==='merged':Boolean(observed?.merged);
 const agentActive=Boolean(selectedTask?.state==='running');
 const verifiedTask=selectedTask?.state==='completed_verified'&&selectedTask?.has_evidence===true;
 const phases=[
  {label:t.accepted,ok:Boolean(selectedTask),current:false},
  {label:t.executor,ok:agentActive||verifiedTask,current:agentActive},
  {label:t.pr,ok:prMatched&&Boolean(latestEvidence),current:prMatched&&!latestEvidence},
  {label:t.tests,ok:selectedProof?.ci==='passed',current:false},
  {label:t.live,ok:selectedTask?.state==='completed_live',current:false}
 ];
 const count=(fn)=>tasks.filter(fn).length;
 const taskCard=(v,i)=> <button key={v.id} type="button" className={styles.taskCard} onClick={()=>setSelected(v.id)}>
  <span className={styles.rank}>{i+1}</span><span className={styles.taskCopy}><strong>{v.title}</strong>
  <small>{projects.find(p=>p.id===v.project_id)?.title||t.chooseProject} · {stateLabel(v.state,t,v.has_evidence)} {v.attempt_count>0?'· '+v.attempt_count+'×':''}</small></span>
  <span className={blockedStates.has(v.state)?styles.bad:verifiedStates.has(v.state)&&v.has_evidence===true?styles.good:styles.purple} aria-hidden="true">●</span>
  </button>;
 const tabs=[['home',t.home],['tasks',t.tasks],['plus',t.plus],['agents',t.agents],['projects',t.projects]];
 return <div className={styles.app} lang={lang} data-hh-command-center-mobile>
  <header className={styles.top}><div className={styles.logo}>✺</div><div className={styles.brand}><strong>Holistic House</strong><small>Command Center</small></div>
   <button className={styles.refresh} type="button" onClick={refresh} aria-label={t.reset}>↻</button>
   <a className={styles.admin} href="/admin" aria-label={t.admin}>⋮</a></header>
  {!available&&<div className={styles.warning} role="status">{t.unavailable}</div>}
  {notice&&<div className={styles.notice} role="status">{notice}<button type="button" onClick={()=>setNotice('')} aria-label={t.close}>×</button></div>}
  <main className={styles.main}>
   {selectedTask? <section className={styles.detail}>
    <button type="button" className={styles.back} onClick={()=>setSelected(null)}>‹ {t.tasks}</button>
    <p className={styles.overline}>{t.status} · {stateLabel(selectedTask.state,t,selectedTask.has_evidence)}</p>
    <h1>{selectedTask.title}</h1><p className={styles.summary}>{selectedTask.description}</p>
    <div className={styles.chips}><span>{projects.find(p=>p.id===selectedTask.project_id)?.title||t.chooseProject}</span>
     <span>P{selectedTask.priority}</span><span>{selectedTask.kind}</span></div>
    <div className={styles.panel}><h2>{t.current}</h2>
     <div className={styles.pipeline}>{phases.map((p,i)=><div key={p.label} className={styles.phase}>
       <span className={p.ok?styles.phaseDone:p.current?styles.phaseCurrent:styles.phasePending}>{p.ok?'✓':i+1}</span>
       <small>{p.label}</small></div>)}</div>
     <p className={styles.subline}>{merged?t.prMerged:prMatched&&latestEvidence?t.prOpened:t.prWaiting} · {t.noLive}</p>
    </div>
    {prMatched&&<div className={styles.panel} aria-label={t.delivery}>
     <h2>{t.delivery}</h2>
     <button className={styles.secondary} type="button" disabled={!available||busy}
       onClick={inspectDelivery}>{t.inspectDelivery}</button>
     {selectedProof&&<div className={styles.proofDetail} role="status">
      <p className={selectedProof.codeOnProduction?styles.good:styles.muted}>
       {selectedProof.codeOnProduction?t.releaseServed:t.releaseUnproven}</p>
      <p>{t.releaseCi}: {selectedProof.ci==='passed'?t.releasePass:selectedProof.ci==='failed'?t.releaseFail:selectedProof.ci==='pending'?t.releasePending:t.releaseUnknown}</p>
      {selectedProof.servingSha&&<small>Production SHA: {selectedProof.servingSha.slice(0,12)}</small>}
      {selectedProof.observedAt&&<small>{date(selectedProof.observedAt)}</small>}
      <p><strong>{t.proofNext}:</strong> {deliveryNextLabels[lang]?.[selectedProof.nextAction]||t.releaseUnknown}</p>
      {selectedProof.fileSummary?.known?
       <details className={styles.prFiles}>
        <summary>{t.proofFiles}: {selectedProof.fileSummary.count}
         {!selectedProof.fileSummary.complete?' · '+t.proofPartial:''}</summary>
        <div className={styles.prFileRows}>
         {selectedProof.fileSummary.items.map(file=><div className={styles.prFileRow} key={file.path}>
          <span>{file.path}</span><small>{file.status} · +{file.additions} / -{file.deletions}</small>
         </div>)}
         <a className={styles.github} href={selectedProof.prUrl+'/files'} target="_blank"
            rel="noopener noreferrer">{t.proofOpenDiff} ↗</a>
        </div>
       </details>:<p className={styles.muted}>{t.proofMissing}</p>}
      <p className={styles.muted}>{t.releaseBrowser}</p>
      <p className={styles.muted}>{t.noLive}</p>
     </div>}
    </div>}
    <div className={styles.panel}><h2>{t.executor}</h2><div className={styles.agentLine}>
       <span className={styles.agentIcon}>⌘</span><div><strong>{selectedTask.kind==='repo_pr_audit'||selectedTask.kind==='repo_issue_audit'?'GitHub Reader':'Codex'}</strong>
       <small>{selectedTask.auto_allowed?(enabled?t.readOnly:t.pausedAgent):t.noRuntime}</small></div>
       <span className={selectedTask.auto_allowed&&enabled?styles.greenDot:styles.greyDot}>●</span></div>
      <p className={styles.subline}>{t.iterations}: {selectedTask.attempt_count||0} · {t.verifiedMetadata}: {latestEvidence?date(latestEvidence.created_at):t.notKnown}</p>
    </div>
    <div className={styles.panel}><h2>{t.history}</h2>
     {runs.filter(r=>r.task_id===selectedTask.id).map(run=><div key={run.id} className={styles.event}>
       <span>◷</span><div><strong>{run.worker_id} · {run.state}</strong><small>{date(run.started_at)} {run.error_code||''}</small></div></div>)}
     {!runs.some(r=>r.task_id===selectedTask.id)&&<p className={styles.muted}>{t.noRuns}</p>}
     {selectedTask.source_ref&&<a className={styles.github} href={selectedTask.source_ref} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
     {taskEvidence.map(e=><a key={e.run_id} className={styles.github} target="_blank" rel="noopener noreferrer" href={e.source_url}>{t.evidence} · {date(e.created_at)} ↗</a>)}
    </div>
    <div className={styles.taskControls}>
     {taskActions.resume&&<button className={styles.primary} disabled={busy} type="button"
       onClick={()=>send('task_ready',{taskId:selectedTask.id})}>{t.retry}</button>}
     {taskActions.pause&&<button className={styles.secondary} disabled={busy} type="button"
       onClick={()=>send('task_pause',{taskId:selectedTask.id})}>{t.pauseTask}</button>}
     {taskActions.cancel&&<button className={styles.secondary} disabled={busy} type="button"
       onClick={async()=>{
        if(confirmCancel!==selectedTask.id){setConfirmCancel(selectedTask.id);return;}
        const response=await send('task_cancel',{taskId:selectedTask.id});
        if(response){setSelected(null);setConfirmCancel(null);}
       }}>{confirmCancel===selectedTask.id?t.confirmCancel:t.cancelTask}</button>}
    </div>
    <p className={styles.disclaimer}>{t.noLive}</p>
   </section>:
   tab==='home'? <section className={styles.home}>
     <div className={styles.hero}><p>✦ HOLISTIC HOUSE · STRATEGY OS</p><h1>{t.hello}</h1>
       <span>{t.subtitle}</span></div>
     <div className={styles.metrics}>
      {[{n:projects.length,label:t.projects},{n:snapshot?.brief?.total??tasks.length,label:t.tasks},{n:count(v=>v.state==='running'),label:t.working},{n:count(v=>blockedStates.has(v.state)),label:t.blocked}]
       .map((a,i)=><div key={a.label} className={styles.metric}><b>{available?a.n:'—'}</b><small>{a.label}</small></div>)}
     </div>
     <div className={styles.panel}><div className={styles.panelHead}><h2>⭐ {t.today}</h2><button onClick={()=>setTab('tasks')} type="button">›</button></div>
      {(snapshot?.brief?.focus?.length?snapshot.brief.focus:visibleTasks.slice(0,3)).map((v,i)=>taskCard(v,i))}
      {!tasks.length&&<p className={styles.muted}>{t.noTasks}</p>}
     </div>
     <div className={styles.panel}><div className={styles.panelHead}><h2>▤ {t.topProjects}</h2><button onClick={()=>setTab('projects')} type="button">›</button></div>
      {projects.slice(0,3).map(p=><div className={styles.projectLine} key={p.id}><span>▰</span><div><strong>{p.title}</strong><small>{p.summary}</small></div><span className={styles.muted}>{p.state}</span></div>)}
      {!projects.length&&<p className={styles.muted}>{t.noProjects}</p>}
     </div>
     <p className={styles.timestamp}>{t.lastSync}: {date(snapshot?.observedAt)}</p>
    </section>:
   tab==='tasks'?<section className={styles.section}><div className={styles.heading}><h1>{t.tasks}</h1><span>{snapshot?.partial?tasks.length+'+':snapshot?.brief?.total??tasks.length}</span></div>
     <div className={styles.filters}>{[['all',t.all],['active',t.active],['blocked',t.blocked]].map(([value,label])=>
       <button type="button" key={value} onClick={()=>setFilter(value)} className={filter===value?styles.selectedFilter:''}>{label}</button>)}</div>
     <CommandCenterBatch key={filter} lang={lang} tasks={visibleTasks} projects={projects}
      available={available} enabled={enabled} busy={busy}
      onRun={taskIds=>send('run_selected_safe',{taskIds})}
      onOpen={id=>setSelected(id)}/>
    </section>:
   tab==='agents'?<section className={styles.section}><div className={styles.heading}><h1>{t.agents}</h1><span>{registry.length}</span></div>
    <div className={styles.panel}><h2>⏱ {lang==='ru'?'Автоматизации · Cron Jobs':lang==='es'?'Automatizaciones · Cron Jobs':'Automations · Cron Jobs'}</h2><p className={styles.muted}>{lang==='ru'?'Читать и изменять инструкции, создавать задания с навыками и памятью агента':lang==='es'?'Ver, editar y crear tareas programadas con habilidades y memoria':'Read, edit and create scheduled tasks with skills and agent memory'}</p><a className={styles.github} href="/admin/command-center/automations">{lang==='ru'?'Открыть автоматизации':lang==='es'?'Abrir automatizaciones':'Open automations'} ↗</a></div>
    <CommandCenterPrWatch lang={lang} tasks={tasks} watch={snapshot?.prWatch} busy={busy}
      available={available} onSet={(taskId,enabled)=>send('watch_set',{taskId,enabled})}
      onCheck={taskId=>send('watch_check',{taskId})}/>
    {snapshot?.brief?.missingProof>0&&<p className={styles.auditGap} role="status">⚠ {t.missingProofCount}: {snapshot.brief.missingProof}</p>}
    {registry.map(a=><div key={a.id} className={styles.agentCard}><span className={styles.agentIcon}>{a.id.includes('github')?'⌘':a.id.includes('codex')?'◇':'✧'}</span>
      <div><strong>{a.id}</strong><small>{a.role}</small><small>{a.status==='not_connected'?t.noAgents:a.status==='manual_only'?t.manual:enabled?t.activeAgent:t.pausedAgent}</small></div>
      <span className={a.status==='available_when_enabled'&&enabled?styles.greenDot:styles.greyDot}>●</span></div>)}
    <div className={styles.panel}><h2>{t.settings}</h2><p className={styles.muted}>{t.readOnly}</p>
     <div className={styles.commandStack}>
      <button type="button" className={styles.secondary} disabled={!available||busy||!envReady} onClick={()=>send(enabled?'pause_all':'resume_safe')}>
       {enabled?t.pause:t.resume}</button>
      <button type="button" className={styles.primary} disabled={!enabled||busy} onClick={()=>send('run_now')}>{t.runSafe}</button>
     </div>
     <a className={styles.github} href="/admin/automations">{t.viewAutomations} ↗</a></div>
    <div className={styles.panel} aria-label={t.activity}>
     <h2>{t.activity}</h2>
     {runs.slice(0,5).map(run=><div key={run.id} className={styles.event}>
      <span aria-hidden="true">◷</span><div><strong>{run.worker_id} · {run.state}</strong><small>{date(run.started_at)} {run.error_code||''}</small></div>
     </div>)}
     {!runs.length&&<p className={styles.muted}>{t.noRuns}</p>}
     <h2>{t.evidence}</h2>
     {evidences.slice(0,5).map(e=>isTrustedEvidenceUrl(e.source_url)?
      <a className={styles.github} key={e.run_id} href={e.source_url} target="_blank" rel="noopener noreferrer">{e.evidence_kind} · {date(e.created_at)} ↗</a>:null)}
     {!evidences.length&&<p className={styles.muted}>{t.nothingVerified}</p>}
     <h2>{t.scheduler}</h2>
     {slots.slice(0,4).map(slot=><div className={styles.event} key={slot.slot_utc}>
      <span aria-hidden="true">↻</span><div><strong>{slot.last_error==='DAILY_LIMIT'?t.runLimit:slot.state==='no_change'?t.runEmpty:
       slot.state==='succeeded'?t.verifiedMetadata:slot.state==='failed'?t.runFailed:slot.state}</strong><small>{date(slot.slot_utc)} {slot.last_error||''}</small></div>
     </div>)}
     {!slots.length&&<p className={styles.muted}>{t.notKnown}</p>}
     <p className={styles.disclaimer}>{t.noLive}</p>
    </div>
   </section>:
   <section className={styles.section}><div className={styles.heading}><h1>{t.projects}</h1><button type="button" className={styles.smallAdd} onClick={()=>setProjectComposer(true)}>＋</button></div>
     <Link href="/admin/project-management" className={styles.pmShortcut}
       aria-label={t.pm}><span aria-hidden="true" className={styles.pmSymbol}>▤</span>
       <span className={styles.pmCopy}><strong>{t.pm}</strong><small>{t.pmHint}</small></span>
       <span aria-hidden="true" className={styles.pmArrow}>›</span></Link>
     {projects.map(p=><div key={p.id} className={styles.projectCard}><div className={styles.projectSymbol}>▰</div>
       <div><strong>{p.title}</strong><small>{p.summary}</small>
       <span className={styles.projectMeta}>{count(v=>v.project_id===p.id)} {t.tasks} · {p.state}</span></div></div>)}
     {!projects.length&&<div className={styles.empty}>{t.noProjects}<button type="button" onClick={()=>setProjectComposer(true)}>{t.newProject}</button></div>}
   </section>}
  </main>
  <nav className={styles.dock} aria-label="Command Center">
   {tabs.map(([id,label])=><button key={id} type="button" aria-label={label} aria-current={tab===id&&!selectedTask?'page':undefined}
    className={id==='plus'?styles.plus:!selectedTask&&tab===id?styles.activeTab:styles.tab}
    onClick={()=>{if(id==='plus'){setComposer(true);setSelected(null);}else{setTab(id);setSelected(null);}}}>
      <span aria-hidden="true">{id==='plus'?'+':glyph[id]}</span>{id==='plus'?null:<small>{label}</small>}</button>)}
  </nav>
  {(composer||projectComposer)&&<div className={styles.sheetBackdrop} role="presentation">
   <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={composer?t.newTask:t.newProject}>
    <div className={styles.sheetHeader}><h2>{composer?t.newTask:t.newProject}</h2><button type="button" aria-label={t.close} onClick={()=>{setComposer(false);setProjectComposer(false);}}>×</button></div>
    {notice&&<p className={styles.sheetNotice} role="status">{notice}</p>}
    {composer?<form onSubmit={saveTask} className={styles.composer}>
      <label htmlFor="cc-idea">{t.taskText}</label><textarea id="cc-idea" autoFocus minLength={6} maxLength={140} required
       placeholder={t.taskPlaceholder} value={draft} onChange={e=>{
        const next=e.target.value;setDraft(next);
        const suggestion=suggestCommandTask(next);
        if(suggestion){setSource(suggestion.sourceRef);
          if(suggestion.kind&&kind==='code_change')setKind(suggestion.kind);}
       }} rows={3}/>
      <CommandCenterVoiceButton lang={lang} onTranscript={spoken=>setDraft(previous=>safe((previous?previous+' ':'')+spoken,140))}/>
      <label htmlFor="cc-extra">{t.description}</label><textarea id="cc-extra" maxLength={2000} value={details}
        onChange={e=>setDetails(e.target.value)} rows={2}/>
      {importedPrompt&&<details className={styles.importedPrompt} open>
       <summary>{transferText.heading}</summary><p>{transferText.explain}</p>
       <textarea readOnly rows={8} aria-label={transferText.heading} value={importedPrompt}/>
       <button type="button" className={styles.secondary} onClick={async()=>{
        try{if(!navigator.clipboard?.writeText)throw Error('NO_CLIPBOARD');
         await navigator.clipboard.writeText(importedPrompt);setNotice(transferText.copied)}
        catch{setNotice(transferText.failed)}
       }}>{transferText.copy}</button>
      </details>}
      <div className={styles.formSplit}><div><label htmlFor="cc-project">{t.project}</label><select id="cc-project" value={project} onChange={e=>setProject(e.target.value)}>
       <option value="">{t.chooseProject}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
       <div><label htmlFor="cc-priority">{t.priority}</label><select id="cc-priority" value={priority} onChange={e=>setPriority(e.target.value)}>
        <option value="80">{t.high}</option><option value="65">{t.normal}</option><option value="40">P40</option></select></div></div>
      <label htmlFor="cc-kind">{t.type}</label><select id="cc-kind" value={kind} onChange={e=>setKind(e.target.value)}>
       <option value="code_change">{t.kindCode}</option><option value="product_spec">{t.kindSpec}</option>
       <option value="repo_pr_audit">{t.kindPr}</option><option value="repo_issue_audit">{t.kindIssue}</option></select>
      <label htmlFor="cc-source">{t.source}</label><input id="cc-source" type="url" value={source} onChange={e=>setSource(e.target.value)}
        placeholder="https://github.com/andylitvinov-design/books/pull/123" maxLength={180} required={kind==='repo_pr_audit'||kind==='repo_issue_audit'}/>
      {source&&kind.startsWith('repo_')&&<p className={styles.muted}>{t.suggestion}</p>}
      <p className={styles.muted}>{kind==='code_change'?t.noRuntime:kind.startsWith('repo_')?t.readOnly:t.needsSetup}</p>
      <button className={styles.primary} type="submit" disabled={busy||!available||draft.trim().length<6}>{busy?t.saving:t.save}</button>
     </form>:
     <form className={styles.composer} onSubmit={saveProject}>
      <label htmlFor="cc-project-name">{t.projectName}</label><input id="cc-project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} minLength={4} maxLength={120} required/>
      <label htmlFor="cc-project-summary">{t.projectSummary}</label><textarea id="cc-project-summary" minLength={8} maxLength={550} required
       value={projectSummary} onChange={e=>setProjectSummary(e.target.value)} rows={3}/>
      <button type="submit" className={styles.primary} disabled={busy||!available}>{busy?t.saving:t.createProject}</button>
     </form>}
   </section></div>}
 </div>;
}
