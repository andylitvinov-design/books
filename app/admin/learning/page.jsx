import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig} from '@/lib/app/config';
import {closeDatabase} from '@/lib/app/database';
import {readHiLearningOwnerSnapshot} from '@/lib/holistic-support/hi-learning-store';
import styles from './learning.module.css';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Learning Observatory · Holistic Intelligence',
  robots:{index:false,follow:false},referrer:'no-referrer'};

const localDay=value=>String(value??'').slice(0,10);
const text=x=>String(x??'—');
const pct=(a,b)=>b>0?(100*a/b).toFixed(1)+'%':'—';

/** Never query conversations, email, account IDs, user text, or small client cohorts. */
export default async function LearningObservatoryPage(){
  if(!await requireAdminRequest())redirect('/admin/login');
  let snapshot=null,unavailable=false;
  try{snapshot=await readHiLearningOwnerSnapshot(getAppConfig());}
  catch{unavailable=true;}
  finally{await closeDatabase();}
  const rows=snapshot?.metrics??[];
  const byGroup=new Map();
  for(const row of rows){
    const key=[row.channel,row.locale,row.algorithm_version].join('::');
    if(!byGroup.has(key))byGroup.set(key,{channel:row.channel,locale:row.locale,
      version:row.algorithm_version,total:0,helpful:0,unhelpful:0,correction:0});
    const aggregate=byGroup.get(key);
    const count=Number.isSafeInteger(row.event_count)&&row.event_count>=0?row.event_count:0;
    aggregate.total+=count;
    if(Object.hasOwn(aggregate,row.signal))aggregate[row.signal]+=count;
  }
  const grouped=[...byGroup.values()].sort((a,b)=>b.total-a.total);
  const daily=new Map();
  for(const row of rows){
    const day=localDay(row.day);
    daily.set(day,(daily.get(day)||0)+Math.max(0,Number(row.event_count)||0));
  }
  const active=process.env.HH_LEARNING_OBSERVATORY_ENABLED==='true';
  return <main className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>HOLISTIC INTELLIGENCE · OWNER ONLY</p>
      <h1>Learning Observatory</h1>
      <p>Анонимные добровольные сигналы качества, RU / EN / ES. Без переписок,
        имён, клиентских профилей и автоматического обучения.</p>
      <div className={styles.meta}><span>30-day view + current day</span>
        <span>{unavailable?'Database unavailable':active?'Collection enabled':'Collection disabled'}</span>
        <span>Model attribution: mixed / unverified cohorts</span></div>
    </header>
    {unavailable?<p className={styles.warning} role="status">
      Нет подтверждённого доступа к схеме Learning Observatory. Данные неизвестны, а не равны нулю.
    </p>:null}
    <section className={styles.section}>
      <h2>Quality by channel, language and algorithm</h2>
      {!grouped.length?<p className={styles.empty}>Подтверждённых агрегатов пока нет. Отсутствие
        добровольных оценок не измеряет качество модели.</p>:
        <div className={styles.tableScroll}><table><thead><tr>
          <th>Source</th><th>Language</th><th>Algorithm cohort</th>
          <th>Ratings</th><th>Helpful</th><th>Unhelpful</th><th>Corrections</th>
        </tr></thead><tbody>{grouped.map(row=><tr key={row.channel+row.locale+row.version}>
          <td>{text(row.channel)}</td><td>{row.locale.toUpperCase()}</td>
          <td className={styles.version}>{row.version}</td>
          <td>{row.total}</td><td>{pct(row.helpful,row.helpful+row.unhelpful)}</td>
          <td>{row.unhelpful}</td><td>{row.correction}</td>
        </tr>)}</tbody></table></div>}
    </section>
    <section className={styles.section}>
      <h2>Daily voluntary signals</h2>
      {!daily.size?<p className={styles.empty}>Нет данных за выбранный период.</p>:
        <div className={styles.daily}>{[...daily].sort((a,b)=>b[0].localeCompare(a[0])).map(
          ([day,count])=><div key={day} className={styles.day}>
            <span>{day}</span><meter min="0" max={Math.max(...daily.values(),1)} value={count}/>
            <strong>{count}</strong>
          </div>)}</div>}
    </section>
    <section className={styles.section}>
      <h2>Promotion and rollback receipts</h2>
      {!snapshot?.releases?.length?<p className={styles.empty}>Подтверждённых решений о продвижении
        кандидатов пока нет. Исследовательские оценки не считаются LIVE-результатами.</p>:
        <div className={styles.tableScroll}><table><thead><tr>
          <th>Recorded</th><th>Candidate</th><th>Decision</th><th>PR</th><th>Deployment SHA</th>
        </tr></thead><tbody>{snapshot.releases.map((r,i)=><tr key={i}>
          <td>{text(r.created_at).slice(0,10)}</td>
          <td className={styles.version}>{r.candidate_version}</td>
          <td>{r.decision}</td><td>{r.pr_number??'—'}</td>
          <td className={styles.version}>{r.deployment_sha??'—'}</td>
        </tr>)}</tbody></table></div>}
      <p className={styles.note}>Кандидаты проходят независимые тесты и защищённый PR.
        Этот экран не запускает обучение, не изменяет модель и не разрешает выпуск.
        Метрики собраны только после явного нажатия на кнопку оценки.</p>
    </section>
  </main>;
}
