import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { sourceFixture, blocked, icons, link, element, textContent, accountNavigation } from './helpers/current-navigation-fixture.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

// #2041 composes both authorized report readers in the existing Profile archive.
// Pin the supported exported/imported production pattern, direct composition and
// known guards. This static contract is not general runtime/control-flow proof.
function assertProfileReportComposition(source) {
  const ast = ts.createSourceFile('app-workspace.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length, 0, 'Workspace JSX parses')
  const owners = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AppWorkspace')
  assert.equal(owners.length, 1, 'One genuine AppWorkspace declaration')
  const owner = owners[0], bindings = []

  // This contract supports the current direct default export and explicit import
  // boundaries only; it is not a module resolver or general control-flow proof.
  assert.ok(owner.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword), 'AppWorkspace is the actual default export')
  assert.ok(owner.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword), 'AppWorkspace is the actual default export')
  assert.equal(ast.statements.filter(node => ts.isExportAssignment(node) || node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)).length, 1)
  const identities = new Set(['PersonalAnalysisPanel', 'ProfileDomains', 'ClientExpressReports', 'reportTimeline', 'dynamic'])
  const names = binding => ts.isIdentifier(binding) ? [binding.text]
    : binding.elements.flatMap(entry => ts.isOmittedExpression(entry) ? [] : names(entry.name))
  const topBindings = []
  for (const statement of ast.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause?.name) topBindings.push({ name: clause.name.text, node: statement })
      const bindings = clause?.namedBindings
      if (bindings && ts.isNamedImports(bindings)) {
        for (const entry of bindings.elements) topBindings.push({ name: entry.name.text, node: statement })
      } else if (bindings) topBindings.push({ name: bindings.name.text, node: statement })
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const name of names(declaration.name)) topBindings.push({ name, node: declaration })
      }
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      topBindings.push({ name: statement.name.text, node: statement })
    }
  }
  const binding = name => {
    const found = topBindings.filter(entry => entry.name === name)
    assert.equal(found.length, 1, 'One top-level binding for ' + name)
    return found[0].node
  }
  const imported = (name, path, exported = name) => {
    const node = binding(name)
    assert.ok(ts.isImportDeclaration(node), name + ' is imported, not a local replacement')
    assert.equal(node.moduleSpecifier.text, path)
    assert.ok(!node.importClause.isTypeOnly)
    if (exported === 'default') assert.equal(node.importClause.name?.text, name)
    else {
      const entries = node.importClause.namedBindings
      assert.ok(entries && ts.isNamedImports(entries))
      const entry = entries.elements.find(value => value.name.text === name)
      assert.ok(entry && !entry.isTypeOnly)
      assert.equal((entry.propertyName || entry.name).text, exported)
    }
  }
  imported('PersonalAnalysisPanel', '@/components/app/personal-analysis-panel')
  imported('reportTimeline', '@/lib/app/cabinet-ux')
  imported('dynamic', 'next/dynamic', 'default')
  const dynamicReader = (name, path) => {
    const declaration = binding(name)
    assert.ok(ts.isVariableDeclaration(declaration) && (declaration.parent.flags & ts.NodeFlags.Const))
    const call = declaration.initializer
    assert.ok(call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && call.expression.text === 'dynamic')
    assert.equal(call.arguments.length, 1)
    const loader = call.arguments[0]
    assert.ok(ts.isArrowFunction(loader) && !loader.modifiers?.length && loader.parameters.length === 0)
    const then = loader.body
    assert.ok(ts.isCallExpression(then) && ts.isPropertyAccessExpression(then.expression) && then.expression.name.text === 'then')
    const request = then.expression.expression
    assert.ok(ts.isCallExpression(request) && request.expression.kind === ts.SyntaxKind.ImportKeyword)
    assert.equal(request.arguments.length, 1)
    assert.ok(ts.isStringLiteral(request.arguments[0]))
    assert.equal(request.arguments[0].text, path)
    assert.equal(then.arguments.length, 1)
    const select = then.arguments[0]
    assert.ok(ts.isArrowFunction(select) && !select.modifiers?.length && select.parameters.length === 1)
    const parameter = select.parameters[0]
    assert.ok(ts.isIdentifier(parameter.name) && !parameter.initializer && !parameter.dotDotDotToken)
    assert.ok(ts.isPropertyAccessExpression(select.body) && ts.isIdentifier(select.body.expression))
    assert.equal(select.body.expression.text, parameter.name.text)
    assert.equal(select.body.name.text, name)
  }
  dynamicReader('ProfileDomains', '@/components/app/profile-domains')
  dynamicReader('ClientExpressReports', '@/components/app/practice-express-reports')
  const rejectShadows = node => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      for (const name of names(node.name)) assert.ok(!identities.has(name), 'No owner-local shadow of ' + name)
    }
    ts.forEachChild(node, rejectShadows)
  }
  rejectShadows(owner)
  const walk = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'ProfileDomains') bindings.push(node)
    ts.forEachChild(node, walk)
  }
  walk(owner.body)
  assert.equal(bindings.length, 1, 'One production Profile binding')
  const profile = bindings[0]
  const attributes = node => {
    const attrs = {}
    for (const attribute of node.attributes.properties) {
      assert.ok(ts.isJsxAttribute(attribute), 'No spread may override account/report bindings')
      const name = attribute.name.getText(ast)
      assert.ok(!Object.hasOwn(attrs, name), 'No duplicate prop: ' + name)
      const value = attribute.initializer
      attrs[name] = !value ? true : ts.isJsxExpression(value) ? value.expression?.getText(ast) : JSON.stringify(value.text)
    }
    return attrs
  }
  const profileAttrs = attributes(profile)
  assert.equal(profileAttrs.locale, 'locale')
  assert.equal(profileAttrs.mode, '"account"')
  assert.equal(profileAttrs.accountId, 'data.account.id')
  assert.equal(profileAttrs.savedReports, 'data.savedReports || []')
  assert.equal(profileAttrs.savedDocuments, 'data.savedDocuments || []')
  const reportsProp = profile.attributes.properties.find(attribute => attribute.name?.getText(ast) === 'reportsContent')
  assert.ok(reportsProp && ts.isJsxExpression(reportsProp.initializer), 'Actual reportsContent prop')
  const reports = reportsProp.initializer.expression
  assert.ok(ts.isJsxFragment(reports), 'Archive receives the current composed Fragment')
  const readers = reports.children.filter(node => !(ts.isJsxText(node) && !node.text.trim()))
  assert.equal(readers.length, 2, 'Exactly two direct, unconditional report readers')
  assert.ok(readers.every(ts.isJsxSelfClosingElement))
  assert.deepEqual(readers.map(node => node.tagName.getText(ast)), ['PersonalAnalysisPanel', 'ClientExpressReports'])
  assert.deepEqual(attributes(readers[0]), {
    key: 'data.account.id', locale: 'locale', reports: 'reportTimeline(data.savedReports)',
    savedSessions: 'data.savedSessions || []', embedded: true,
  })
  assert.deepEqual(attributes(readers[1]), { locale: 'locale', accountId: 'data.account.id' })
  const operand = node => { while (ts.isParenthesizedExpression(node.parent)) node = node.parent; return node }
  const portrait = operand(profile.parent)
  assert.ok(ts.isJsxFragment(profile.parent), 'Profile is a direct portrait child')
  const pageGate = portrait.parent
  assert.ok(ts.isBinaryExpression(pageGate) && pageGate.right === portrait && pageGate.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
  assert.equal(pageGate.left.getText(ast), "page === 'portrait'")
  assert.ok(ts.isJsxExpression(pageGate.parent) && pageGate.parent.expression === pageGate)
  const account = operand(pageGate.parent.parent)
  assert.ok(ts.isJsxFragment(pageGate.parent.parent))
  const onboarding = account.parent
  assert.ok(ts.isConditionalExpression(onboarding) && onboarding.whenFalse === account)
  assert.equal(onboarding.condition.getText(ast), "data.account.onboardingState !== 'active'")
  assert.ok(ts.isJsxExpression(onboarding.parent) && onboarding.parent.expression === onboarding)
  const main = onboarding.parent.parent
  assert.ok(ts.isJsxElement(main) && main.openingElement.tagName.getText(ast) === 'main')
  const provider = main.parent
  assert.ok(ts.isJsxElement(provider) && provider.openingElement.tagName.getText(ast) === 'SubscriptionProvider')
  const returned = operand(provider).parent
  assert.ok(ts.isReturnStatement(returned) && returned === owner.body.statements.at(-1), 'Profile belongs to the final account return in the supported source pattern')

  // Reject only obvious returns in plain blocks, literal-true branches, or the
  // exact portrait gate. Unknown conditions, loops and try/finally are not proved.
  const exitsSupportedPath = statement => {
    if (ts.isReturnStatement(statement)) return true
    if (ts.isBlock(statement)) return statement.statements.some(exitsSupportedPath)
    if (!ts.isIfStatement(statement)) return false
    let condition = statement.expression
    while (ts.isParenthesizedExpression(condition)) condition = condition.expression
    const portraitGate = ts.isBinaryExpression(condition) && condition.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isIdentifier(condition.left) && condition.left.text === 'page' && ts.isStringLiteral(condition.right) && condition.right.text === 'portrait'
    return (condition.kind === ts.SyntaxKind.TrueKeyword || portraitGate) && exitsSupportedPath(statement.thenStatement)
  }
  assert.equal(owner.body.statements.slice(0, -1).filter(exitsSupportedPath).length, 0, 'No supported obvious early return hides the portrait branch')
}

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
  assertProfileReportComposition(workspace)
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


