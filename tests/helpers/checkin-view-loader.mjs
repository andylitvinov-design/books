import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import React from 'react'
import ts from 'typescript'

export const testRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const modelRoot = resolve(process.env.CHECKIN_MODEL_ROOT || testRoot)
const require = createRequire(import.meta.url)
export const fromModel = path => import(pathToFileURL(resolve(modelRoot, path)))
const [definitions, history, guidance, screening, monitoring, checkins, copy, cabinet] = await Promise.all([
  fromModel('lib/assessments/definitions.js'), fromModel('lib/profile/history.js'),
  fromModel('lib/assessments/personal-guidance.js'), fromModel('lib/profile/profile-scale-presentation.js'),
  fromModel('lib/assessments/monitoring.js'), fromModel('lib/assessments/checkin-result-analysis.js'),
  fromModel('components/app/copy.js'), fromModel('lib/app/cabinet-ux.js'),
])
export const paths = { workspace: 'components/app/app-workspace.jsx', monitoring: 'components/app/psi-monitoring.jsx' }
export const names = {
  workspace: ['message', 'dateLabel', 'localZone', 'profileNumber', 'profileDelta', 'readableScaleName', 'ProfileOverview', 'HistoryView', 'ContextForm'],
  monitoring: ['UI', 'monitoringFetch', 'statusReason', 'dateLabel', 'itemDefinition', 'ItemActions', 'MonitoringItem', 'InstrumentTrend'],
}
export const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(resolve(modelRoot, path), 'utf8')]))
export const digest = value => createHash('sha256').update(value).digest('hex')
export function extract(source, wanted, filename = 'view.jsx') {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  assert.equal(tree.parseDiagnostics.length, 0, filename + ' must parse')
  const entries = new Map()
  for (const node of tree.statements) {
    if (ts.isFunctionDeclaration(node) && node.name && wanted.includes(node.name.text)) {
      assert.ok(!entries.has(node.name.text), 'Duplicate function: ' + node.name.text)
      entries.set(node.name.text, node.getText(tree))
    }
    if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && wanted.includes(declaration.name.text)) {
        assert.equal(node.declarationList.declarations.length, 1, 'Extract only an independent declaration')
        assert.ok(!entries.has(declaration.name.text), 'Duplicate declaration')
        entries.set(declaration.name.text, node.getText(tree))
      }
    }
  }
  assert.deepEqual([...entries.keys()].sort(), [...wanted].sort(), 'Every requested real declaration must exist exactly once')
  return Object.fromEntries(wanted.map(name => [name, entries.get(name)]))
}
export const current = Object.fromEntries(Object.keys(paths).map(key => [key, extract(sources[key], names[key], paths[key])]))
export function hookNames(source) {
  const tree = ts.createSourceFile('view.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const found = []
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(tree) === 'useState') found.push(node.name.elements[0].name.getText(tree))
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}
export function assertClientDirective(source) {
  const tree = ts.createSourceFile('view.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const first = tree.statements[0]
  assert.ok(ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use client', 'use client must remain a directive before imports')
}
const forbiddenEffect = () => { throw new Error('The render test must not perform a mutation or network request') }
const compiledSources = new Map()
export function compileView(kind, selectedKey = null, bundle = current[kind]) {
  let hookIndex = 0
  const main = kind === 'workspace' ? 'HistoryView' : 'InstrumentTrend'
  const expected = kind === 'workspace' ? ['latestId', 'priorId', 'dimensionKey', 'error'] : ['range', 'dimensionKey', 'fromId', 'toId']
  assert.deepEqual(hookNames(bundle[main]), expected, 'Selection must address the named actual state slot')
  const selectionIndex = expected.indexOf('dimensionKey')
  // Real React hooks render the unmodified function. Only the chosen initial
  // state simulates selecting a facet; no scoring or comparison is substituted.
  const useState = initial => React.useState(hookIndex++ === selectionIndex && selectedKey !== null ? selectedKey : initial)
  const dependencies = {
    ...definitions, ...history, ...guidance, ...screening, ...monitoring, ...checkins, ...copy, ...cabinet,
    useState, Link: require('next/link').default, appFetch: forbiddenEffect, fetch: forbiddenEffect, exports: {},
    require: name => { assert.equal(name, 'react/jsx-runtime'); return require(name) },
  }
  const source = Object.values(bundle).join('\n\n') + '\nreturn { ' + names[kind].join(', ') + ' }'
  if (!compiledSources.has(source)) {
    const { outputText, diagnostics } = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } })
    assert.equal(diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0)
    compiledSources.set(source, outputText)
  }
  const outputText = compiledSources.get(source)
  return new Function(...Object.keys(dependencies), outputText)(...Object.values(dependencies))
}
