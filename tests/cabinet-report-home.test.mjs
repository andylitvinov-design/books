import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(path, 'utf8')

test('the signed-in Cabinet opens Profile by default and uses one five-tab navigation for every surface', async () => {
  const [route, workspace] = await Promise.all([
    source('app/[locale]/app/[[...path]]/page.jsx'),
    source('components/app/app-workspace.jsx'),
  ])
  assert.match(route, /if \(path\.length === 0\) redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /const page = path\[0\] \|\| 'portrait'/)
  assert.match(route, /path\[0\] === 'analysis' && path\.length === 1/)

  const start = workspace.indexOf('const nav = [')
  const end = workspace.indexOf('const navIsActive', start)
  assert.ok(start >= 0 && end > start, 'one shared private nav model exists')
  const model = workspace.slice(start, end)
  const entries = [...model.matchAll(/\{ id: '([^']+)', label: locale === 'ru' \? '([^']+)' : '([^']+)', href: root \+ '([^']+)', icon: (\w+) \}/g)]
    .map(([, id, ru, en, href, icon]) => ({ id, ru, en, href, icon }))
  assert.deepEqual(entries, [
    { id: 'portrait', ru: 'Профиль', en: 'Profile', href: '/portrait', icon: 'UserRound' },
    { id: 'tests', ru: 'Тесты', en: 'Tests', href: '/tests', icon: 'ClipboardList' },
    { id: 'portfolio', ru: 'Отчёты', en: 'Reports', href: '/portfolio', icon: 'BarChart3' },
    { id: 'course', ru: 'Курсы', en: 'Courses', href: '/course', icon: 'BookOpen' },
    { id: 'practice', ru: 'Практика', en: 'Practice', href: '/practice', icon: 'Users' },
  ])

  const menu = workspace.slice(workspace.indexOf('<details className="hh-account-menu">'), workspace.indexOf('</header>}'))
  const desktop = workspace.slice(workspace.indexOf('<nav className="hh-nav"'), workspace.indexOf('</nav>', workspace.indexOf('<nav className="hh-nav"')))
  const mobile = workspace.slice(workspace.indexOf('<nav className="hh-mobile-app-nav"'), workspace.indexOf('</nav>}', workspace.indexOf('<nav className="hh-mobile-app-nav"')))
  assert.match(menu, /\{nav\.map\(\(\{ id, label, href \}\)/)
  assert.match(desktop, /\{nav\.map\(\(\{ id, label, href \}\)/)
  assert.match(mobile, /\{nav\.map\(\(\{ id, label, href, icon: Icon \}\)/)
  assert.equal((workspace.match(/nav\.map\(/g) || []).length, 3)
  assert.match(menu, /hh-account-more/)
  assert.match(menu, /root \+ '\/settings'/)
  assert.match(menu, /root \+ '\/monitoring'/)
  assert.match(menu, /root \+ '\/history'/)
  assert.match(workspace, /page === 'portfolio' && <PortfolioPage/)
  assert.match(workspace, /page === 'practice' && <PracticeWorkspace/)
  assert.match(workspace, /page === 'tests' &&/)
  assert.match(workspace, /page === 'course' &&/)
})

test('private report list is first, saved sessions follow and psychological measures live in Insights', async () => {
  const [profile, reportList, workspace] = await Promise.all([
    source('components/app/profile-domains.jsx'),
    source('components/app/personal-analysis-panel.jsx'),
    source('components/app/app-workspace.jsx'),
  ])
  const hero = profile.indexOf('<header className="hh-domain-hero">')
  const reportArchive = profile.indexOf('id="personal-reports"')
  const categoryDisclosure = profile.indexOf('className="hh-domain-more"')
  assert.ok(hero >= 0 && reportArchive > hero && categoryDisclosure > reportArchive)
  assert.doesNotMatch(profile, /ProfileServiceCards|data-insights-detailed-scales/)
  const embeddedList = reportList.slice(reportList.indexOf('if (embedded) return'))
  assert.ok(embeddedList.indexOf('<PersonalAnalysisReportList') < embeddedList.indexOf('<SavedSessionsPanel'))
  assert.match(workspace, /data-insights-detailed-scales/)
  assert.match(workspace, /<Portrait data=\{data\} locale=\{locale\} \/>/)
  assert.match(reportList, /\/api\/app\/personal-analysis-reports/)
  assert.match(reportList, /credentials: 'same-origin'/)
  assert.match(profile, /data-profile-report-archive/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage|Math\.random/)
})