test('Profile composition rejects genuine missing, detached, disabled and misbound source readers', async () => {
  const source = read('components/app/app-workspace.jsx')
  assertProfileReportComposition(source)
  const panel = '<PersonalAnalysisPanel key={data.account.id} locale={locale} reports={reportTimeline(data.savedReports)} savedSessions={data.savedSessions || []} embedded />'
  const express = '<ClientExpressReports locale={locale} accountId={data.account.id}/>'
  const composition = 'reportsContent={<>' + panel + express + '</>}'
  const replace = (before, after) => {
    assert.ok(source.includes(before), 'Mutation anchor exists in genuine source')
    const changed = source.replace(before, after)
    assert.notEqual(changed, source)
    return changed
  }
  const mutations = [
    ['missing saved-report reader', replace(panel, '')],
    ['missing express reader', replace(composition, 'reportsContent={<>' + panel + '</>}')],
    ['reversed archive order', replace(composition, 'reportsContent={<>' + express + panel + '</>}')],
    ['duplicate saved reader', replace(panel, panel + panel)],
    ['disabled saved reader', replace(panel, '{false && ' + panel + '}')],
    ['wrong saved account key', replace(panel, panel.replace('key={data.account.id}', 'key={"other-account"}'))],
    ['wrong saved report source', replace(panel, panel.replace('reportTimeline(data.savedReports)', 'reportTimeline(data.results)'))],
    ['wrong saved session source', replace(panel, panel.replace('data.savedSessions || []', '[]'))],
    ['not embedded', replace(panel, panel.replace(' embedded />', ' embedded={false} />'))],
    ['wrong express account', replace(composition, composition.replace('accountId={data.account.id}', 'accountId={"other-account"}'))],
    ['wrong express locale', replace(composition, composition.replace(express, express.replace('locale={locale}', 'locale={"ru"}')))],
    ['prop override', replace(panel, panel.replace(' embedded />', ' embedded {...unsafeProps} />'))],
    ['wrong Profile mode', replace('<ProfileDomains locale={locale} mode="account"', '<ProfileDomains locale={locale} mode="legacy"')],
    ['wrong Profile page', replace("{page === 'portrait' && (", "{page === 'tests' && (")],
    ['wrong onboarding branch', replace("{data.account.onboardingState !== 'active' ? (", "{data.account.onboardingState === 'active' ? (")],
    ['detached matching JSX', replace(composition, 'reportsContent={null}') + '\nconst detachedProfileReports = <>' + panel + express + '</>\n'],
    ['comment decoy', replace(composition, 'reportsContent={null}') + '\n// ' + composition + '\n'],
  ]
  for (const [label, mutant] of mutations) {
    assert.throws(() => assertProfileReportComposition(mutant), { code: 'ERR_ASSERTION' }, label)
  }
})


