'use client';
import {useState} from 'react';
import {ALI_CASES_VERSION,locales,roles,intents,holdout,seed,validateDraft,inspectHoldout,selectReviewExamples} from '@/lib/holistic-support/ali-learning-cases.mjs';
import styles from '../learning.module.css';
import lab from './case-lab.module.css';
const empty=()=>({locale:'ru',role:'secretary',intent:'direct_answer',user:'',bad:'',preferred:'',principle:'',syntheticConfirmed:false});
const labels={user:'User message',bad:'Problematic answer',preferred:'Proposed corrected answer',principle:'General dialogue rule'};
export default function CaseLab(){
 const [form,setForm]=useState(empty);
 const [filter,setFilter]=useState('ru');
 const [notice,setNotice]=useState('');
 const draft=validateDraft(form);
 const set=(key,value)=>{setForm(old=>({...old,[key]:value}));setNotice('');};
 function load(example){setForm({locale:example.locale,role:example.role,intent:example.intent,user:example.user,bad:example.bad,preferred:example.preferred,principle:example.principle,syntheticConfirmed:false});setNotice('');}
 function download(){
  const checked=validateDraft(form);if(!checked)return;
  const blob=new Blob([JSON.stringify(checked,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ali-synthetic-candidate.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice('Файл кандидата создан локально. Он не активирован и не сохранён на сервере.');
 }
 const matches=selectReviewExamples({locale:form.locale,role:form.role,intent:form.intent});
 return <>
 <section className={styles.section}><h2>Learning cases · {ALI_CASES_VERSION}</h2><p className={styles.note}>Только вымышленные примеры. Черновики остаются в памяти браузера до явного экспорта. Не вставляйте реальные сообщения, имена, контакты, медицинские или финансовые данные. Экспорт не является утверждением или изменением модели.</p>
 <label className={lab.label}>Language of examples<select value={filter} onChange={e=>setFilter(e.target.value)}>{locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select></label>
 <div className={lab.cards}>{seed.filter(x=>x.locale===filter).map(x=><article key={x.id} className={lab.case}><strong>{x.family}</strong><p>{x.user}</p><p className={lab.bad}>{x.bad}</p><p>{x.preferred}</p><button type="button" onClick={()=>load(x)}>Edit synthetic example</button></article>)}</div>
 </section>
 <section className={styles.section}><h2>Case editor · draft only</h2><div className={lab.fields}>
 {Object.entries({locale:locales,role:roles,intent:intents}).map(([key,options])=><label key={key} className={lab.label}>{key}<select value={form[key]} onChange={e=>set(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>)}
 {Object.entries(labels).map(([key,label])=><label className={lab.label} key={key}>{label}<textarea rows={3} maxLength={900} value={form[key]} onChange={e=>set(key,e.target.value)}/></label>)}
 <label className={lab.check}><input type="checkbox" checked={form.syntheticConfirmed} onChange={e=>set('syntheticConfirmed',e.target.checked)}/>Подтверждаю, что это полностью вымышленный пример, без сведений реального клиента.</label>
 <div className={lab.actions}><button type="button" disabled={!draft} onClick={download}>Export candidate JSON</button><button type="button" onClick={()=>{setForm(empty());setNotice('');}}>Clear draft</button></div>
 <p role="status">{notice||(!draft?'Заполните четыре разных содержательных поля, подтвердите синтетическое происхождение. Ссылки, контакты и длинные числовые последовательности блокируются.':'Черновик валиден; требуется отдельное редакционное ревью.')}</p>
 </div><p className={styles.note}>Публикация: через проверенный GitHub PR, не из этого экрана. <a href="https://github.com/andylitvinov-design/books/issues/4797" rel="noreferrer">ТЗ и контроль релиза #4797</a>.</p>
 <h3>Example retrieval preview</h3><p>Совпадения по языку, роли и намерению: {matches.length}. Все примеры пока REVIEW_REQUIRED и не используются в production-промптах.</p></section>
 <section className={styles.section}><h2>Training lab · isolated evaluation corpus</h2><p>{holdout.length} сценариев, {holdout.reduce((n,c)=>n+c.userTurns.length,0)} реплик пользователя, 20 тематических семейств. {inspectHoldout(holdout,seed)?'Структура корпуса проверена.':'Корпус невалиден.'} Это тестовые заготовки, не проверенный показатель качества Ali.</p><div className={lab.cards}>{holdout.filter(c=>c.locale===filter).map(c=><details className={lab.case} key={c.id}><summary>{c.family} · {c.role}</summary><ol>{c.userTurns.map((t,i)=><li key={i}>{t}</li>)}</ol><p><strong>Review:</strong> {c.review}</p></details>)}</div><p className={styles.note}>Offline evaluation: node scripts/ali-learning-evaluate.mjs. Не обращается к внешней модели и не выпускает кандидатов автоматически. Результаты живых диалогов и голосовых каналов требуют отдельной проверки.</p></section>
 </>;
}
