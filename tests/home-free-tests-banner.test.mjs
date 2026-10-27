import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const home = read('components/holistic-house-home.tsx')
const spanishHome = read('app/es/page.tsx')
const journeys = read('components/homepage-topic-journeys.tsx')

// Render the retained topic component instead of assuming the name of its backing array.
const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} }
const nodes = tree => !tree || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)]
function topicJourneys(locale) {
  const compiled = ts.transpileModule(journeys, { fileName: 'homepage-topic-journeys.tsx', compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'next/image': { default: props => jsx('img', props) },
    'lucide-react': { ArrowUpRight: () => null },
    './homepage-topic-journeys.module.css': { default: {} },
  }
  const exports = {}
  runInNewContext(compiled, { exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Known static topic dependency: ' + name)
    return modules[name]
  } })
  return exports.HomepageTopicJourneys({ locale })
}


// Inspect the reviewed homepage composition, not only literal JSX in its page shells.
// Binding aliases cannot hide the known lower-card module or named export.
function assertNoLowerTopicCards(source, fileName) {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const isTopicModule = node => node && ts.isStringLiteralLike(node)
    && /(?:^|\/)homepage-topic-journeys(?:\.[cm]?[jt]sx?)?$/.test(node.text)
  const fail = detail => assert.fail(fileName + ': compact filters replace duplicated lower topic cards (' + detail + ')')
  const visit = node => {
    const namedImports = ts.isImportDeclaration(node) && node.importClause?.namedBindings
    if (namedImports && !node.importClause.name && ts.isNamedImports(namedImports)
      && namedImports.elements.length > 0 && namedImports.elements.every(binding => binding.isTypeOnly)) return
    const namedExports = ts.isExportDeclaration(node) && node.exportClause
    if (namedExports && ts.isNamedExports(namedExports)
      && namedExports.elements.length > 0 && namedExports.elements.every(binding => binding.isTypeOnly)) return
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      if (isTopicModule(node.moduleSpecifier)) fail('known module import')
      const bindings = node.importClause?.namedBindings
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some(binding =>
        !binding.isTypeOnly && (binding.propertyName || binding.name).text === 'HomepageTopicJourneys')) {
        fail('known export import, including aliases')
      }
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly) {
      if (isTopicModule(node.moduleSpecifier)) fail('known module re-export')
      if (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.some(binding =>
        !binding.isTypeOnly && (binding.propertyName || binding.name).text === 'HomepageTopicJourneys')) {
        fail('known component re-export, including aliases')
      }
    }
    if (ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      && isTopicModule(node.arguments[0])) fail('known module dynamic import')
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && /(?:^|\.)HomepageTopicJourneys$/.test(node.tagName.getText(ast))) fail('known component JSX')
    ts.forEachChild(node, visit)
  }
  visit(ast)
}

// The owner explicitly removed the obsolete blue marketing block.
// Keep this regression guard so future homepage redesigns cannot revive it.
test('broken legacy free-test promo is absent from all home locales and source', () => {
  for (const page of [home, spanishHome]) {
    assert.doesNotMatch(page, /HomeFreeTestsBanner|home-free-tests-banner|data-home-free-tests-banner/)
  }
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.tsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/home-free-tests-banner.module.css', import.meta.url)), false)
})

test('free courses and tests live in the seven steps; lower topics are compact filters', () => {
  const feature = read('components/home-featured-workspace.tsx')
  const filters = read('components/home-more-disclosure.tsx')
  assert.match(feature, /"courses": \{/)
  assert.match(feature, /"personality": \{/)
  assert.match(feature, /"allTests":/)
  assert.match(feature, /"opora":/)
  assert.match(journeys, /id="hh-topic-journeys"/)
  for (const locale of ['en', 'ru', 'es']) {
    const tree = topicJourneys(locale)
    assert.equal(nodes(tree).filter(node => node.props.id === 'hh-topic-journeys').length, 1)
    const cards = nodes(tree).filter(node => node.props['data-topic-id'])
    assert.deepEqual(cards.map(card => card.props['data-topic-id']), ['energy', 'relationships', 'business'])
    for (const [index, card] of cards.entries()) {
      const links = nodes(card).filter(node => node.type === 'a')
      assert.equal(links.length, 1, 'One usable route per retained direction')
      assert.equal(links[0].props.href, '/' + locale + '/explore/' + ['energy', 'love', 'business'][index])
      assert.equal(links[0].props.prefetch, false)
    }
  }
  for (const [fileName, source] of [
    ['components/holistic-house-home.tsx', home],
    ['app/es/page.tsx', spanishHome],
    ['components/home-featured-workspace.tsx', feature],
    ['components/home-more-disclosure.tsx', filters],
  ]) {
    assertNoLowerTopicCards(source, fileName)
  }
  assert.match(filters, /data-home-topic-filter="love"/)
  assert.match(filters, /data-home-topic-filter="business"/)
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/)
});
