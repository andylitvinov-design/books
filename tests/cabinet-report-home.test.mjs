import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = path => readFile(path, 'utf8')

test('entering the signed-in Cabinet opens Profile by default in both languages', async () => {
  const [route, workspace] = await Promise.all([
    source('app/[locale]/app/[[...path]]/page.jsx'),
    source('components/app/app-workspace.jsx'),
  ])
  assert.match(route, /if \(path\.length === 0\) redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /const page = path\[0\] \|\| 'portrait'/)
  assert.match(workspace, /\['portrait', c\.portrait, '\/portrait'\]/)
  assert.match(workspace, /\['tests', locale === 'ru' \? 'Мои тесты' : 'My tests', '\/tests'\]/)
  const mobile = workspace.slice(workspace.indexOf('<nav className="hh-mobile-app-nav"'))
  assert.ok(mobile.indexOf("href={root + '/portrait'}") < mobile.indexOf("href={root + '/tests'}"))
  assert.match(workspace, /page === 'tests' &&/)
  assert.match(workspace, /page === 'course' &&/)
  assert.match(route, /path\[0\] === 'analysis' && path\.length === 1/)
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
  assert.doesNotMatch(profile, /ProfileServiceCards|data-insights-personal-portrait/)
  const embeddedList = reportList.slice(reportList.indexOf('if (embedded) return'))
  assert.ok(embeddedList.indexOf('<PersonalAnalysisReportList') < embeddedList.indexOf('<SavedSessionsPanel'))
  assert.match(workspace, /data-insights-personal-portrait/)
  assert.match(workspace, /<Portrait data=\{data\} locale=\{locale\} \/>/)
  assert.match(reportList, /\/api\/app\/personal-analysis-reports/)
  assert.match(reportList, /credentials: 'same-origin'/)
  assert.match(profile, /data-profile-report-archive/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage|Math\.random/)
})
