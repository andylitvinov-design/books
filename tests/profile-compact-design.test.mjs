import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sourceFixture, blocked, icons, link, element, textContent, accountNavigation } from './helpers/current-navigation-fixture.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Profile leads with authorized personal reports; category details are secondary', () => {
  const profile = read('components/app/profile-domains.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  const hero = profile.indexOf('<header className="hh-domain-hero">')
  const archive = profile.indexOf('id="personal-reports"')
  const browse = profile.indexOf('className="hh-domain-more"')
  const overview = profile.indexOf('{overviewContent}')
  const tabs = profile.indexOf('<div className="hh-domain-tabs"')
  const panel = profile.indexOf('<div role="tabpanel"')
  const support = profile.indexOf('<details className="hh-domain-support">')
  const discover = profile.indexOf('<Link className="hh-domain-services-link"')
  assert.ok(hero >= 0 && archive > hero && browse > archive && overview > browse)
  const earlyActions = profile.indexOf('{!external && footerActions}')
  const legacyActions = profile.indexOf('{external && footerActions}')
  assert.ok(tabs > overview && panel > tabs && support > panel)
  assert.ok(discover > -1 && earlyActions === -1 && legacyActions > support)
  // Merged #1251 keeps the account archive primary; old topic/footer content is legacy-only.
  assert.match(profile, /\{external && <header className="hh-domain-hero">/)
  assert.match(profile, /\{external && <details className="hh-domain-more"/)
  assert.match(profile, /data-report-archive-always-open/)
  assert.match(profile, /\{reportsContent\}/)
  assert.match(profile, /data-profile-report-archive/)
  assert.match(profile, /open=\{expanded\}/)
  assert.match(workspace, /reportsContent=\{<PersonalAnalysisPanel key=\{data.account.id\}/)
  assert.match(workspace, /embedded \/>\} \/>/)
  assert.doesNotMatch(profile, /ProfileServiceCards|<FreeInsightsPaths/)
  assert.match(workspace, /data-insights-detailed-scales/)
  assert.doesNotMatch(profile, /Math\.random\(|mockProfileScore|syntheticScores/)
})

test('Four existing privacy-safe areas stay accessible while optional services are subordinate', () => {
  const profile = read('components/app/profile-domains.jsx')
  const css = read('components/app/profile-domains.css')
  assert.match(profile, /const DOMAINS = PROFILE_AREAS/)
  for (const phrase of ['role="tablist"','role="tab"','role="tabpanel"','aria-selected={active === key}',"event.key === 'ArrowRight'","event.key === 'ArrowLeft'","event.key === 'Home'","event.key === 'End'"]) {
    assert.ok(profile.includes(phrase),phrase)
  }
  assert.match(profile, /<details className="hh-domain-support">/)
  assert.match(profile, /<Link className="hh-domain-services-link"/)
  assert.match(profile, /href=\{'\/' \+ locale \+ '\/services'\}/)
  assert.match(profile, /<ProfileServiceOffer area=\{active\} locale=\{locale\} \/>/)
  assert.doesNotMatch(profile, /<FreeInsightsPaths /)
  assert.match(profile, /recommendationItemType\(item, document\.recommendationType\)/)
  assert.match(css, /--domain-accent:#297667/)
  assert.match(css, /\.hh-domain-tabs \{[\s\S]*?overflow-x:auto/)
  assert.match(css, /@media\(max-width:420px\)/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /\.hh-domain-report-archive/)
})

test('Measured psychological portrait is accessible in Insights, separate from Profile reports', () => {
  const overview = read('components/app/profile-assessment-overview.jsx')
  const summary = read('components/app/personal-portrait-summary.jsx')
  const style = read('components/app/profile-assessment-overview.module.css')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(workspace, /data-insights-detailed-scales/) 
  assert.match(workspace, /<details className="hh-insights-portrait-details" data-insights-detailed-scales>/)
  assert.match(workspace, /<details className="hh-domain-psych-details" data-profile-deep-dive>/)
  assert.match(workspace, /<ProfileAssessmentOverview data=\{data\} locale=\{locale\} onBeginTest=\{beginSelectedTest\} showPortrait=\{false\}>/)
  assert.match(overview, /showPortrait=true/)
  assert.match(overview, /\{showPortrait && <section/)
  assert.match(overview, /data-measured-scale/)
  assert.match(overview, /data-unfinished-test/)
  assert.match(overview, /aria-valuenow=\{row.value\}/)
  assert.match(overview, /data-profile-actions/)
  assert.match(overview, /tests\?filter=remaining/)
  assert.match(summary, /buildPersonalPortraitSummary\(data, locale\)/)
  assert.match(summary, /data-profile-head/)
  assert.match(summary, /data-portrait-theme=\{id\}/)
  assert.match(style, /--teal:#297667/)
  assert.match(style, /\.profile \.remainingAction \{[\s\S]*?background:var\(--teal\)/)
  assert.match(style, /@media\(max-width:560px\)/)
})

test('five private Cabinet tabs share menus while mobile adds a sixth public Home shortcut', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const css = read('app/[locale]/app/[[...path]]/workspace.css')
  const navStart = workspace.indexOf('const nav = [')
  const navEnd = workspace.indexOf('  const navIsActive =', navStart)
  assert.ok(navStart >= 0 && navEnd > navStart, 'one shared account nav model')
  const navModel = workspace.slice(navStart, navEnd)
  for (const [id, title, route] of [
    ['portrait', 'Profile', '/portrait'],
    ['tests', 'Tests', '/tests'],
    ['portfolio', 'Reports', '/portfolio'],
    ['course', 'Courses', '/course?view=courses'],
    ['practice', 'Practice', '/practice'],
  ]) {
    assert.match(navModel, new RegExp("id: '" + id + "'"))
    assert.ok(navModel.includes("label: locale === 'ru'"), 'EN and RU navigation labels')
    assert.ok(navModel.includes("'" + title + "'"), title)
    assert.ok(navModel.includes("href: root + '" + route + "'"), route)
  }
  assert.equal((navModel.match(/\{ id: '(portrait|tests|portfolio|course|practice)'/g)||[]).length,5)
  assert.doesNotMatch(navModel, /\{ id: 'analysis'/)
  const mobileStart=workspace.indexOf('<nav className="hh-mobile-app-nav"')
  const mobile=workspace.slice(mobileStart,workspace.indexOf('</nav>}',mobileStart))
  assert.ok(mobileStart>0 && mobile.length>100)
  assert.match(mobile,/nav\.map\(\(\{ id, label, href, icon: Icon \}\) =>/)
  assert.match(mobile,/href=\{href\} prefetch=\{false\}/)
  assert.match(mobile,/aria-current=\{navIsActive\(id\) \? 'page'/)
  assert.match(mobile,/className="hh-mobile-app-nav-home"/)
  assert.match(mobile,/href=\{locale === 'ru' \? '\/ru' : '\/'\}/)
  assert.match(css,/\.hh-app \.hh-mobile-app-nav\s*\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important;/)
  // Preserve the verifier branch's stricter exact bilingual ordering and Home contract.
  const entries=[...navModel.matchAll(/\{ id: '([^']+)', label: locale === 'ru' \? '([^']+)' : '([^']+)', href: root \+ '([^']+)'/g)].map(([,id,ru,en,path])=>({id,ru,en,path}))
  assert.deepEqual(entries,[
    {id:'portrait',ru:'Профиль',en:'Profile',path:'/portrait'},
    {id:'tests',ru:'Тесты',en:'Tests',path:'/tests'},
    {id:'portfolio',ru:'Отчёты',en:'Reports',path:'/portfolio'},
    {id:'course',ru:'Курсы',en:'Courses',path:'/course?view=courses'},
    {id:'practice',ru:'Практика',en:'Practice',path:'/practice'},
  ])
  // #1082: every shared menu opens the course index, never auto-resumes a lesson.
  for (const locale of ['en', 'ru']) {
    const actual = accountNavigation(workspace, { locale, root: '/' + locale + '/app',
      ...icons('UserRound ClipboardList BarChart3 BookOpen Users') })
    assert.deepEqual(actual.map(({ id, label, href }) => ({ id, label, href })), entries.map(entry => ({
      id: entry.id, label: entry[locale], href: '/' + locale + '/app' + entry.path,
    })))
  }
  assert.equal((workspace.match(/nav\.map\(\(\{ id, label, href/g) || []).length, 3, 'Desktop, account dropdown and mobile share nav')
  assert.doesNotMatch(mobile, />Analysis</)
  assert.equal(mobile.split('className="hh-mobile-app-nav-home"').length - 1, 1)
  assert.ok(mobile.includes("aria-label={locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage'}"))
  assert.ok(mobile.includes("<span>{locale === 'ru' ? 'Главная' : 'Home'}</span>"))
  assert.ok(mobile.indexOf('className="hh-mobile-app-nav-home"') > mobile.indexOf('nav.map'))

})



test('Real Profile binding preserves account archive actions and legacy-only details without private reads', () => {
  const fixture = sourceFixture({ window: { location: { hash: '' } } })
  const reportSummary = fixture.load(read('lib/profile/report-summary.js'), 'report-summary.js', {}, { exports: ['availableSavedReports', 'latestReceivedReport'] })
  const { ProfileDomains } = fixture.load(read('components/app/profile-domains.jsx'), 'profile.jsx', {
    'next/link': link,
    'next/dynamic': { default: (_loader, options) => { assert.equal(options.ssr, false); assert.match(String(_loader), /require\(['"]\.\/development-program['"]\)/); return 'development-program-boundary' } },
    'lucide-react': icons('ArrowRight Brain CalendarDays ChevronDown FileText Flower2 HeartHandshake Leaf LockKeyhole MessageCircle Sparkles'),
    '@/lib/documents/recommendation': { recommendationItemType: blocked },
    '@/lib/profile/profile-service-offers': { PROFILE_AREAS: ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'], profileServiceOffer: blocked },
    '@/lib/profile/report-summary': reportSummary, './profile-domains.css': {}, './profile-refresh.css': {},
  }, { exports: ['ProfileDomains'] })
  for (const locale of ['en', 'ru']) {
    const reportsContent = element('fixture-report-content', { children: 'Fictional authorized report contents' })
    const savedReports = [
      { id: 'fixture-readable', title: 'Fictional readable report', available: true, savedAt: '2026-10-10T12:00:00Z' },
      { id: 'fixture-revoked', title: 'Fictional revoked report', available: false, savedAt: '2026-10-11T12:00:00Z' },
    ]
    const account = fixture.mount(ProfileDomains, { locale, accountId: 'fixture-account', reportsContent, savedReports })
    const archive = account.one(node => Object.hasOwn(node.props, 'data-report-archive-always-open'))
    assert.equal(archive.type, 'div', 'Archive is not a collapsed disclosure')
    assert.equal(account.nodes().filter(node => node.type === 'fixture-report-content').length, 1)
    assert.equal(account.nodes().filter(node => ['hh-domain-hero', 'hh-domain-more', 'hh-domain-footer-actions'].includes(node.props.className)).length, 0)
    assert.equal(account.one(node => node.props.className === 'hh-account-report-open').props.href, '/' + locale + '/app/reports/fixture-readable')
    assert.ok(!account.nodes().some(node => node.props.href?.includes('fixture-revoked')))
    assert.equal(account.one(node => Object.hasOwn(node.props, 'data-consultation-kind')).props.href, '/' + locale + '/services/free-consultation')
    assert.equal(account.one(node => Object.hasOwn(node.props, 'data-health-labs-link')).props.href, '/' + locale + '/app/labs')
    const development = account.one(node => node.type === 'development-program-boundary')
    assert.equal(development.props.accountId, 'fixture-account'); assert.equal(development.props.locale, locale)
    const legacy = fixture.mount(ProfileDomains, { locale, mode: 'legacy', selector: 'fixture-private-selector', reportsContent })
    legacy.one(node => node.props.className === 'hh-domain-hero')
    assert.equal(legacy.one(node => node.props.className === 'hh-domain-more').props.open, true)
    assert.equal(legacy.nodes().filter(node => node.type === 'fixture-report-content').length, 1)
    assert.equal(legacy.nodes().filter(node => node.type === 'development-program-boundary' || Object.hasOwn(node.props, 'data-health-labs-link')).length, 0)
    const footer = legacy.one(node => node.props.className === 'hh-domain-footer-actions')
    assert.match(textContent(footer), locale === 'ru' ? /Посмотреть услуги/ : /Explore services/)
    for (const area of ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy']) {
      legacy.click(node => node.props.role === 'tab' && node.props.id === 'hh-domain-tab-' + area)
      assert.equal(legacy.one(node => node.props.role === 'tab' && node.props['aria-selected']).props.id, 'hh-domain-tab-' + area)
      legacy.one(node => node.props['data-domain'] === area)
    }
  }
  fixture.assertNoExternalOperations()
})
