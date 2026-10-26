import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {cabinetFixture,reply,deferred,nodes,text} from './helpers/cabinet-source-fixture.mjs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('signed-in Profile always shows saved reports and one local free-consultation landing CTA', () => {
  const profile = source('components/app/profile-domains.jsx')
  const workspace = source('components/app/app-workspace.jsx')
  const archive = profile.indexOf('id="personal-reports"')
  const reportRenderer = profile.indexOf('{reportsContent}', archive)
  const offer = profile.indexOf('data-profile-free-consultation')
  const archiveEnd = profile.indexOf('</section>}', archive)
  const categories = profile.indexOf('className="hh-domain-more"', archive)

  assert.ok(archive >= 0 && reportRenderer > archive && offer > reportRenderer &&
    offer < archiveEnd && categories > archiveEnd)
  assert.match(profile, /data-report-archive-always-open/)
  assert.match(profile, /latestReceivedReport\(savedReports\)/)
  assert.match(profile, /data-profile-mode=\{mode\}/)
  assert.match(profile, /className="hh-domain-appointment-button"/)
  assert.match(profile, /\{t\.consultation\}/)
  assert.match(profile, /consultation: 'Book free consultation'/)
  assert.match(profile, /consultation: 'Заказать бесплатную консультацию'/)
  assert.match(profile, /data-consultation-kind="free-options"/)
  assert.ok(profile.includes("href={'/' + locale + '/services/free-consultation'}"))
  assert.doesNotMatch(profile, /setArchiveOpen|hh-account-report-toggle|hidden=\{!archiveOpen\}/)
  assert.doesNotMatch(profile, /freeIntroConsultationHref/)
  assert.ok(profile.includes("href={'/' + locale + '/services/free-situation-review#request-free-review'}"))
  assert.ok(profile.includes("href={'/' + locale + '/services'}"))
  // The actual guarded parent now composes saved and express reports (PR #2041).
  // Verify its output/action composition instead of requiring one JSX spelling.
  const f=cabinetFixture({data:{account:{id:'account-a',onboardingState:'active'},savedReports:[],savedSessions:[{id:'synthetic-session'}]},transport:async(path,options)=>{
    assert.equal(path,'/api/app/express-reports');assert.equal(options.headers['x-hh-account-id'],'account-a')
    return reply({items:[]})
  }})
  const archiveNode=f.find(n=>n.props.id==='personal-reports')
  const visible=nodes(archiveNode)
  assert.equal(visible.filter(n=>Object.hasOwn(n.props,'data-personal-reports')).length,1)
  const ctas=visible.filter(n=>n.type==='a'&&n.props['data-consultation-kind']==='free-options')
  assert.equal(ctas.length,1);assert.equal(ctas[0].props.href,'/en/services/free-consultation')
  assert.equal(text(ctas[0]),'Book free consultation')
  assert.equal(visible.some(n=>n.props.hidden||n.props.style?.display==='none'),false)
  assert.equal(f.find(n=>n.type==='saved-sessions-leaf').props.items[0].id,'synthetic-session')
  assert.ok(visible.some(n=>Object.hasOwn(n.props,'data-client-express-reports')))
  f.unmount()
  assert.match(workspace, /reportTimeline\(data\.savedReports\)/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage|Math\.random\(/)
})

