import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getCompactNavigation } from '../lib/site-navigation-model.js'
import { isUnifiedMobileDockPath, unifiedMobileDockActive, unifiedMobileDockHref } from '../lib/unified-mobile-dock.mjs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('old public and new six-dock Profile share one private hub entry', () => {
  for (const locale of ['ru', 'en', 'es']) {
    const fallback = locale === 'es' ? 'en' : locale
    const expected = '/' + fallback + '/app/portrait'
    assert.equal(getCompactNavigation(locale).find(item => item.id === 'profile')?.href, expected)
    assert.equal(unifiedMobileDockHref(locale, 'profile'), expected)
    for (const path of ['personality-profiles','app/portrait','app/portfolio','app/tests','app/settings','app/history','app/results/00000000-0000-4000-8000-000000000001']) {
      assert.equal(isUnifiedMobileDockPath('/' + locale + '/' + path), true, path)
      assert.equal(unifiedMobileDockActive('/' + locale + '/' + path), 'profile', path)
    }
  }
  for (const excluded of ['/ru/app/runs/anything','/ru/app/document-view/private']) assert.equal(isUnifiedMobileDockPath(excluded), false)
  assert.equal(unifiedMobileDockActive('/ru/app/practice'), 'master')
})
test('one four-tab localized hub reuses the existing constructor, profile, results and settings', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const style = read('components/app/profile-hub-tabs.module.css')
  const builder = read('app/[locale]/personality-profiles/page.tsx')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(hub, /data-profile-hub-tabs/)
  assert.match(hub, /data-profile-tab=\{id\}/)
  for (const id of ['create','view','results','settings']) assert.match(hub, new RegExp("id: '"+id+"'"))
  for (const name of ['Создать','Просмотр','Результаты','Настройки','Crear','Resultados','Settings']) assert.ok(hub.includes(name), name)
  assert.match(hub, /\/personality-profiles/)
  assert.match(hub, /\/app\/portrait/)
  assert.match(hub, /\/app\/portfolio/)
  assert.match(hub, /\/app\/settings/)
  assert.match(builder, /<ProfileHubTabs locale=\{locale\} active="create"/)
  assert.match(workspace, /<ProfileHubTabs locale=\{locale\}/)
  assert.match(workspace, /<ProfileResultsArchive locale=\{locale\} results=\{data\.results \|\| \[\]\}/)
  assert.match(style, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(style, /min-height:58px/)
  assert.doesNotMatch(hub, /localStorage|sessionStorage|fetch\(|postMessage\(/i)
})
test('all saved test attempts remain account-scoped, without fictitious summary metrics', () => {
  const hub = read('components/app/profile-hub-tabs.jsx')
  const repo = read('lib/app/repository.js')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(repo, /select \* from app\.assessment_results where account_id=\$1 order by measurement_at,id/)
  assert.match(repo, /results: portraitOnly \? results/)
  assert.match(workspace, /bootstrap\?view=portrait/)
  assert.match(hub, /ordered\.slice\(0, 5\)/)
  assert.match(hub, /data-saved-result-count=\{ordered\.length\}/)
  assert.match(hub, /\/history/)
  assert.match(hub, /\/results\//)
  assert.match(hub, /\/tests\?filter=completed/)
  assert.doesNotMatch(hub, /appFetch\(|insert into|create table|service_role|scorePercent|autoShare/i)
})
