// Execute the actual source under a closed synthetic dependency boundary.
// AST selection must identify exactly one node; a missing/moved contract fails
// rather than accidentally testing an empty source slice or another function.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

export function sourceNode(path, predicate, label) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const found = []
  const visit = node => { if (predicate(node, source)) found.push(node); ts.forEachChild(node, visit) }
  visit(source)
  assert.equal(found.length, 1, `Exactly one ${label} must exist in ${path}`)
  return found[0]
}

export function sourceFunction(path, name, bindings = {}) {
  const node = sourceNode(path, node => ts.isFunctionDeclaration(node) && node.name?.text === name, name)
  return runInNewContext('(' + node.getText().replace(/^export\s+(?:default\s+)?/, '') + ')', bindings)
}

export function sourceEffect(path, setter, bindings = {}) {
  const node = sourceNode(path, node => ts.isCallExpression(node) && node.expression.getText() === 'useEffect' &&
    node.arguments[0]?.getText().includes(setter + '('), `effect calling ${setter}`)
  return runInNewContext('(' + node.arguments[0].getText() + ')', bindings)
}

export function sourceModule(path, modules) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    fileName: path, compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    },
  }).outputText
  const compiledModule = { exports: {} }
  runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: name => {
    assert.ok(Object.hasOwn(modules, name), `Unmocked dependency ${name} in ${path}`)
    return modules[name]
  } })
  return compiledModule.exports
}
