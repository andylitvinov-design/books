import { PAID_PLAN_KEYS, SUBSCRIPTION_PLANS } from '../lib/billing/public-plan.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = read('components/app/course-entry-selector.jsx')
const wrapper = read('components/app/my-course.jsx')
const css = read('components/app/course-entry-selector.module.css')

test('My Course first renders the selection slide and keeps the existing course wizard', () => {
  assert.match(wrapper, /<CourseEntrySelector/)
  // Direct banner entry skips the selector; generic My Courses still has its current-course cards.
  // Exercise the actual JSX return predicate, not a formatting-specific regex.
  const ast = ts.createSourceFile('my-course.jsx', wrapper, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const candidates = []
  const visit = node => {
    if (ts.isIfStatement(node) && ts.isReturnStatement(node.thenStatement) &&
        node.thenStatement.expression && ts.isJsxSelfClosingElement(node.thenStatement.expression) &&
        node.thenStatement.expression.tagName.getText(ast) === 'CourseEntrySelector') candidates.push(node.expression)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(candidates.length, 1, 'exact selector return predicate must remain identifiable')
  const predicate = candidates[0].getText(ast)
  // Reject executable calls, dynamic property access or newly introduced inputs.
  const allowedIdentifiers = new Set(['showCourse','coursesIndexEntry','courses','length','testReturn','programmeEntry','personalEntry','fastAntistressEntry'])
  const inspect = node => {
    if (ts.isIdentifier(node)) assert.ok(allowedIdentifiers.has(node.text), 'unreviewed predicate input '+node.text)
    assert.ok(!ts.isCallExpression(node) && !ts.isNewExpression(node) && !ts.isElementAccessExpression(node) &&
      !ts.isArrowFunction(node) && !ts.isFunctionExpression(node), 'selector predicate must remain pure')
    ts.forEachChild(node, inspect)
  }
  inspect(candidates[0])
  for (const showCourse of [false,true]) for (const coursesIndexEntry of [false,true]) {
    for (const count of [0,1,2]) for (let flags=0;flags<16;flags++) {
      const testReturn=Boolean(flags&1),programmeEntry=Boolean(flags&2),personalEntry=Boolean(flags&4),fastAntistressEntry=Boolean(flags&8)
      const context={showCourse,coursesIndexEntry,courses:Object.freeze(Array(count).fill(null)),testReturn,programmeEntry,personalEntry,fastAntistressEntry}
      let expected=false
      if (flags===0) {
        if (!showCourse) expected=true
        else if (coursesIndexEntry && count===0) expected=true
      }
      const actual=vm.runInNewContext('('+predicate+')',context,{timeout:100})
      assert.equal(actual,expected,JSON.stringify({showCourse,coursesIndexEntry,count,flags}))
    }
  }
  assert.match(wrapper, /personalEntry = stage === 0 &&/)
  assert.match(wrapper, /onOpen=\{\(\) => \{/)
  assert.match(wrapper, /selectCourse\(state\.course\.id\)/)
  assert.match(wrapper, /stage === 0 && <header/)
  assert.match(wrapper, /programmeEntry = stage === 0 && Boolean\(requestedProgram\)/)
  assert.match(wrapper, /stage === 4 && <CourseToday/)
  assert.match(wrapper, /searchParams\.get\('tests'\) === 'complete'/)
  assert.match(wrapper, /searchParams\.get\('retest'\) === 'updated'/)
  assert.match(wrapper, /router\.replace\(root \+ '\/course'\)/)
})

test('an active current-course tile and dotted add button are both present', () => {
  assert.match(entry, /data-current-course-card/)
  assert.match(entry, /data-add-course/)
  assert.match(entry, /onClick=\{addCourse\}/)
  assert.match(entry, /if \(!hasCourse\) \{ onOpen\(\); return \}/)
  assert.match(entry, /dialogRef\.current\?\.showModal\(\)/)
  assert.match(css, /dashed/)
  assert.match(css, /@media\(max-width:690px\)/)
})

test('daily lesson number comes from saved lessons, not elapsed dates', () => {
  assert.match(entry, /course\/progress\?locale=/)
  assert.match(entry, /daily\.progress\.practiceCount/)
  assert.match(entry, /completed \+ 1/)
  assert.doesNotMatch(entry, /course\.today/)
  assert.match(entry, /completed \/ 14 \* 100/)
})

test('Free paywall is informational until verified server billing is live', () => {
  assert.match(entry, /data-course-subscription-dialog/)
  const membership = read('lib/inner-growth/course-membership.js')
  assert.match(entry, /const PLANS = COURSE_PUBLIC_PLANS/)
  assert.match(membership, /regularMonthlyEUR: 20/)
  assert.match(membership, /introFirstMonthEUR: 10/)
  assert.match(membership, /introDiscountPercent: 50/)
  assert.match(membership, /premiumMonthlyEUR: 100/)
  assert.match(membership, /id: 'premium'/)
  assert.doesNotMatch(membership, /id: 'start'|price: 10, spots:/)
  assert.match(entry, /Subscription checkout is not available yet/)
  assert.match(entry, /Оформление подписки пока недоступно/)
  assert.doesNotMatch(entry, /checkout\/start|localStorage|sessionStorage|stripe\.redirect/)
})

test('dialog is accessible and does not hide existing course navigation', () => {
  assert.match(entry, /<dialog ref=\{dialogRef\}/)
  assert.match(entry, /aria-labelledby="course-upgrade-title"/)
  assert.match(entry, /dialogRef\.current\?\.close\(\)/)
  assert.match(css, /::backdrop/)
  assert.match(wrapper, /backToCourses/)
})

import { mount, nodes, textOf, findPart, findButton, account, course, courseView, access, deferred } from './helpers/course-ui-harness.mjs'

test('canonical landing passes authoritative scope and starts only when the signed-in learner clicks', async () => {
  const h = mount('my-course', { props: { data: account('owner-a'), locale: 'en' }, fetcher: () => courseView(course('course-a', 2), { courses: [course('course-a', 2), course('course-b', 2)] }) })
  await h.settle()
  const entry = findPart(h.tree, 'CourseEntrySelector')
  assert.ok(entry, 'ordinary entry retains the canonical selector')
  assert.equal(entry.props.accountId, 'owner-a')
  assert.equal(entry.props.course.id, 'course-a')
  assert.equal(entry.props.access.activeCourseLimit, 5)
  entry.props.onAdd(); await h.settle()
  assert.ok(findPart(h.tree, 'CoursePresetCatalog'))
  assert.equal(h.calls.filter(call => call.body).length, 0, 'opening a choice cannot create a course')
  findPart(h.tree, 'CoursePresetCatalog').props.onPersonal(); await h.settle()
  const writes = h.calls.filter(call => call.body)
  assert.equal(writes.length, 1, 'the course starts on the selected CTA, with no extra confirmation')
  assert.equal(writes[0].body.action, 'start')
  assert.equal(writes[0].body.consent, true)
  assert.equal(writes[0].options.headers['X-HH-Account-ID'], 'owner-a')
  assert.equal(findButton(h.tree, 'Agree & start'), undefined)
  h.unmount()
})

test('free 1/1 single saved course resumes its actual setup instead of showing a disabled start-another form', async () => {
  const current = course('course-a', 2, 'active')
  const freeAccess = { ...access, tier: 'free', activeCourseLimit: 1, activeCourseCount: 1, multiCourseEnabled: false }
  const h = mount('my-course', { props: { data: account('owner-a'), locale: 'en' },
    fetcher: () => courseView(current, { courses: [current], access: freeAccess }) })
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseEntrySelector'), undefined)
  assert.equal(findPart(h.tree, 'MyCoursesDashboard'), undefined)
  assert.equal(findPart(h.tree, 'CourseR3Steps')?.props.state.course.id, 'course-a')
  assert.ok(!textOf(h.tree).includes('You have reached your active-course limit'))
  assert.ok(!nodes(h.tree).some(node => node.props?.className === 'courseSelector'),
    'a sole ongoing course should not display a course-selection gate')
  assert.match(h.navigations.at(-1), /courseId=course-a/)
  assert.equal(h.calls.filter(call => call.body).length, 0, 'continuing must not create another course')
  h.unmount()
})

test('the current-course form is turquoise and switching never advertises a blocked new enrollment', () => {
  const theme = read('components/app/my-course.module.css')
  const section = wrapper.slice(wrapper.indexOf('courses.length > 1 && <section'), wrapper.indexOf('</section>}', wrapper.indexOf('courses.length > 1 && <section')))
  assert.match(section, /t.chooseCourse/)
  assert.doesNotMatch(section, /t.limitReached|t.multiUnavailable|t.newCourse/)
  assert.match(theme, /\.courseSelector\{[^]*?background:linear-gradient\(110deg,#f4feff,#e2f8fa\)/)
  assert.match(theme, /\.backCourses\{[^]*?background:#ecfafb/)
})

test('entry selector uses verified capacity and preserves informational paywall at the limit', async () => {
  for (const [tier, limit, count, enabled, expected] of [
    ['advanced', 5, 2, true, 1], ['premium', 5, 4, true, 1],
    ['free', 1, 1, true, 0], ['start', 1, 1, true, 0],
    ['advanced', 5, 5, true, 0], ['premium', 5, 1, false, 0],
  ]) {
    let added = 0
    const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a', 1),
      access: { ...access, tier, activeCourseLimit: limit, activeCourseCount: count, multiCourseEnabled: enabled },
      onOpen() {}, onAdd() { added++ } }, fetcher: () => { throw new Error('setup course must not read daily progress') } })
    await h.settle()
    nodes(h.tree).find(node => node.props['data-add-course'] !== undefined).props.onClick()
    assert.equal(added, expected)
    const dialog = nodes(h.tree).find(node => node.type === 'dialog' && node.props['data-course-subscription-dialog'] !== undefined)
    assert.equal(dialog.props.ref.current.open, !expected)
    assert.ok(textOf(h.tree).includes(count + ' / ' + limit))
    assert.equal(h.calls.length, 0)
    h.unmount()
  }
})

test('entry progress binds owner/course, rejects mismatches and cannot hydrate a later owner from a slow request', async () => {
  const slow = deferred()
  const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a', 4), onOpen() {} },
    fetcher: (path, options) => options.accountId === 'owner-a' ? slow.promise : { courseId: 'course-b', progress: { practiceCount: 2 } } })
  await h.settle()
  assert.match(h.calls[0].path, /courseId=course-a/)
  assert.equal(h.calls[0].options.accountId, 'owner-a')
  h.render({ accountId: 'owner-b', course: course('course-b', 4), onOpen() {} }); await h.settle()
  assert.equal(h.calls[0].options.signal.aborted, true)
  slow.resolve({ courseId: 'course-a', progress: { practiceCount: 13 } }); await h.settle()
  assert.ok(textOf(h.tree).includes('2 / 14'))
  assert.ok(!textOf(h.tree).includes('13 / 14'))
  h.render({ accountId: 'owner-b', course: course('course-c', 4), onOpen() {} }); await h.settle()
  assert.ok(textOf(h.tree).includes('Progress temporarily unavailable'))
  assert.ok(!textOf(h.tree).includes('2 / 14'))
  h.unmount()
})

test('programme links offer one clear fast-start button without creating a course on arrival', async () => {
  const h = mount('my-course', { props: { data: account('owner-a') }, search: '?program=stress',
    fetcher: () => ({ course: null, courses: [], assessments: {}, access: { ...access, activeCourseCount: 0 } }) })
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseEntrySelector'), undefined)
  const consent = nodes(h.tree).find(node => node.props['data-opora-fast-consent'] !== undefined)
  assert.ok(consent)
  assert.equal(consent.props.disabled, false)
  assert.equal(textOf(consent).trim(), "Yes, I'd like to enrol")
  assert.equal(h.calls.filter(call => call.body).length, 0)
  h.unmount()
})


test('entry plan cards use the existing EUR catalogue and keep checkout unavailable', async () => {
  const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a'), onOpen() {} }, fetcher() {} })
  await h.settle()
  const cards = nodes(h.tree).filter(node => node.type === 'article' && node.props.className === 'planCard')
  assert.equal(cards.length, 3)
  for (const [index, amount] of [0, 20, 100].entries()) assert.ok(textOf(cards[index]).includes(String(amount)))
  assert.ok(textOf(cards[0]).includes('1 active course'))
  assert.ok(textOf(cards[1]).includes('Up to 5 active courses'))
  assert.ok(textOf(cards[2]).includes('1 personal 60-minute session per month'))
  assert.ok(textOf(h.tree).includes('Subscription checkout is not available yet'))
  assert.equal(h.calls.length, 0)
  h.unmount()
})

test('public personal choices start with one deliberate click, remain owner-bound and continue into the created wizard', async () => {
  let state={course:null,courses:[],assessments:{},access:{...access,activeCourseCount:0}}
  const entry={focus:['stress'],problems:[],testKeys:['hh-weekly-pulse']}
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>entry}},
    fetcher:(_path,options,body)=>{
      if(!body)return state
      assert.equal(options.headers['X-HH-Account-ID'],'owner-a')
      if(body.action==='start')state={...state,course:course(body.courseId,1),courses:[course(body.courseId,1)]}
      if(body.action==='intake')state={...state,course:{...state.course,stage:2,revision:2,focusTags:body.focusTags}}
      return state
    }})
  await h.settle()
  assert.equal(findPart(h.tree,'CourseEntrySelector'),undefined)
  assert.equal(h.calls.filter(x=>x.body).length,0)
  findButton(h.tree,'Start').props.onClick();await h.settle()
  assert.equal(findButton(h.tree,'Agree & start'),undefined)
  assert.deepEqual(h.calls.filter(x=>x.body).map(x=>x.body.action),['start','intake'])
  assert.deepEqual([...h.calls.find(x=>x.body?.action==='intake').body.focusTags],['stress','mood','energy']) // Current Anti-Stress enrollment retains the consented programme's topic set.
  assert.ok(findPart(h.tree,'CourseR3Steps'))
  assert.equal(findPart(h.tree,'CourseEntrySelector'),undefined)
  h.unmount()
})