test('mobile Profile uses near edge-to-edge cards and a compact first viewport', () => {
  const profile = source('components/app/profile-domains.jsx')
  const css = source('components/app/profile-refresh.css')
  const banner = source('components/sitewide-antistress-banner.module.css')
  assert.match(profile, /import '\.\/profile-refresh\.css'/)
  assert.match(profile, /className="hh-domain-topic-pills"/)
  assert.match(profile, /role="tablist"/)
  assert.match(profile, /aria-selected=\{active === key\}/)
  assert.match(profile, /<details className="hh-domain-more"/)
  assert.match(css, /\.hh-profile-domains\[data-profile-mode="account"\]/)
  assert.match(css, /\.hh-app:has\(\.hh-profile-domains\[data-profile-mode="account"\]\)/)
  assert.match(css, /min-height:\s*0;/)
  assert.match(css, /@media\(max-width:560px\)/)
  assert.match(css, /max-height:720px/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /:focus-visible/)
  assert.doesNotMatch(css, /^\s*body\s*\{/m, 'only private Profile can be affected')
  // Actual shared sitewide ribbon is already navy + burgundy; do not duplicate or recolour it.
  assert.match(banner, /\.ribbon\{[^\n]*background:#102849/)
  assert.match(banner, /\.cta\{[^\n]*background:#922f51/)
})

test('compact copy is exclusive to embedded authenticated reports; original private readers remain', () => {
  const panel = source('components/app/personal-analysis-panel.jsx')
  assert.match(panel, /empty: 'No reports yet'/)
  assert.match(panel, /empty: 'Отчётов пока нет'/)
  assert.match(panel, /emptyCompact: 'Open a report link from Andrey to save it here\.'/)
  assert.match(panel, /emptyCompact: 'Откройте ссылку на отчёт Андрея и сохраните его здесь\.'/)
  assert.match(panel, /reportsIntroCompact: 'Reports from Andrey\.'/)
  assert.match(panel, /reportsIntroCompact: 'Отчёты от Андрея\.'/)
  assert.match(panel, /compact \? t\.reportsIntroCompact : t\.reportsIntro/)
  assert.match(panel, /compact \? t\.emptyCompact : t\.emptyGoogle/)
  assert.match(panel, /<PersonalAnalysisReportList reports=\{\[\.\.\.visibleReports, \.\.\.legacyReports\]\} locale=\{locale\} selector=\{selector\} compact \/>/)
  assert.match(panel, /<SavedSessionsPanel items=\{savedSessions\}/)
  assert.match(panel, /credentials: 'same-origin'/)
  assert.match(panel, /<DownloadPractitionerReport reportId=\{item\.id\}/)
})


test('actual Profile preserves report projection, private readers, and published-only express reports',async()=>{
  for(const locale of ['en','ru']) {
    const personal=deferred()
    const data={account:{id:'account-a',onboardingState:'active'},savedReports:[
      {id:'saved',occurredOn:'2026-10-23',savedAt:'2026-10-25',title:'RAW_TITLE_NOT_IN_TIMELINE',privateText:'NEVER_PROJECT_RAW_PAYLOAD'},
      {id:'withdrawn',occurredOn:'2026-10-24',available:false},
    ],savedSessions:[]}
    const f=cabinetFixture({locale,data,transport:async(path,options)=>{
      assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store')
      if(path==='/api/app/personal-analysis-reports')return personal.promise
      assert.equal(path,'/api/app/express-reports');assert.equal(options.headers['x-hh-account-id'],'account-a');assert.equal(options.method,'GET')
      return reply({items:[
        {id:'published',status:'published',issuedOn:'2026-10-25',content:{title:'Published synthetic report',situation:'Visible synthetic guidance'}},
        {id:'draft',status:'draft',content:{title:'HIDDEN_DRAFT_CONTENT'}},
        {id:'revoked',status:'revoked',content:{title:'HIDDEN_REVOKED_CONTENT'}},
      ]})
    }})
    const list=f.find(n=>n.props.className==='hh-analysis-reports')
    assert.doesNotMatch(text(list),/RAW_TITLE_NOT_IN_TIMELINE|NEVER_PROJECT_RAW_PAYLOAD/)
    assert.equal(nodes(list).filter(n=>n.type==='a'&&n.props.href===`/${locale}/app/reports/saved`).length,1)
    assert.equal(nodes(list).filter(n=>n.type==='a'&&n.props.href===`/${locale}/app/reports/withdrawn`).length,0)
    assert.equal(nodes(list).filter(n=>n.type==='button'&&typeof n.props.onClick==='function').length,1,'Available original keeps its real PDF action; revoked original does not')
    personal.resolve(reply({reports:[{id:'saved',title:'Verified saved report',occurredOn:'2026-10-23'}]}));await f.settle()
    assert.match(f.text(),/Verified saved report/);assert.match(f.text(),/Visible synthetic guidance/)
    assert.doesNotMatch(f.text(),/HIDDEN_DRAFT_CONTENT|HIDDEN_REVOKED_CONTENT/)
    assert.equal(f.nodes().filter(n=>n.props['data-express-report-id']==='published').length,1)
    const cta=f.find(n=>n.type==='a'&&n.props['data-consultation-kind']==='free-options')
    assert.equal(cta.props.href,`/${locale}/services/free-consultation`)
    assert.equal(text(cta),locale==='ru'?'Заказать бесплатную консультацию':'Book free consultation')
    f.unmount()
  }
})

test('actual workspace key discards old private reports on account change and ignores late responses',async()=>{
  const pendingB=deferred(),pendingOld=deferred()
  const data={account:{id:'account-a',onboardingState:'active'},savedReports:[],savedSessions:[]}
  const published=title=>({items:[{id:title,status:'published',issuedOn:'2026-10-25',content:{title}}]})
  const f=cabinetFixture({data,transport:(_,options)=>options.headers['x-hh-account-id']==='account-a'?Promise.resolve(reply(published('ACCOUNT_A_REPORT'))):pendingB.promise})
  await f.settle();assert.match(f.text(),/ACCOUNT_A_REPORT/)
  f.update({data:{...data,account:{...data.account,id:'account-b'}}})
  assert.doesNotMatch(f.text(),/ACCOUNT_A_REPORT/,'Actual parent account key must reset the report child')
  pendingB.resolve(reply(published('ACCOUNT_B_REPORT')));await f.settle()
  assert.match(f.text(),/ACCOUNT_B_REPORT/);assert.doesNotMatch(f.text(),/ACCOUNT_A_REPORT/)
  f.unmount()
  const g=cabinetFixture({data,transport:(_,options)=>options.headers['x-hh-account-id']==='account-a'?pendingOld.promise:Promise.resolve(reply({items:[]}))})
  g.update({data:{...data,account:{...data.account,id:'account-b'}}});await g.settle()
  pendingOld.resolve(reply(published('LATE_ACCOUNT_A_REPORT')));await g.settle()
  assert.doesNotMatch(g.text(),/LATE_ACCOUNT_A_REPORT/)
  assert.equal(g.requests.at(-1).options.headers['x-hh-account-id'],'account-b')
  g.unmount()
  for(const [state,account] of [['signed-out',null],['ready',null],['ready',{id:'new',onboardingState:'pending'}]]) {
    const gate=cabinetFixture({state,data:account?{account}:null})
    assert.equal(gate.requests.length,0)
    assert.equal(gate.nodes().some(n=>Object.hasOwn(n.props,'data-personal-reports')||Object.hasOwn(n.props,'data-client-express-reports')),false)
    gate.unmount()
  }
})
