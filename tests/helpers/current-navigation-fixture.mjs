// Execute real JSX declarations and handlers with deterministic hooks only.
// No React/browser/backend acceptance is implied; every external boundary fails closed.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

export const blocked = () => { throw new Error('External operation is forbidden in this fixture') }
export const element = (type, props) => {
  assert.ok(typeof type === 'string' || typeof type === 'function', 'Undefined JSX component')
  return { type, props: props || {} }
}
export const icons = names => Object.fromEntries(names.split(' ').map(name => [name, 'icon-' + name]))
export const css = { default: new Proxy({}, { get: (_, name) => String(name) }) }
export const link = { default: 'a' }

export function sourceFixture(globals = {}) {
  let current
  const externalCalls = []
  function denyExternal(reason = 'external operation') { externalCalls.push(reason); return blocked() }
  const forbiddenModule = names => Object.freeze(Object.defineProperties({}, Object.fromEntries(names.map(name => [name, { enumerable: true, get: () => denyExternal('forbidden export: ' + name) }]))))
  const hooks = {
    useCallback: () => denyExternal('unused useCallback'),
    useMemo: () => denyExternal('unused useMemo'),
    useRef(initial) {
      assert.ok(current, 'Hook outside rendered component')
      const index = current.index++
      if (!current.slots[index]) current.slots[index] = { current: initial }
      return current.slots[index]
    },
    useState(initial) {
      assert.ok(current, 'Hook outside rendered component')
      const state = current, index = state.index++
      if (!state.slots[index]) state.slots[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [state.slots[index].value, value => {
        const next = typeof value === 'function' ? value(state.slots[index].value) : value
        if (!Object.is(next, state.slots[index].value)) { state.slots[index].value = next; state.dirty = true }
      }]
    },
    useEffect(effect, deps) {
      const state = current, index = state.index++, previous = state.slots[index]
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        state.slots[index] = { deps }
        state.effects.push(effect)
      }
    },
  }
  function load(source, filename, imports, { exports: expectedExports, expose = [] } = {}) {
    assert.ok(Array.isArray(expectedExports), 'Declare the exact allowed module exports')
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    assert.equal(ast.parseDiagnostics.length, 0, filename + ' must parse')
    for (const name of expose) {
      assert.equal(ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name).length, 1,
        'Expose exactly one genuine declaration: ' + name)
    }
    const supplied = { ...imports, react: hooks, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' } }
    for (const node of ast.statements) {
      if (ts.isImportEqualsDeclaration(node)) assert.fail('Import-equals is not supported')
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) assert.fail('Re-exports and export assignments are not supported')
      if (!ts.isImportDeclaration(node)) continue
      const id = node.moduleSpecifier.text
      assert.ok(Object.hasOwn(supplied, id), 'Unexpected static import: ' + id)
      const names = []
      if (node.importClause?.name) names.push('default')
      const named = node.importClause?.namedBindings
      if (named) {
        assert.ok(ts.isNamedImports(named), 'Namespace imports require explicit fixture support')
        for (const entry of named.elements) names.push((entry.propertyName || entry.name).text)
      }
      for (const name of names) assert.ok(Object.hasOwn(supplied[id], name), 'Unexpected import export: ' + id + ':' + name)
    }
    const sourceExports = ast.statements.flatMap(node => {
      if (!node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) return []
      if (node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) return ['default']
      if (ts.isFunctionDeclaration(node)) return [node.name.text]
      if (ts.isVariableStatement(node)) return node.declarationList.declarations.map(declaration => declaration.name.getText(ast))
      assert.fail('Unsupported exported declaration: ' + node.getText(ast))
    })
    assert.deepEqual(sourceExports.sort(), [...expectedExports].sort(), 'Exact static exported declarations')
    const compiled = ts.transpileModule(source + '\n' + expose.map(name => `export { ${name} };`).join('\n'), {
      fileName: filename, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const dependencies = Object.fromEntries(Object.entries(supplied).map(([id, values]) => {
      const mapped = {}
      for (const name of Object.keys(values)) {
        const descriptor = Object.getOwnPropertyDescriptor(values, name)
        Object.defineProperty(mapped, name, descriptor.get ? descriptor : { enumerable: true, value: descriptor.value === blocked ? () => denyExternal(id + ':' + name) : descriptor.value })
      }
      return [id, new Proxy(mapped, { get(target, name) {
        if (!Object.hasOwn(target, name)) return denyExternal('unknown export: ' + id + ':' + String(name))
        return target[name]
      } })]
    }))
    const module = { exports: {} }
    vm.runInNewContext(compiled, {
      ...globals, module, exports: module.exports,
      require: name => { if (!Object.hasOwn(dependencies, name)) return denyExternal('unknown import: ' + name); return dependencies[name] },
      fetch: denyExternal, XMLHttpRequest: denyExternal, WebSocket: denyExternal,
    }, { filename, timeout: 5000 })
    assert.deepEqual(Object.keys(module.exports).sort(), [...expectedExports, ...expose].sort(), 'Exact evaluated module exports')
    return module.exports
  }
  function mount(Component, props) {
    const state = { slots: [], dirty: true, index: 0, effects: [], tree: null }
    function flush() {
      for (let count = 0; state.dirty; count++) {
        assert.ok(count < 20, 'Unbounded render loop')
        state.dirty = false; state.index = 0; state.effects = []
        current = state
        try { state.tree = Component(props) } finally { current = undefined }
        for (const effect of state.effects) effect()
      }
    }
    flush()
    return {
      nodes() { flush(); return nodes(state.tree) },
      one(predicate) { const found = this.nodes().filter(predicate); assert.equal(found.length, 1); return found[0] },
      click(predicate) { const node = this.one(predicate); assert.equal(typeof node.props.onClick, 'function'); node.props.onClick(); flush() },
    }
  }
  return { load, mount, forbiddenModule, assertNoExternalOperations() { assert.deepEqual(externalCalls, []) } }
}

export function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return []
  return [tree, ...nodes(tree.props.children)]
}
export function textContent(tree) {
  if (Array.isArray(tree)) return tree.map(textContent).join('')
  if (tree == null || typeof tree === 'boolean') return ''
  return typeof tree === 'object' ? textContent(tree.props.children) : String(tree)
}

