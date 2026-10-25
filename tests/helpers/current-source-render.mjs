// Offline source-contract evaluation only. No DOM, browser, account or transport.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
export const element = (type, props) => {
  assert.ok(typeof type === 'string' || typeof type === 'function', 'Undefined JSX component')
  return {type, props: props || {}}
}
export const jsx = {jsx: element, jsxs: element, Fragment: 'fragment'}
export const denied = () => {throw new Error('External operation forbidden by source-contract fixture')}
export function parse(source, filename = 'component.tsx') {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(file.parseDiagnostics.length, 0, filename + ' must parse')
  return file
}
export function descendants(node) {
  const result = []
  const visit = value => {result.push(value); ts.forEachChild(value, visit)}
  visit(node)
  return result
}
export function returnedSource(source, name) {
  const file = parse(source)
  const owners = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(owners.length, 1, 'Exactly one actual ' + name)
  const body = owners[0].body
  const returned = body.statements.at(-1)
  assert.ok(ts.isReturnStatement(returned), 'Inspect the actual final returned tree')
  assert.equal(body.statements.filter(ts.isReturnStatement).length, 1, 'No preceding unconditional return')
  return {file, owner: owners[0], returned, nodes: descendants(returned.expression)}
}
export const opening = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
export const attribute = (node, name) => opening(node)?.attributes.properties.find(value => value.name?.getText() === name)
export function attributeText(node, name, file) {
  const init = attribute(node, name)?.initializer
  return init && (ts.isJsxExpression(init) ? init.expression?.getText(file) : init.text)
}
export function sourceModule(source, filename, modules = {}, globals = {}) {
  parse(source, filename)
  const module = {exports: {}}
  const code = ts.transpileModule(source, {fileName: filename, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText
  vm.runInNewContext(code, {module, exports: module.exports, ...globals,
    fetch: denied, XMLHttpRequest: denied, WebSocket: denied,
    require: name => {assert.ok(Object.hasOwn(modules, name), 'Unapproved dependency ' + name); return modules[name]},
  }, {filename, timeout: 5000})
  return module.exports
}
export function expression(node, file, bindings) {
  return sourceModule('export const value = (' + node.getText(file) + ');', 'expression.tsx', {'react/jsx-runtime': jsx}, bindings).value
}
export function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return []
  return [tree, ...nodes(tree.props.children)]
}
export function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('')
  if (tree == null || typeof tree === 'boolean') return ''
  return typeof tree === 'object' ? text(tree.props.children) : String(tree)
}
export {ts}
