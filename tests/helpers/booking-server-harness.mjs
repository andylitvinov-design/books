import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { posix } from 'node:path'
import ts from 'typescript'

// Only these five real server modules cross the unit-test module boundary.
// Production server-only imports stay untouched. Every direct import is explicit;
// pure dependencies remain real, while the sole DB transport and default fetch
// fail closed. This fixture never reads deployment environment or credentials.
const contracts = {
  "lib/app/repository.js": [
    "./result-interpretations.js",
    "server-only",
    "../practitioners/remote-energy-support.js",
    "../practitioners/client-messages.js",
    "../../data/assessments/catalog.js",
    "node:crypto",
    "../assessments/contracts.js",
    "../assessments/definitions.js",
    "../assessments/trauma-administration.js",
    "../assessments/scoring.js",
    "../assessments/safety.js",
    "../profile/history.js",
    "./database.js",
    "../clients/delivery-model.js",
    "./crypto.js",
    "../../data/app-services.js",
    "./practitioner-access.js",
    "./mood.js",
    "./test-plans.js"
  ],
  "lib/app/result-interpretations.js": [
    "server-only",
    "../assessments/interpretation-record-integrity.js",
    "../assessments/interpretation-storage.js",
    "../assessments/interpretation-resolution.js"
  ],
  "lib/app/practitioner-access.js": [
    "server-only",
    "node:crypto"
  ],
  "lib/practitioners/client-messages.js": [
    "server-only",
    "../app/database.js",
    "../app/crypto.js",
    "../assessments/contracts.js",
    "../crm/messenger-policy.js",
    "./relay-privacy.mjs",
    "../crm/messenger-pagination.js",
    "./conversation-policy.js"
  ],
  "lib/practitioners/booking-master-email.js": [
    "server-only",
    "../../data/app-services.js"
  ]
}
const root = new URL('../../', import.meta.url)

export function createBookingServerHarness({ sourceOverrides = {} } = {}) {
  for (const path of Object.keys(sourceOverrides))
    assert.ok(Object.hasOwn(contracts, path), 'Unexpected fixture module: ' + path)
  const cache = new Map()
  const blocked = { database: 0, fetch: 0 }
  const database = Object.freeze({ transaction() {
    blocked.database++
    throw new Error('Synthetic booking transaction must be explicitly injected')
  } })
  const noFetch = () => {
    blocked.fetch++
    throw new Error('Synthetic booking fetch must be explicitly injected')
  }
  async function load(path) {
    assert.ok(Object.hasOwn(contracts, path), 'Unexpected fixture module: ' + path)
    if (cache.has(path)) return cache.get(path)
    const source = sourceOverrides[path] ?? readFileSync(new URL(path, root), 'utf8')
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    assert.equal(file.parseDiagnostics.length, 0, 'Invalid booking fixture source: ' + path)
    const imports = file.statements.filter(ts.isImportDeclaration)
    assert.deepEqual(imports.map(node => node.moduleSpecifier.text), contracts[path],
      'Unexpected booking fixture import contract: ' + path)
    const marker = imports.filter(node => node.moduleSpecifier.text === 'server-only')
    assert.equal(marker.length, 1, 'Production server-only guard must remain: ' + path)
    assert.equal(marker[0].importClause, undefined, 'server-only must be a side-effect marker')
    function validate(node) {
      assert.ok(!(ts.isExportDeclaration(node) && node.moduleSpecifier),
        'Re-export requires an explicit booking adapter')
      assert.ok(!(ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))),
      'Dynamic module loading is forbidden in booking fixture')
      ts.forEachChild(node, validate)
    }
    validate(file)
    const dependencies = Object.create(null)
    for (const node of imports) {
      const name = node.moduleSpecifier.text
      let dependency
      if (name === 'server-only') dependency = Object.freeze({})
      else {
        const target = name.startsWith('node:') ? name : posix.normalize(posix.join(posix.dirname(path), name))
        dependency = target === 'lib/app/database.js' ? database : Object.hasOwn(contracts, target)
          ? await load(target) : await import(target.startsWith('node:') ? target : new URL(target, root).href)
      }
      const clause = node.importClause
      if (clause?.name) assert.ok('default' in dependency, 'Missing default fixture binding: ' + name)
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const item of clause.namedBindings.elements)
          assert.ok((item.propertyName?.text ?? item.name.text) in dependency,
            'Missing named fixture binding: ' + name + '/' + item.name.text)
      }
      dependencies[name] = dependency
    }
    const module = { exports: {} }
    const compiled = ts.transpileModule(source, { fileName: path, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText
    new Function('require', 'module', 'exports', 'fetch', 'process', compiled)(name => {
      assert.ok(Object.hasOwn(dependencies, name), 'Unexpected booking fixture require: ' + name)
      return dependencies[name]
    }, module, module.exports, noFetch, Object.freeze({ env: Object.freeze({}) }))
    cache.set(path, module.exports)
    return module.exports
  }
  return { load, blocked }
}
