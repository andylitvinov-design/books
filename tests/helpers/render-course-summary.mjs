// Render the actual client component with synthetic data. The test parent uses
// react-server conditions; this separate ordinary Node process supports SSR.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../../components/app/course-completion-review.jsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
} })
const compiledModule = { exports: {} }
const testRequire = name => {
  if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
  if (name === 'next/link') return function LinkFixture({ children, ...props }) {
    delete props.prefetch
    return React.createElement('a', props, children)
  }
  return require(name)
}
new Function('require', 'module', 'exports', compiled.outputText)(testRequire, compiledModule, compiledModule.exports)
const { profile, locale } = JSON.parse(readFileSync(0, 'utf8'))
const t = new Proxy({
  completed: 'Completed',
  noMedical: locale === 'ru' ? 'Для обучения и самонаблюдения, не диагноз и не замена психотерапии.' : 'For education and self-observation; not diagnosis or psychotherapy.',
}, { get: (object, key) => object[key] ?? String(key) })
const keys = [...new Set(profile.scales.map(scale => scale.testKey))]
process.stdout.write(renderToStaticMarkup(React.createElement(compiledModule.exports.default, {
  t, root: '/'+locale+'/app', profile, suggested: [],
  confirmedStatuses: keys.map(key => ({ key, resultId: 'synthetic-result' })),
  optionByKey: new Map(keys.map(key => [key, { title: key }])),
  onSuggested: () => {}, onAlternative: () => {},
})))