test('back from a public personal entry dismisses the intent and returns to the selector without writes',async()=>{
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>({focus:['stress'],problems:[],testKeys:[]})}},
    fetcher:()=>({course:null,courses:[],assessments:{},access:{...access,activeCourseCount:0}})})
  await h.settle();findButton(h.tree,'My courses').props.onClick();await h.settle()
  assert.ok(findPart(h.tree,'CourseEntrySelector'))
  assert.equal(h.calls.filter(x=>x.body).length,0)
  assert.ok(h.navigations.includes('/en/app/course'))
  h.unmount()
})

test('a consumed personal entry cannot populate a second separately chosen course',async()=>{
  let current=null,entry={focus:['stress'],problems:[],testKeys:['hh-weekly-pulse']},courses=[]
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>entry}},
    fetcher:(_path,_options,body)=>{
      if(body?.action==='start'){current={...course(body.courseId,1),status:'draft'};courses.push(current)}
      if(body?.action==='intake')current={...current,stage:2,focusTags:body.focusTags,concerns:body.concerns,revision:2}
      return {course:current,courses,assessments:{},access:{...access,activeCourseCount:courses.length}}
    }})
  await h.settle();findButton(h.tree,'Start course for free').props.onClick();await h.settle()
  entry=null
  // The sole saved course stays accessible; a second program is selected from
  // the explicit My courses dashboard, never the in-course limit banner.
  findButton(h.tree,'My courses').props.onClick();await h.settle()
  findPart(h.tree,'MyCoursesDashboard').props.onNew();await h.settle()
  findPart(h.tree,'CoursePresetCatalog').props.onPersonal();await h.settle()
  const starts=h.calls.filter(c=>c.body?.action==='start'),intakes=h.calls.filter(c=>c.body?.action==='intake')
  assert.equal(starts.length,2);assert.equal(intakes.length,1)
  assert.notEqual(starts[0].body.courseId,starts[1].body.courseId)
  assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,1)
  h.unmount()
})


