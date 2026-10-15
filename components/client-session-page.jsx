import { AssessmentReading } from '@/components/assessment-reading'
import { DownloadPractitionerReport } from '@/components/app/personal-analysis-panel'
import { PrivateSessionMedia } from './private-session-media'
import './client-session.css'

export function ClientSessionPage({session,locale='en',playBase,backHref=null,pdfBase=null}){
  const ru=locale==='ru'
  const videos=session.items.filter(i=>i.kind==='video')
  const audio=session.items.filter(i=>i.kind==='audio')
  const reports=session.items.filter(i=>['report','document','pdf'].includes(i.kind))
  const texts=session.items.filter(i=>['text','practice','link'].includes(i.kind))
  return <main className="hh-session-page" lang={locale}>
    <header className="hh-session-brand">
      <span>HOLISTIC HOUSE</span>
      <small>{ru?'ЛИЧНАЯ КОНСУЛЬТАЦИЯ':'YOUR PRIVATE SESSION'}</small>
    </header>
    <section className="hh-session-intro">
      <p className="hh-session-kicker">{ru?'МАТЕРИАЛЫ КОНСУЛЬТАЦИИ':'YOUR SESSION MATERIALS'} · {session.date}</p>
      <h1>{session.title}</h1>
      {session.summary?<p>{session.summary}</p>:<p>{ru?'Материалы и рекомендации специалиста собраны на этой странице.':'Your practitioner has gathered your materials and guidance here.'}</p>}
    </section>
    {videos.length>0?<section className="hh-session-section" aria-label={ru?'Личные видео':'Personal videos'}>
      <h2>{ru?'Видео от специалиста':'A personal message'}</h2>
      {videos.map(item=><article className="hh-session-card" key={item.id}><h3>{item.title}</h3>
        {item.body?<p>{item.body}</p>:null}
        <PrivateSessionMedia kind="video" title={item.title} itemId={item.id} playBase={playBase}/>
      </article>)}
    </section>:null}
    {audio.length>0?<section className="hh-session-section">
      <h2>{ru?'Аудиопрактики':'Audio practices'}</h2>
      {audio.map(item=><article className="hh-session-card" key={item.id}><h3>{item.title}</h3>
        {item.body?<p>{item.body}</p>:null}
        <PrivateSessionMedia kind="audio" title={item.title} itemId={item.id} playBase={playBase}/>
      </article>)}
    </section>:null}
    {reports.length>0?<section className="hh-session-section">
      <h2>{ru?'Отчёты и документы':'Your reports and documents'}</h2>
      {reports.map(item=><article className="hh-session-card" key={item.id}><h3>{item.title}</h3>
        {item.body?<p>{item.body}</p>:null}
        {item.kind==='report'&&item.report?<div className="hh-session-report">
          <AssessmentReading record={item.report} locale={locale}/>
          <DownloadPractitionerReport report={item.report} locale={locale}/>
        </div>:null}
        {item.kind==='document'?<a className="hh-session-action" href={pdfBase?pdfBase+'/'+item.id+'?locale='+locale:'#'} download>{ru?'Скачать PDF документа':'Download document PDF'}</a>:null}
        {item.kind==='pdf'?<PrivateSessionMedia kind="pdf" title={item.title} itemId={item.id} playBase={playBase}/>:null}
      </article>)}
    </section>:null}
    {texts.length>0?<section className="hh-session-section">
      <h2>{ru?'Рекомендации и практики':'Recommendations and practices'}</h2>
      {texts.map(item=><article className="hh-session-card" key={item.id}><h3>{item.title}</h3>
        {item.body?<p className="hh-session-paragraph">{item.body}</p>:null}
        {item.kind==='link'?<a href={item.url} target="_blank" rel="noopener noreferrer" className="hh-session-action">{ru?'Открыть материал':'Open resource'} ↗</a>:null}
      </article>)}
    </section>:null}
    <footer className="hh-session-footer">
      {backHref?<a href={backHref}>← {ru?'Все мои сессии':'All my sessions'}</a>
        :<p>{ru?'Для просмотра других консультаций откройте свой личный кабинет по отдельной ссылке.':'To see your complete history, use your separate private Cabinet invitation.'}</p>}
      <p>{ru?'Доступ приватный. Не пересылайте эту ссылку другим людям.':'This is a private invitation. Please do not forward it.'}</p>
    </footer>
  </main>
}
