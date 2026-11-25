'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import styles from './command-center.module.css';
type Lang='ru'|'en'|'es';
type Project={id:string;title:string};
const copy={
  ru:{pause:'Приостановить всех',resume:'Включить безопасные задачи',run:'Проверить задачу сейчас',
    goal:'Новая цель',project:'Новый проект',task:'Новая задача',title:'Название',summary:'Описание результата',
    source:'Ссылка GitHub PR или Issue',kind:'Тип',priority:'Приоритет 0–100',projectLabel:'Проект',
    create:'Создать',processing:'Выполняется…',saved:'Действие записано. Данные обновляются.',
    failed:'Изменение не подтверждено. Проверьте статус миграции, разрешения и журнал.',
    noProject:'Без проекта',disabled:'Сначала примените проверенную миграцию.'},
  en:{pause:'Pause all',resume:'Enable safe tasks',run:'Run safe audit now',goal:'New objective',
    project:'New project',task:'New task',title:'Title',summary:'Expected outcome',
    source:'GitHub PR or Issue URL',kind:'Kind',priority:'Priority 0–100',projectLabel:'Project',
    create:'Create',processing:'Processing…',saved:'Change recorded. Updating data.',
    failed:'Action unconfirmed. Check migration, permission and audit log.',
    noProject:'No project',disabled:'Apply the reviewed migration first.'},
  es:{pause:'Pausar todo',resume:'Activar tareas seguras',run:'Verificar ahora',goal:'Nuevo objetivo',
    project:'Nuevo proyecto',task:'Nueva tarea',title:'Título',summary:'Resultado esperado',
    source:'Enlace GitHub PR o Issue',kind:'Tipo',priority:'Prioridad 0–100',projectLabel:'Proyecto',
    create:'Crear',processing:'Procesando…',saved:'Cambio registrado. Actualizando datos.',
    failed:'Acción no confirmada. Compruebe migración, acceso y registro.',
    noProject:'Sin proyecto',disabled:'Aplique primero la migración revisada.'}
} as const;
export default function CommandCenterActions({lang,enabled,envReady,available,projects}:
  {lang:Lang;enabled:boolean;envReady:boolean;available:boolean;projects:Project[]}){
  const t=copy[lang];const router=useRouter();const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState('');
  async function send(action:string,body:Record<string,unknown>={}){
    if(busy)return;
    setBusy(true);setFeedback('');
    try{
      const response=await fetch('/api/admin/command-center',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',
        body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok||!result||result.error||['unconfirmed','stale_unconfirmed','transition_denied'].includes(result.status)){
        setFeedback(`${t.failed} ${result?.error||result?.status||''}`);return;
      }
      setFeedback(`${t.saved} ${result.status||''}`);router.refresh();
    }catch{setFeedback(t.failed);}
    finally{setBusy(false);}
  }
  const disabled=busy||!available;
  return <section className={styles.actions} aria-label="Command Center controls">
    <div className={styles.controls}>
      <button type="button" disabled={disabled||!enabled} className={styles.secondary}
        onClick={()=>send('pause_all')}>{busy?t.processing:t.pause}</button>
      <button type="button" disabled={disabled||enabled||!envReady}
        onClick={()=>send('resume_safe')}>{busy?t.processing:t.resume}</button>
      <button type="button" disabled={disabled||!enabled} className={styles.secondary}
        onClick={()=>send('run_now')}>{t.run}</button>
    </div>
    <div className={styles.forms}>
      <details className={styles.form}>
        <summary>{t.goal}</summary>
        <form className={styles.form} onSubmit={e=>{e.preventDefault();const f=e.currentTarget;
          send('create_objective',{title:(f.elements.namedItem('title') as HTMLInputElement).value,
            summary:(f.elements.namedItem('summary') as HTMLTextAreaElement).value});}}>
          <label htmlFor="cc-objective-title">{t.title}</label>
          <input id="cc-objective-title" name="title" minLength={5} maxLength={120} required/>
          <label htmlFor="cc-objective-summary">{t.summary}</label>
          <textarea id="cc-objective-summary" name="summary" minLength={8} maxLength={550} required/>
          <button type="submit" disabled={disabled}>{t.create}</button>
        </form>
      </details>
      <details className={styles.form}>
        <summary>{t.project}</summary>
        <form className={styles.form} onSubmit={e=>{e.preventDefault();const f=e.currentTarget;
          send('create_project',{title:(f.elements.namedItem('title') as HTMLInputElement).value,
            summary:(f.elements.namedItem('summary') as HTMLTextAreaElement).value});}}>
          <label htmlFor="cc-project-title">{t.title}</label>
          <input id="cc-project-title" name="title" minLength={4} maxLength={120} required/>
          <label htmlFor="cc-project-summary">{t.summary}</label>
          <textarea id="cc-project-summary" name="summary" minLength={8} maxLength={550} required/>
          <button type="submit" disabled={disabled}>{t.create}</button>
        </form>
      </details>
      <details className={styles.form}>
        <summary>{t.task}</summary>
        <form className={styles.form} onSubmit={e=>{e.preventDefault();const f=e.currentTarget;
          const v=(name:string)=>(f.elements.namedItem(name) as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement).value;
          send('create_task',{title:v('title'),description:v('description'),kind:v('kind'),
            priority:Number(v('priority')),projectId:v('projectId')||null,sourceRef:v('sourceRef')||null});}}>
          <label htmlFor="cc-task-title">{t.title}</label>
          <input id="cc-task-title" name="title" required minLength={6} maxLength={140}/>
          <label htmlFor="cc-task-description">{t.summary}</label>
          <textarea id="cc-task-description" name="description" required minLength={10} maxLength={800}/>
          <label htmlFor="cc-task-kind">{t.kind}</label>
          <select id="cc-task-kind" name="kind" defaultValue="repo_pr_audit">
            <option value="repo_pr_audit">GitHub PR · read-only</option>
            <option value="repo_issue_audit">GitHub Issue · read-only</option>
            <option value="product_spec">Product specification · manual</option>
          </select>
          <label htmlFor="cc-task-project">{t.projectLabel}</label>
          <select id="cc-task-project" name="projectId" defaultValue="">
            <option value="">{t.noProject}</option>
            {projects.map(p=><option value={p.id} key={p.id}>{p.title}</option>)}
          </select>
          <label htmlFor="cc-task-source">{t.source}</label>
          <input id="cc-task-source" name="sourceRef" type="url" maxLength={180}
            placeholder="https://github.com/andylitvinov-design/books/pull/123"/>
          <label htmlFor="cc-task-priority">{t.priority}</label>
          <input id="cc-task-priority" name="priority" type="number" min="0" max="100" defaultValue="50"/>
          <button type="submit" disabled={disabled}>{t.create}</button>
        </form>
      </details>
    </div>
    <p className={styles.feedback} role="status" aria-live="polite">{feedback||(!available?t.disabled:'')}</p>
  </section>;
}