function jsxAttribute(node, name, ast) {
  const attribute = node.attributes.properties.find(value => value.name?.getText(ast) === name)
  return attribute?.initializer && (ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression?.getText(ast) : attribute.initializer.text)
}

export function assertVoicesBinding(source) {
  const ast = ts.createSourceFile('learner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const bindings = []
  const walk = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'MeditationVoices') bindings.push(node)
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.equal(bindings.length, 1, 'Exactly one production MeditationVoices binding')
  const node = bindings[0], branch = node.parent
  assert.ok(ts.isConditionalExpression(branch) && branch.whenTrue === node, 'Voices must be conditional')
  assert.equal(branch.condition.getText(ast), 'slide.kind === "voices"')
  assert.equal(branch.whenFalse.getText(ast), 'null')
  assert.ok(ts.isJsxExpression(branch.parent) && branch.parent.expression === branch, 'Voices conditional is a direct JSX child, not disabled or detached')
  let ancestor = branch.parent.parent
  for (const [tag, className] of [['div', 'styles.content'], ['div', 'styles.slideMain'], ['section', null], ['div', 'styles.shell'], ['main', 'styles.page']]) {
    assert.ok(ts.isJsxElement(ancestor), 'Voices render path must stay directly in the live learner tree')
    assert.equal(ancestor.openingElement.tagName.getText(ast), tag)
    if (className) assert.equal(jsxAttribute(ancestor.openingElement, 'className', ast), className)
    ancestor = ancestor.parent
  }
  while (ts.isParenthesizedExpression(ancestor)) ancestor = ancestor.parent
  assert.ok(ts.isReturnStatement(ancestor), 'Voices tree is the learner return value')
  const owner = ancestor.parent.parent
  assert.ok(ts.isFunctionDeclaration(owner) && owner.name.text === 'EnergyworkAiLearner')
  assert.equal(owner.body.statements.at(-1), ancestor, 'Voices belongs to the final production return')
  assert.deepEqual(owner.body.statements.filter(ts.isReturnStatement), [ancestor], 'No preceding unconditional return')
  const attrs = Object.fromEntries(node.attributes.properties.map(attribute => [attribute.name?.getText(ast), attribute.initializer?.expression?.getText(ast)]))
  assert.deepEqual(attrs, { key: 'slide.id', slide: 'slide', locale: 'locale' })
}