test('Profile source identity rejects reviewer export, shadow, early-return and boundary mutations', async () => {
  const source = read('components/app/app-workspace.jsx')
  assertProfileReportComposition(source)
  const owner = 'export default function AppWorkspace({ locale, path = [] }) {'
  const returned = '  return (\n    <SubscriptionProvider key={data.account.id} accountId={data.account.id} locale={locale}>'
  const replace = (before, after) => {
    assert.equal(source.split(before).length - 1, 1, 'Unique genuine-source mutation anchor')
    return source.replace(before, after)
  }
  const mutations = [
    ['inactive-export-decoy', replace(owner, 'export default function EmptyWorkspace() { return null }\nfunction AppWorkspace({ locale, path = [] }) {')],
    ['shadowed-saved-reader', replace(owner, owner + '\n  const PersonalAnalysisPanel = () => null;')],
    ['shadowed-express-reader', replace(owner, owner + '\n  const ClientExpressReports = () => null;')],
    ['shadowed-profile', replace(owner, owner + '\n  const ProfileDomains = () => null;')],
    ['block-unconditional-return', replace(returned, '  { return null; }\n' + returned)],
    ['true-unconditional-return', replace(returned, '  if (true) return null;\n' + returned)],
    ['portrait-early-return', replace(returned, "  if (page === 'portrait') return null;\n" + returned)],
    ['wrong saved-reader import', replace("from '@/components/app/personal-analysis-panel'", "from '@/components/app/unrelated-reader'")],
    ['wrong Profile dynamic module', replace("import('@/components/app/profile-domains')", "import('@/components/app/unrelated-profile')")],
    ['wrong express dynamic module', replace("import('@/components/app/practice-express-reports')", "import('@/components/app/unrelated-reader')")],
    ['wrong Profile selected export', replace('module => module.ProfileDomains', 'module => module.default')],
    ['wrong express selected export', replace('module => module.ClientExpressReports', 'module => module.default')],
    ['wrong dynamic implementation', replace("from 'next/dynamic'", "from './unrelated-dynamic'")],
    ['destructured reader shadow', replace(owner, 'export default function AppWorkspace({ locale, path = [], PersonalAnalysisPanel }) {')],
    ['local timeline shadow', replace(owner, owner + '\n  const reportTimeline = () => [];')],
  ]
  const reviewerErrors = {
    'inactive-export-decoy': /AppWorkspace is the actual default export/,
    'shadowed-saved-reader': /No owner-local shadow of PersonalAnalysisPanel/,
    'shadowed-express-reader': /No owner-local shadow of ClientExpressReports/,
    'shadowed-profile': /No owner-local shadow of ProfileDomains/,
    'block-unconditional-return': /No supported obvious early return hides the portrait branch/,
    'true-unconditional-return': /No supported obvious early return hides the portrait branch/,
    'portrait-early-return': /No supported obvious early return hides the portrait branch/,
  }
  for (const [label, mutant] of mutations) {
    const ast = ts.createSourceFile('mutant-workspace.jsx', mutant, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    assert.equal(ast.parseDiagnostics.length, 0, 'Reviewer/boundary mutant parses: ' + label)
    assert.throws(() => assertProfileReportComposition(mutant), { code: 'ERR_ASSERTION', ...(reviewerErrors[label] ? { message: reviewerErrors[label] } : {}) }, label)
  }
})