test('the current course has a real photo to the left and a compact mobile add tile', () => {
  const photo = entry.indexOf('className={styles.currentPhoto}')
  const title = entry.indexOf('<h2>{name}</h2>', photo)
  const progress = entry.indexOf('className={styles.progressInfo}', title)
  const action = entry.indexOf('className={styles.openButton}', progress)
  assert.ok(photo >= 0 && title > photo && progress > title && action > progress)
  assert.match(entry, /<img src="\/images\/holistic-house\/course-focus-mountain-boy\.webp"/)
  assert.match(entry, /className=\{styles\.addTileText\}/)
  assert.match(css, /\.currentTop\{display:grid;grid-template-columns:/)
  assert.match(css, /\.currentPhoto img\{[^}]*object-fit:cover/s)
  assert.match(css, /\.addTile\{display:grid;grid-template-columns:42px/)
  assert.match(css, /@media\(max-width:340px\)/)
})

test('membership modal has Free, Advanced €20 and Premium €100, with only Advanced €10 first month', () => {
  const plans = read('lib/inner-growth/course-membership.js')
  assert.match(entry, /const PLANS = COURSE_PUBLIC_PLANS/)
  assert.match(plans, /regularMonthlyEUR: 20/)
  assert.match(plans, /introFirstMonthEUR: 10/)
  assert.match(plans, /premiumMonthlyEUR: 100/)
  assert.match(plans, /id: 'premium'/)
  assert.match(entry, /premium: 'Premium'/)
  assert.match(entry, /free: 'Free'/)
  assert.match(entry, /ads: 'Final course offer'/)
  assert.match(entry, /data-first-month-offer/)
  assert.match(entry, /data-plan=\{plan\.id\}/)
  assert.match(css, /\.planCard\[data-plan=free\]/)
  assert.match(css, /max-height:min\(80dvh,770px\)/)
  assert.match(css, /\.dialogHead\{position:sticky/)
  assert.doesNotMatch(entry, /\/api\/stripe\/holistic-course|checkout\/start/)
})

test('informational cards render Free first in EN/RU without creating checkout or granting capacity',async()=>{
  for(const locale of ['en','ru']){
    const h=mount('course-entry-selector',{props:{accountId:'owner-a',locale,course:course('course-a'),access:{...access,tier:'free',activeCourseLimit:1,activeCourseCount:1},onOpen(){}},fetcher(){throw new Error('informational card must not fetch')}})
    await h.settle()
    const cards=nodes(h.tree).filter(n=>n.type==='article'&&n.props['data-plan'])
    assert.deepEqual(cards.map(n=>n.props['data-plan']),['free','advanced','premium'])
    assert.match(textOf(cards[0]),locale==='en'?/Final course offer/:/Реклама в финале курса/)
    assert.match(textOf(cards[0]),/€ 0|€0/)
    nodes(h.tree).find(n=>n.props['data-add-course']!==undefined).props.onClick();await h.settle()
    assert.equal(nodes(h.tree).find(n=>n.type==='dialog' && n.props['data-course-subscription-dialog'] !== undefined).props.ref.current.open,true)
    assert.equal(h.calls.length,0)
    h.unmount()
  }
})

test('iPhone My Courses layout puts scales below both columns and keeps Plan fully readable', () => {
  const axes = entry.indexOf('className={styles.axes}')
  const photo = entry.indexOf('className={styles.currentPhoto}')
  const title = entry.indexOf('<h2>{name}</h2>', photo)
  const photoRowClose = entry.indexOf('</div>\n        </div>', title)
  const progress = entry.indexOf('className={styles.progressInfo}', axes)
  assert.ok(photo < title && title < photoRowClose && photoRowClose < axes && axes < progress)
  assert.match(entry, /plan: 'Course plan'/)
  assert.match(entry, /plan: 'План курса'/)
  assert.match(css, /\.planButton span\{white-space:nowrap/)
  assert.match(css, /@media\(max-width:690px\)\{[\s\S]*?\.courseActions\{display:grid;grid-template-columns:minmax\(0,1fr\)/)
  assert.match(css, /\.planButton\{justify-self:end;display:inline-flex;flex-direction:row/)
  assert.match(css, /\.currentPhoto\{align-self:start;width:100%;height:133px;min-height:133px/)
  assert.match(css, /\.addTile\{grid-template-columns:43px minmax\(0,1fr\) 17px;min-height:79px/)
})

// Cabinet menus share `nav`; the redesigned mobile dock intentionally uses
// `mobileNav`. Check the actual links in each surface, not a global map count.
function assertCourseNavigationSurfaces(workspace) {
  const ast = ts.createSourceFile('app-workspace.jsx', workspace, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const all = []
  const visit = node => { all.push(node); ts.forEachChild(node, visit) }
  visit(ast)
  const exports = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AppWorkspace' &&
    node.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword) &&
    node.modifiers?.some(item => item.kind === ts.SyntaxKind.DefaultKeyword))
  assert.equal(exports.length, 1, 'bind the exported AppWorkspace, not a detached fixture')
  const statements = exports[0].body.statements
  const finalReturn = statements.at(-1)
  assert.ok(ts.isReturnStatement(finalReturn), 'the workspace ends in its live return')
  const rendered = ts.isParenthesizedExpression(finalReturn.expression) ? finalReturn.expression.expression : finalReturn.expression
  assert.ok(ts.isJsxElement(rendered) && rendered.openingElement.tagName.getText(ast) === 'SubscriptionProvider')
  const earlyGuards = statements.filter(ts.isIfStatement)
  assert.deepEqual(earlyGuards.map(node => node.expression.getText(ast).replace(/\s/g, '')), [
    "deleted||state==='deletion'", "state==='loading'", "state==='ready'&&!data",
    "state!=='ready'&&page==='course'&&state!=='unavailable'",
    "state!=='ready'&&page==='portrait'&&!stressSignup", "state!=='ready'",
  ], 'only reviewed pre-navigation guards may exit the workspace early')
  assert.ok(earlyGuards.every(node => ts.isReturnStatement(node.thenStatement) && !node.elseStatement))
  const exits = []
  const inspectExits = node => {
    if (ts.isFunctionLike(node)) return // callbacks have independent lifetimes
    if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) exits.push(node)
    ts.forEachChild(node, inspectExits)
  }
  statements.forEach(inspectExits)
  const expectedExits = [...earlyGuards.map(node => node.thenStatement), finalReturn]
  assert.equal(exits.length, expectedExits.length, 'no additional unconditional or conditional early exits')
  assert.ok(exits.every((node, index) => node === expectedExits[index]), 'only reviewed early exits and the final return remain')
  const attr = (node, name) => node.attributes.properties.find(item =>
    ts.isJsxAttribute(item) && item.name.text === name)?.initializer
  const property = (node, name) => node.properties.find(item =>
    ts.isPropertyAssignment(item) && item.name.getText(ast) === name)?.initializer
  const nav = all.filter(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'nav')
  assert.equal(nav.length, 1, 'one canonical Cabinet navigation declaration')
  assert.ok(ts.isArrayLiteralExpression(nav[0].initializer))
  assert.ok(nav[0].parent.parent.parent === exports[0].body, 'canonical nav belongs directly to the exported workspace')
  assert.ok(earlyGuards.every(node => node.end < nav[0].pos), 'reviewed early exits precede navigation declarations')
  const course = nav[0].initializer.elements.filter(node => ts.isObjectLiteralExpression(node) &&
    property(node, 'id')?.text === 'course')
  assert.equal(course.length, 1, 'one Courses destination')
  const href = property(course[0], 'href')
  assert.ok(ts.isBinaryExpression(href) && href.operatorToken.kind === ts.SyntaxKind.PlusToken &&
    ts.isIdentifier(href.left) && href.left.text === 'root' &&
    ts.isStringLiteral(href.right) && href.right.text === '/course?view=courses', 'canonical Courses destination')
  for (const className of ['hh-account-menu', 'hh-nav']) {
    const surfaces = all.filter(node => ts.isJsxElement(node) && attr(node.openingElement, 'className')?.text === className)
    assert.equal(surfaces.length, 1, 'one live '+className+' surface')
    let ancestor = surfaces[0]
    while (ancestor && ancestor !== finalReturn && !ts.isFunctionLike(ancestor)) ancestor = ancestor.parent
    assert.ok(ancestor === finalReturn, 'surface belongs to the exported final return')
    const maps = []
    const inspect = node => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'map' && ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'nav') maps.push(node)
      ts.forEachChild(node, inspect)
    }
    inspect(surfaces[0])
    assert.equal(maps.length, 1, className+' consumes canonical nav')
    assert.ok(ts.isJsxExpression(maps[0].parent), 'map remains a rendered JSX expression')
    const owner = maps[0].parent.parent
    if (className === 'hh-nav') assert.ok(owner === surfaces[0], 'desktop map is rendered directly')
    else assert.ok(ts.isJsxElement(owner) && owner.openingElement.tagName.getText(ast) === 'div' && owner.parent === surfaces[0], 'account map is rendered directly in its menu')
    const guards = []
    for (let node = surfaces[0].parent; node && !ts.isReturnStatement(node); node = node.parent) {
      if (ts.isConditionalExpression(node)) assert.fail('navigation must not be hidden in an unreviewed ternary')
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && ts.isJsxElement(ts.isParenthesizedExpression(node.right) ? node.right.expression : node.right)) guards.push(node.left.getText(ast).replace(/\s/g, ''))
    }
    assert.deepEqual(guards, className === 'hh-nav' ? ["!documentReader&&!practiceInner&&page!=='runs'"] : ['!documentReader&&!practiceInner'], 'existing private/document-reader visibility guard is retained')

    const callback = maps[0].arguments[0]
    assert.ok(ts.isArrowFunction(callback) && callback.parameters.length === 1)
    assert.equal(callback.parameters[0].name.getText(ast).replace(/\s/g, ''), '{id,label,href}')
    const body = ts.isParenthesizedExpression(callback.body) ? callback.body.expression : callback.body
    assert.ok(ts.isJsxElement(body) && body.openingElement.tagName.getText(ast) === 'Link')
    const target = attr(body.openingElement, 'href')
    assert.ok(ts.isJsxExpression(target) && ts.isIdentifier(target.expression) && target.expression.text === 'href', className+' forwards the canonical href')
    assert.ok(body.children.some(node => ts.isJsxExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'label'), className+' retains the destination label')
  }
}

test('course page brand, Account menu and desktop tabs retain the canonical Courses destination', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const theme = read('components/app/my-course-theme.css')
  assert.match(workspace, /id: 'course', label: locale === 'ru' \? 'Курсы' : 'Courses', href: root \+ '\/course\?view=courses'/)
  assert.match(workspace, /nav\.find\(item => navIsActive\(item\.id\)\)\?\.label/)
  assertCourseNavigationSurfaces(workspace)
  assert.match(workspace, /page === 'course'/)
  assert.match(theme, /:has\(\[data-course-selector\]\) \.hh-header/)
  assert.match(theme, /@media\(max-width:620px\)/)
  assert.doesNotMatch(entry, /checkout\/start|stripe\.redirect|localStorage|sessionStorage/)
})

test('each active course card exposes a localized vertical-ellipsis menu and safe confirmation', () => {
  assert.ok(entry.includes('<MoreVertical size={22}'))
  assert.match(entry, /data-course-actions/)
  assert.match(entry, /data-course-menu-trigger/)
  assert.ok(entry.includes('aria-expanded={menuOpen}'))
  assert.match(entry, /data-course-actions-menu/)
  assert.match(entry, /data-close-course-dialog/)
  assert.match(entry, /data-confirm-close-course/)
  assert.match(entry, /closeCourse: 'Close course'/)
  assert.match(entry, /closeCourse: 'Закрыть курс'/)
  assert.match(entry, /onOutsideClick/)
  assert.match(entry, /event.key === 'Escape'/)
  assert.match(css, /\.courseMenu\{position:absolute;top:10px;right:10px/)
  assert.match(css, /\.courseMenuTrigger\{[^}]*width:44px;height:44px/)
  assert.match(css, /\.closeCourseDialog::backdrop/)
  assert.ok(wrapper.includes('onCloseCourse={closeCourse} closing={busy}'))
  assert.match(wrapper, /await courseCommand\('close'\)/)
  assert.match(wrapper, /updated.course\?\.id !== courseId/)
  assert.match(wrapper, /isSelected\(courseId, epoch\)/)
  assert.doesNotMatch(entry, /localStorage|sessionStorage/)
})

test('closing is owner-scoped, revision-checked, and archives past cycles without deleting exercises', () => {
  const server = read('lib/app/growth-course.js')
  const daily = read('lib/app/growth-daily.js')
  const migration = read('supabase/migrations/20261014225100_hh_growth_course_close.sql')
  assert.doesNotMatch(server, /if \(row\?\.status === 'closed'\) row = null/)
  assert.match(entry, /!\['closed','archived'\]\.includes\(course\?\.status\)/)
  assert.match(server, /'pause','resume','close','make-primary','select-preset','select-personal'\]\.includes\(action\)/)
  assert.match(server, /validRevision\(body, row\)/)
  assert.match(server, /if \(action === 'close'\)/)
  assert.match(server, /status='archived',finished_at=now\(\),revision=revision\+1,updated_at=now\(\)/)
  assert.match(server, /where account_id=\$1 and course_id=\$2 and status in \('active','paused'\)/)
  assert.match(server, /status='closed',revision=revision\+1,updated_at=now\(\)/)
  assert.match(server, /where account_id=\$1 and id=\$2 returning \*/)
  assert.match(server, /if \(row\?\.status === 'closed' && !config.multiCourseEnabled\) \{\s+validRevision\(body, row\)\s+await requireCourseCapacity/)
  assert.match(server, /stage=1, concerns_ciphertext=null/)
  assert.match(server, /consented_at=now\(\)/)
  assert.match(daily, /course\.status==='closed'/)
  assert.match(daily, /if\(\['archived','closed'\]\.includes\(course.status\)\)notAllowed\('COURSE_NOT_ACTIVE',409\)/)
  assert.match(migration, /status in \('active','paused','completed','archived','closed'\)/)
  assert.doesNotMatch(server, /delete from app_private\.growth_(?:cycles|sessions|courses)/i)
})

 test('course navigation oracle rejects broken destinations, missing surfaces and disconnected links', () => {
  const workspace = read('components/app/app-workspace.jsx')
  for (const [before, after] of [
    ["href: root + '/course?view=courses'", "href: root + '/tests'"],
    ['className="hh-account-menu"', 'className="removed-account-menu"'],
    ['className="hh-nav"', 'className="removed-nav"'],
    ['{nav.map(({ id, label, href })', '{mobileNav.map(({ id, label, href })'],
    ['<Link key={id} href={href}', '<Link key={id} href={root}'],
    ['>{label}</Link>', '>{id}</Link>'],
    ['  return (\n    <SubscriptionProvider', '  return null;\n  return (\n    <SubscriptionProvider'],
    ['  return (\n    <SubscriptionProvider', '  if (true) return null;\n  return (\n    <SubscriptionProvider'],
    ['export default function AppWorkspace', 'function AppWorkspace'],
    ['{nav.map(({ id, label, href })', '{false && nav.map(({ id, label, href })'],
    ['!documentReader && !practiceInner && <header', 'false && <header'],
    ["!documentReader && !practiceInner && page !== 'runs' && (", "!practiceInner && page !== 'runs' && ("],
  ]) {
    assert.ok(workspace.includes(before), 'control must alter live source: '+before)
    assert.throws(() => assertCourseNavigationSurfaces(workspace.replace(before, after)))
  }
})