export function accountNavigation(source, bindings) {
  const ast = ts.createSourceFile('workspace.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations = []
  const walk = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'nav') declarations.push(node)
    ts.forEachChild(node, walk)
  }
  walk(ast)
  assert.equal(declarations.length, 1, 'One genuine shared account navigation model')
  const declaration = declarations[0]
  assert.ok(ts.isArrayLiteralExpression(declaration.initializer))
  let owner = declaration.parent
  while (owner && !ts.isFunctionDeclaration(owner)) owner = owner.parent
  assert.equal(owner?.name?.text, 'AppWorkspace')
  const entries = JSON.parse(JSON.stringify(vm.runInNewContext('(' + declaration.initializer.getText(ast) + ')', bindings, { timeout: 5000 })))
  const consumers = []
  const findConsumers = node => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'nav.map') consumers.push(node)
    ts.forEachChild(node, findConsumers)
  }
  findConsumers(owner.body)
  assert.equal(consumers.length, 3, 'Exactly three live shared navigation consumers')
  const found = []
  for (const consumer of consumers) {
    assert.ok(ts.isJsxExpression(consumer.parent) && consumer.parent.expression === consumer, 'Navigation map is a direct rendered child')
    const callback = consumer.arguments[0]
    assert.ok(ts.isArrowFunction(callback) && callback.parameters.length === 1)
    let rendered = callback.body
    while (ts.isParenthesizedExpression(rendered)) rendered = rendered.expression
    assert.ok(ts.isJsxElement(rendered) && rendered.openingElement.tagName.getText(ast) === 'Link')
    assert.equal(jsxAttribute(rendered.openingElement, 'key', ast), 'id')
    let container = consumer.parent.parent
    assert.ok(ts.isJsxElement(container))
    if (container.openingElement.tagName.getText(ast) === 'div') container = container.parent
    assert.ok(ts.isJsxElement(container))
    const className = jsxAttribute(container.openingElement, 'className', ast)
    assert.ok(['hh-account-menu', 'hh-nav', 'hh-mobile-app-nav'].includes(className))
    found.push(className)
    let root = container
    while (root.parent !== owner.body) root = root.parent
    assert.ok(ts.isReturnStatement(root) && root === owner.body.statements.at(-1), 'Menu is in the final account render')
    const compiled = ts.transpileModule('module.exports = (' + callback.getText(ast) + ');', {
      fileName: 'consumer.jsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const module = { exports: {} }
    vm.runInNewContext(compiled, { ...bindings, module, exports: module.exports, Link: 'a', navIsActive: id => id === 'course',
      require: name => { assert.equal(name, 'react/jsx-runtime'); return { jsx: element, jsxs: element } },
    }, { timeout: 5000 })
    for (const entry of entries) {
      const renderedEntry = module.exports(entry)
      assert.equal(renderedEntry.type, 'a', className)
      assert.equal(renderedEntry.props.href, entry.href, className + ' binds actual href')
      assert.equal(renderedEntry.props.prefetch, false, className)
      assert.equal(renderedEntry.props['aria-current'], entry.id === 'course' ? 'page' : undefined, className)
      assert.equal(textContent(renderedEntry), entry.label, className + ' binds actual label')
    }
  }
  assert.deepEqual(found.sort(), ['hh-account-menu', 'hh-mobile-app-nav', 'hh-nav'])
  return entries
}
