import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const fixturePrefix = '/__hh-test__/service-cart/'
export const fixtureBundlePath = `${fixturePrefix}fixture.js`
const fixtureDirectory = fileURLToPath(new URL('./fixtures/', import.meta.url))
const projectDirectory = fileURLToPath(new URL('../', import.meta.url))
const productionInputs = [
  'components/commerce/service-cart.tsx',
  'components/commerce/service-cart.module.css',
  'lib/commerce/catalog.js',
  'lib/commerce/cart.js',
  'lib/commerce/client-account.js',
  'lib/assessments/contracts.js',
]

export function fixturePath(locale) {
  assert.ok(['en', 'ru', 'es'].includes(locale), 'Unsupported service-cart fixture locale')
  return fixturePrefix + locale
}

const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function fixtureDocument(locale, { stylesheets, htmlClass = '', bodyClass = '' }) {
  fixturePath(locale)
  assert.ok(stylesheets?.length, 'Real public production stylesheets are required; no substitute fixture styling')
  for (const href of stylesheets) {
    assert.match(href, /^\/_next\/static\/css\/[^?#]+\.css(?:\?[^#]*)?$/, 'Only same-origin production CSS may style the fixture')
  }
  return `<!doctype html><html lang="${locale}" class="${escapeAttribute(htmlClass)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated ServiceCart browser test</title>${stylesheets.map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`).join('')}</head><body class="${escapeAttribute(bodyClass)}" data-service-cart-browser-fixture><div id="service-cart-fixture-root"></div><script src="${fixtureBundlePath}" defer></script></body></html>`
}

// This creates bytes for Playwright route.fulfill only: no Next route, server,
// public asset, runtime component change, installation or external dependency.
// All tooling is supplied by the repository's existing npm ci dependencies.
export async function buildServiceCartFixture({ projectRoot = projectDirectory } = {}) {
  const root = resolve(projectRoot)
  const projectRequire = createRequire(join(root, 'package.json'))
  let webpack, trace, cssLoader, styleLoader, postcss, getLocalIdent
  try {
    const bundled = projectRequire('next/dist/compiled/webpack/webpack')
    bundled.init()
    webpack = bundled.webpack
    trace = projectRequire('next/dist/trace').trace
    cssLoader = projectRequire.resolve('next/dist/build/webpack/loaders/css-loader/src')
    styleLoader = projectRequire.resolve('next/dist/build/webpack/loaders/next-style-loader')
    getLocalIdent = projectRequire('next/dist/build/webpack/config/blocks/css/loaders/getCssModuleLocalIdent').getCssModuleLocalIdent
    postcss = projectRequire('postcss')
    projectRequire.resolve('typescript')
    assert.equal(typeof webpack, 'function')
  } catch (cause) {
    throw new Error('Service-cart fixture requires the repository npm ci toolchain (Next bundled webpack, CSS loaders, PostCSS and TypeScript); refusing a fallback or package installation', { cause })
  }
  const directory = await mkdtemp(join(tmpdir(), 'hh-service-cart-fixture-'))
  const span = trace('service-cart-browser-fixture')
  let compiler
  try {
    compiler = webpack({
      mode: 'production',
      target: 'web',
      context: root,
      entry: join(fixtureDirectory, 'service-cart-browser.jsx'),
      output: { path: directory, filename: 'fixture.js' },
      devtool: false,
      cache: false,
      optimization: { minimize: false },
      resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        modules: [join(root, 'node_modules'), 'node_modules'],
        alias: { '@': root, 'next/link$': join(fixtureDirectory, 'service-cart-browser-link.jsx') },
      },
      module: { rules: [
        { test: /\.[jt]sx?$/, exclude: /node_modules/, use: [{
          loader: join(fixtureDirectory, 'service-cart-browser-loader.cjs'),
          options: { projectPackage: join(root, 'package.json') },
        }] },
        { test: /\.module\.css$/, use: [
          { loader: styleLoader, options: { esModule: false } },
          { loader: cssLoader, options: {
            esModule: false,
            postcss: async () => ({ postcss }),
            modules: { mode: 'pure', exportLocalsConvention: 'asIs', getLocalIdent },
          } },
        ] },
      ] },
      plugins: [{ apply(build) {
        build.hooks.compilation.tap('ServiceCartFixture', (compilation) => {
          webpack.NormalModule.getCompilationHooks(compilation).loader.tap('ServiceCartFixture', (context) => { context.currentTraceSpan = span })
        })
      } }],
    })
    const stats = await new Promise((resolveBuild, reject) => compiler.run((error, result) => error ? reject(error) : resolveBuild(result)))
    if (stats.hasErrors() || stats.hasWarnings()) throw new Error(stats.toString({ all: false, errors: true, warnings: true }))
    const bundledFiles = new Set([...stats.compilation.fileDependencies].map((path) => relative(root, path).split('\\').join('/')))
    const sourceProof = []
    for (const path of productionInputs) {
      assert.ok(bundledFiles.has(path), `Fixture must bundle actual production input: ${path}`)
      sourceProof.push({ path, sha256: createHash('sha256').update(await readFile(join(root, path))).digest('hex') })
    }
    return { bundle: await readFile(join(directory, 'fixture.js')), sourceProof }
  } finally {
    if (compiler) await new Promise((resolveClose, reject) => compiler.close((error) => error ? reject(error) : resolveClose()))
    span.stop()
    await rm(directory, { recursive: true, force: true })
  }
}
