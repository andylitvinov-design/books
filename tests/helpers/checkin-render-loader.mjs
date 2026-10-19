// Only CSS module names are substituted. Components, React, Next Link, scorer,
// source verification and all report/gauge models are the real implementation.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

export const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const modelRoot = resolve(process.env.CHECKIN_MODEL_ROOT || uiRoot)
export const baseRoot = resolve(process.env.CHECKIN_BASE_ROOT || modelRoot)
const require = createRequire(import.meta.url)
const namespaces = new Map()
const modelNames = [
  'result-report', 'scale-guides', 'dashboard-gauges', 'score-change-reading',
  'assessment-evidence-status', 'result-overview',
]
for (const name of modelNames) {
  namespaces.set('@/lib/assessments/' + name, await import(pathToFileURL(resolve(modelRoot, 'lib/assessments/' + name + '.js'))))
}
export function componentLoader(overrides = {}) {
  const cache = new Map()
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports
    const path = [uiRoot, modelRoot, baseRoot].map(root => resolve(root, relative)).find(existsSync)
    if (!path) throw new Error('Missing exact component: ' + relative)
    const source = overrides[relative] ?? readFileSync(path, 'utf8')
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020, esModuleInterop: true,
    } })
    const module = { exports: {} }
    cache.set(relative, module)
    const componentRequire = name => {
      if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
      if (namespaces.has(name)) return namespaces.get(name)
      if (name.startsWith('.')) return load(resolve(dirname('/' + relative), name).slice(1) + (name.endsWith('.jsx') ? '' : '.jsx'))
      return require(name)
    }
    new Function('require', 'module', 'exports', outputText)(componentRequire, module, module.exports)
    return module.exports
  }
  return load
}
