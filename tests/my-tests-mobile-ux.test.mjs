import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('first mobile screen: top picker, then concise metrics, quick actions and selected rows',()=>{
 const ui=read('components/app/my-tests-dashboard.jsx')
 const battery=read('components/app/account-test-battery.jsx')
 const css=read('components/app/my-tests-dashboard.module.css')
 const title=ui.indexOf('className={styles.title}')
 const stats=ui.indexOf('className={styles.stats}')
 const filters=ui.indexOf('id="my-tests-picker-toggle"')
 const picker=ui.indexOf('{explorer}')
 const list=ui.indexOf('{hasList && children}')
 const report=ui.indexOf('className={styles.quickActions}')
 assert.ok(filters>0&&picker>filters&&title>picker&&stats>title&&report>stats&&list>report)
 assert.match(battery,/data-inline-selected-tests/)
 assert.match(battery,/data-remove-selected-test=\{row\.key\}/)
 assert.match(ui,/className=\{styles\.filterButton\}/)
 assert.match(css,/@media\s*\(max-width:760px\)/)
 assert.match(css,/\.stats \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.doesNotMatch(ui,/styles\.pendingSelection|Another selection is ready/)
})

test('filter review is non-blocking and only replaces a plan on user permission',()=>{
 const battery=read('components/app/account-test-battery.jsx')
 assert.match(battery,/readTestSelectionIntent/)
 assert.match(battery,/function keepSavedSet\(\)/)
 assert.match(battery,/function applyNewSelection\(\)/)
 assert.match(battery,/void create\(conflict\.keys, true, conflict\.preferences\)/)
 assert.match(battery,/\{conflict && <aside className=\{styles\.reviewSelection\} data-pending-selection>/)
 assert.match(battery,/window\.sessionStorage\.removeItem\(PENDING_TEST_SELECTION_KEY\)/)
 assert.doesNotMatch(battery,/if \(conflict \|\| error\) setShowList\(true\)/)
})

test('compact semantic test cards have direct start and remove controls, no practitioner photos',()=>{
 const battery=read('components/app/account-test-battery.jsx')
 const css=read('components/app/account-test-battery.module.css')
 assert.match(battery,/function TestSymbol\(\{topics\}\)/)
 assert.match(battery,/<TestSymbol topics=\{row\.topics\}/)
 assert.doesNotMatch(battery,/<Image src=\{row\.photo\}/)
 assert.match(battery,/data-saved-test=\{row\.key\}/)
 assert.match(battery,/onClick=\{\(\) => openTest\(row\)\}/)
 assert.match(battery,/onClick=\{\(\) => removeSelectedTest\(row\)\}/)
 assert.match(css,/\.row\{display:grid;grid-template-columns:38px minmax\(0,1fr\) auto 37px/)
 assert.match(css,/\.removeButton/)
 assert.match(css,/@media\s*\(max-width:760px\)/)
})

test('one mobile bottom navigation renders the shared Profile / Tests / Reports / Courses / Practice model',()=>{
 const workspace=read('components/app/app-workspace.jsx')
 const css=read('app/[locale]/app/[[...path]]/workspace.css')
 assert.match(workspace,/<nav className="hh-nav"/)
 assert.match(workspace,/<nav className="hh-mobile-app-nav"/)
 assert.match(workspace,/\{nav\.map\(\(\{ id, label, href, icon: Icon \}\) => \(/)
 assert.match(workspace,/aria-current=\{navIsActive\(id\) \? 'page' : undefined\}/)
 assert.match(css,/\.hh-app \.hh-nav\{display:none!important\}/)
})
