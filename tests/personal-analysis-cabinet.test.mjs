import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFile } from 'node:fs/promises'
import { generatePractitionerReportPdf } from '../lib/profile/practitioner-report-pdf.js'

const src = path => readFile(path, 'utf8')

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

test('both authorized cabinets now keep analysis reports in Profile; legacy links still work', async () => {
  const [google, route, legacy, legacyRoute, panel, style, profile] = await Promise.all([
    src('components/app/app-workspace.jsx'),
    src('app/[locale]/app/[[...path]]/page.jsx'),
    src('components/client-cabinet.jsx'),
    src('app/[locale]/client/[selector]/page.js'),
    src('components/app/personal-analysis-panel.jsx'),
    src('components/app/personal-analysis.css'),
    src('components/app/profile-domains.jsx'),
  ])
  assert.match(route, /path\[0\] === 'analysis' && path\.length === 1/)
  assert.match(route, /redirect\('\/' \+ locale \+ '\/app\/portrait#personal-reports'\)/)
  assert.doesNotMatch(google, /\['analysis', locale === 'ru'/)
  assert.match(google, /<ProfileDomains locale=\{locale\} mode="account"/)
  assertProfileReportComposition(google)
  assert.match(profile, /id="personal-reports"/)
  assert.match(profile, /\{reportsContent\}/)
  assert.match(legacy, /\['profile','analysis'\]\.includes\(view\)/)
  assert.match(legacy, /focusReports=\{view === 'analysis'\}/)
  assert.match(legacy, /<PersonalAnalysisPanel locale=\{locale\} reports=\{personalReports\} legacyReports=\{legacyReports\} selector=\{selector\} embedded \/>/)
  assert.match(legacy, /personalReports = assessments\.filter\(item => item\.kind === 'research_result'\)/)
  assert.match(legacy, /legacyReports = documents\.filter\(document => document\.type === 'report'\)/)
  assert.match(legacyRoute, /const requestedView = \(await searchParams\)\?\.view/)
  assert.match(legacyRoute, /\['analysis', 'profile'\]\.includes\(requestedView\)/)
  assert.match(panel, /embedded = false/)
  assert.match(panel, /if \(embedded\) return <div className="hh-personal-analysis hh-personal-analysis--embedded"/)
  assert.match(panel, /<PersonalAnalysisReportList reports=\{\[\.\.\.visibleReports, \.\.\.legacyReports\]\}/)
  assert.match(style, /\.hh-profile-domains \.hh-personal-analysis--embedded/)
  // Old free paths still exist publicly but do not get cloned into Profile.
  assert.match(panel, /services\/free-situation-review/)
  assert.match(panel, /services\/dao-health-profile/)
  assert.match(panel, /data-analysis-offer=\{offer\.id\}/)
  assert.match(style, /\.hh-analysis-reports-empty/)
})

test('Google Cabinet lists only explicitly saved practitioner reports and downloads authenticated current versions', async () => {
  const [workspace, panel, flow, view] = await Promise.all([
    src('components/app/app-workspace.jsx'),
    src('components/app/personal-analysis-panel.jsx'),
    src('lib/app/report-flow.js'),
    src('components/app/shared-report-view.jsx'),
  ])
  assert.match(workspace, /reports=\{reportTimeline\(data\.savedReports\)\}/)
  assert.match(workspace, /PersonalAnalysisPanel key=\{data\.account\.id\}/)
  assert.match(panel, /\/api\/app\/reports\//)
  assert.match(panel, /credentials: 'same-origin'/)
  assert.match(panel, /response\.ok/)
  assert.match(panel, /DownloadPractitionerReport/)
  assert.match(panel, /item\.available === false/)
  assert.match(flow, /bound_account_id/)
  assert.match(view, /save-intents/)
  assert.match(view, /Save this report to my Cabinet/)
  assert.match(view, /DownloadPractitionerReport report=\{report\}/)
  assert.doesNotMatch(view, /sessionStorage|localStorage/)
})

test('private client report download is isolated by the real cabinet authorization and returns no owner-only fields', async () => {
  const pathname = '../app/api/client/[selector]/assessments/[assessmentId]/route.js'
  const raw = (await readFile(new URL(pathname, import.meta.url), 'utf8'))
    .replace(/^import .* from .*\n/gm, '').replace(/^export /gm, '')
  let lookedUp = 0
  const header = { 'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow', 'Referrer-Policy':'no-referrer' }
  const factory = auth => new Function('NextResponse','authorizeCabinetRequest','clientAssessmentDetail','privateHeaders', raw + '\nreturn { GET }')(
    Response, auth, async (_store, clientId, id) => {
      lookedUp++
      assert.equal(clientId, 'client-a')
      assert.equal(id, 'test-report-a')
      return {
        id, title:'Synthetic Resource Report',kind:'research_result',occurredOn:'2026-10-10',
        description:'Safe client-visible text', originalResult:'Visible outcome',
        practitionerComment:'Private to this client', relatedDocuments:[{ id:'other-doc-id' }],
      }
    },header,
  ).GET
  const opts = { params: Promise.resolve({selector:'selector-a',assessmentId:'test-report-a'}) }
  const unauthorized = await factory(async () => undefined)(new Request('https://preview.invalid/api/client/selector-a/assessments/test-report-a'),opts)
  assert.equal(unauthorized.status,404)
  assert.equal(lookedUp,0)
  const permitted = await factory(async () => ({client:{id:'client-a'},store:{}}))(new Request('https://preview.invalid/api/client/selector-a/assessments/test-report-a'),opts)
  assert.equal(permitted.status,200)
  assert.match(permitted.headers.get('cache-control'),/private, no-store/)
  assert.equal(permitted.headers.get('referrer-policy'),'no-referrer')
  assert.match(permitted.headers.get('vary'),/Cookie/)
  const result = await permitted.json()
  assert.equal(result.report.originalResult,'Visible outcome')
  assert.equal(result.report.relatedDocuments,undefined)
  assert.equal(result.report.clientId,undefined)
  assert.equal(result.report.notes,undefined)
})

test('client-side PDF preserves bilingual private report fields without any third-party fetch', async () => {
  const originalDocument = globalThis.document
  const originalAtob = globalThis.atob
  let pages = 0
  globalThis.document = {
    createElement: name => {
      assert.equal(name,'canvas')
      return {
        width: 0, height: 0,
        getContext() {
          return {
            fillStyle: '', font: '',
            fillRect() {}, fillText() {},
            measureText(value) { return { width: String(value).length * 15 } },
          }
        },
        toDataURL() {
          pages++
          return 'data:image/jpeg;base64,' + Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64')
        },
      }
    },
  }
  globalThis.atob = source => Buffer.from(source,'base64').toString('binary')
  try {
    const pdf = await generatePractitionerReportPdf({
      title:'Персональный анализ У-Син',
      occurredOn:'2026-10-11',
      kind:'research_result',
      description:'Личный ресурс',
      originalResult:'Вода • Дерево • Огонь • Земля • Металл',
      practitionerComment:'Рекомендации для размышления',
    },'ru')
    assert.equal(pdf.type,'application/pdf')
    assert.ok(pages>=1)
    const bytes=Buffer.from(await pdf.arrayBuffer())
    assert.equal(bytes.subarray(0,8).toString('ascii'),'%PDF-1.4')
    assert.match(bytes.toString('latin1'),/\/Type \/Pages/)
  } finally {
    globalThis.document = originalDocument
    globalThis.atob = originalAtob
  }
})

test('Personal Analysis titles use verified current report sources without marking them read', async () => {
  const [api, flow, panel, oldCabinet, pdf] = await Promise.all([
    src('app/api/app/[...path]/route.js'),
    src('lib/app/report-flow.js'),
    src('components/app/personal-analysis-panel.jsx'),
    src('components/client-cabinet.jsx'),
    src('app/api/client/[selector]/documents/[id]/pdf/route.js'),
  ])
  assert.match(api, /joined === 'personal-analysis-reports'/)
  assert.match(api, /listPersonalAnalysisReports\(config, getPrescriptionStore\(\), actor\)/)
  assert.match(flow, /export async function listPersonalAnalysisReports/)
  const start = flow.indexOf('export async function listPersonalAnalysisReports')
  const end = flow.indexOf('export async function readSavedReport', start)
  const section = flow.slice(start, end)
  assert.ok(start >= 0 && end > start)
  assert.match(section, /where s\.account_id=\$1 and s\.removed_at is null/)
  assert.match(section, /\[actor\.id\]/)
  assert.match(section, /await liveSource\(store, row\)/)
  assert.match(section, /available: true, title: report\.title, kind: report\.kind/)
  assert.doesNotMatch(section, /update app\.saved_reports set opened_at/i)
  assert.doesNotMatch(section, /originalResult|practitionerComment|relatedDocumentIds/)
  assert.match(panel, /fetch\('\/api\/app\/personal-analysis-reports'/)
  assert.match(panel, /credentials: 'same-origin'/)
  assert.match(panel, /verified \?\? reports/)
  assert.match(panel, /item\.legacy \? t\.legacy/)
  // The old document store cannot render kind=report: never show 404 view/PDF links.
  assert.match(pdf, /access\.record\.kind === 'report'/)
  assert.match(oldCabinet, /document\.type === 'report' \? <span/)
  assert.match(oldCabinet, /Старый отчёт · попросите новую ссылку/)
  assert.match(panel, /https:\/\/t\.me\/AndyTherapist/)
})


test('Profile composition rejects genuine missing, detached, disabled and misbound source readers', async () => {
  const source = await src('components/app/app-workspace.jsx')
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
  const source = await src('components/app/app-workspace.jsx')
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
