import Link from 'next/link'
import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getAppConfig} from '@/lib/app/config'
import {closeDatabase} from '@/lib/app/database'
import {readOwnerMyCoachQa} from '@/lib/app/my-coach-qa-store'
import styles from './page.module.css'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'Coach Quality Monitor · Holistic House',
  robots:{index:false,follow:false},referrer:'no-referrer'}

const pct=value=>typeof value==='number'?`${value}%`:'—'
const names={mira:'Мира',max:'Макс',sofia:'София',alex:'Алекс',
  merlin:'Мерлин',harry:'Гарри',lea:'Леа',noah:'Ноа',iris:'Ирис',ray:'Рэй'}

/** Admin-only, no client messages or IDs, and no public-facing coach rating. */
export default async function CoachQualityMonitorPage(){
  if(!await requireAdminRequest())redirect('/admin/login')
  let snapshot=null,unavailable=false
  try{snapshot=await readOwnerMyCoachQa(getAppConfig())}
  catch{unavailable=true}
  finally{await closeDatabase()}
  const enabled=process.env.HH_MY_COACH_QA_ENABLED==='true'
  return <main className={styles.page} data-my-coach-quality-monitor>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>COACH QUALITY · PRIVATE OWNER VIEW</p>
      <h1>Качество коучинга</h1>
      <p>Сессии, доведённые до резюме, добровольные остановки и предварительный
        охват обязательных полей каждой методики. Только по явному согласию клиента.</p>
      <div className={styles.meta}>
        <span>Последние 30 дней</span><span>{enabled?'Сбор разрешён настройкой':'Сбор отключён'}</span>
        <span>{unavailable?'База недоступна':'Доступ: только администратор'}</span>
      </div>
      <Link href="/admin/learning" className={styles.back}>Learning Observatory</Link>
    </header>
    {unavailable?<p role="status" className={styles.warning}>
      Нет проверенных данных из базы. Это неизвестное состояние, а не 0% качества.
    </p>:null}
    {!enabled?<p role="status" className={styles.note}>
      Сбор качественных метрик не активирован: никакие новые сессии автоматически не отслеживаются.
      Клиентское согласие и подключение событий диалога обязательны перед включением.
    </p>:null}
    <section className={styles.section}>
      <h2>Статистика по коучам</h2>
      {!snapshot?.cohorts?.length?<p className={styles.empty}>
        Пока нет подтверждённых записей по коучинговым сессиям. Не следует показывать
        вымышленные проценты или оценивать коуча без достаточного количества случаев.
      </p>:<div className={styles.tableScroll}>
        <table><thead><tr><th>Коуч</th><th>Методика</th><th>Язык</th>
          <th>Версия</th><th>Сессий</th><th>Дошли до резюме</th><th>Остановились</th>
          <th>Сообщили о сбое</th><th>Неизвестный исход</th><th>Данных для разбора</th></tr></thead>
        <tbody>{snapshot.cohorts.map(cohort=><tr key={`${cohort.personaId}/${cohort.locale}/${cohort.algorithmVersion}`}>
          <th scope="row">{names[cohort.personaId]||cohort.personaId}</th>
          <td>{cohort.methodId}</td><td>{cohort.locale.toUpperCase()}</td>
          <td>{cohort.algorithmVersion}</td>
          <td>{cohort.suppressed?'Недостаточно данных':cohort.observed}</td>
          <td>{pct(cohort.summaryOpenedPercent)}</td>
          <td>{pct(cohort.explicitStopPercent)}</td>
          <td>{pct(cohort.reportedTechnicalPercent)}</td>
          <td>{pct(cohort.unresolvedPercent)}</td>
          <td>{cohort.suppressed?'Не раскрывается':`${cohort.coverageObservedCount} из ${cohort.observed}`}</td>
        </tr>)}</tbody></table>
      </div>}
      <p className={styles.note}>Сравнение допускается только при 20 и более подтверждённых
        записях на одну методику/язык. Нажатие «Резюме» — не доказательство результата,
        а отсутствие события завершения — не доказательство ухода клиента.</p>
    </section>
    <section className={styles.section}>
      <h2>Причины пропуска данных</h2>
      {snapshot?.cohorts?.some(x=>!x.suppressed&&x.coverageObservedCount>0)?
        <div className={styles.gaps}>{snapshot.cohorts.filter(x=>!x.suppressed&&x.coverageObservedCount>0)
          .map(cohort=><div className={styles.group} key={`fields-${cohort.personaId}-${cohort.locale}-${cohort.algorithmVersion}`}>
            <h3>{names[cohort.personaId]||cohort.personaId} · {cohort.methodId} · {cohort.locale.toUpperCase()}</h3>
            <ul>{cohort.fields.filter(field=>field.required).map(field=><li key={field.id}>
              <strong>{field.id}</strong><span>Получено: {field.supported} · Частично: {field.partial} · Нет: {field.missing}</span>
            </li>)}</ul>
          </div>)}</div>:
        <p className={styles.empty}>Проверенных обезличенных статусов обязательных полей пока нет.
          После подключения серверного Director здесь появится разбор без цитат и личных деталей.</p>}
    </section>
  </main>
}
