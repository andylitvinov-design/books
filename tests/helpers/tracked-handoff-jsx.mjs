import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transpileModule, JsxEmit, ModuleKind, ScriptTarget } from 'typescript'

export const readSource = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const jsx = (type, props) => ({ type, props: props || {} })
export const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : []
export const text = tree => Array.isArray(tree) ? tree.map(text).join('') : tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? text(tree.props?.children) : String(tree)

// Actual JSX under test, with explicit offline dependencies. Opaque child UI is
// not rendered or claimed to be browser evidence. Effects are not run implicitly.
export function loadJsx(path, { source = readSource(path), modules = {}, states = [], globals = {} } = {}) {
  let index = 0
  const effects = [], writes = []
  const react = {
    useState(initial) { const slot = index++; return [slot < states.length ? states[slot] : typeof initial === 'function' ? initial() : initial,
      value => writes.push({ slot, value })] },
    useEffect(effect) { effects.push(effect) }, useMemo: factory => factory(),
  }
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, react,
    'next/link': { default: 'a' }, 'next/image': { default: 'img' },
    'lucide-react': new Proxy({}, { get: (_, name) => 'icon:' + String(name) }),
    ...modules,
  }
  const exports = {}
  const result = transpileModule(source, { compilerOptions: {
    jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS, target: ScriptTarget.ES2022,
  }, fileName: path })
  runInNewContext(result.outputText, { exports, ...globals, require(name) {
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) }
    assert.ok(Object.hasOwn(imports, name), 'Unexpected dependency: ' + name)
    return imports[name]
  } }, { timeout: 2000 })
  return { exports, effects, writes }
}
