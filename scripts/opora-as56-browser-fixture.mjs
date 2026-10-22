import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const oporaFixtureOrigin = 'http://127.0.0.1:3100'
export const oporaFixturePrefix = '/__hh-test__/opora-as56/'
export const oporaFixtureBundlePath = oporaFixturePrefix + 'fixture.js'
const fixturePerformanceBudget = Object.freeze({ hints: 'warning', maxAssetSize: 896 * 1024, maxEntrypointSize: 896 * 1024 })
function assertFixtureCompilation(stats) {
  if (stats.hasErrors() || stats.hasWarnings()) throw new Error(stats.toString({ all: false, errors: true, warnings: true }))
}
const fixtureDirectory = fileURLToPath(new URL('./fixtures/', import.meta.url))
const projectDirectory = fileURLToPath(new URL('../', import.meta.url))
const productionInputs = [
  'components/app/opora-experience-player.jsx',
  'components/app/opora-experience-player.module.css',
  'lib/inner-growth/opora-as56-experience-guides.js',
  'lib/inner-growth/anti-stress-skills-v6.js',
  'lib/inner-growth/course-slide-sequence.js',
]
export function oporaFixturePath(locale) {
  assert.ok(['en', 'ru', 'es'].includes(locale), 'Unsupported OPORA fixture locale')
  return oporaFixturePrefix + locale
}
export function requireHostedOporaBrowser(env) {
  assert.equal(env.CI, 'true', 'Hosted CI only')
  assert.equal(env.GITHUB_ACTIONS, 'true', 'GitHub Actions only')
  assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted', 'GitHub-hosted browser only')
  assert.equal(env.HH_APP_TEST_RUNTIME, 'isolated', 'Synthetic isolated runtime required')
  assert.ok(!env.VERCEL, 'Never use a deployed site')
}
export function oporaFixtureDocument(locale, data, css) {
  oporaFixturePath(locale)
  assert.equal(data.cycle.day, 5, 'Only the synthetic day-five case is supported')
  assert.equal(data.currentSession, null, 'No saved or client records')
  const safeData = JSON.stringify({ locale, data }).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="data:,"><title>Synthetic OPORA AS5.6 acceptance</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><main class="hh-app" id="opora-browser-root"></main><script type="application/json" id="opora-browser-data">${safeData}</script><script src="${oporaFixtureBundlePath}" defer></script></body></html>`
}

// This creates bytes for Playwright route.fulfill only: no Next route, server,
// public asset, runtime component change, installation or external dependency.
// All tooling is supplied by the repository's existing npm ci dependencies.
export async function buildOporaBrowserFixture({ projectRoot = projectDirectory } = {}) {
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
    throw new Error('OPORA fixture requires the repository npm ci toolchain (Next bundled webpack, CSS loaders, PostCSS and TypeScript); refusing a fallback or package installation', { cause })
  }
  const directory = await mkdtemp(join(tmpdir(), 'hh-opora-fixture-'))
  const span = trace('opora-browser-fixture')
  let compiler
  try {
    compiler = webpack({
      mode: 'production',
      target: 'web',
      context: root,
      entry: join(fixtureDirectory, 'opora-as56-browser.jsx'),
      output: { path: directory, filename: 'fixture.js' },
      devtool: false,
      cache: false,
      // This isolated Playwright harness bundles development dependencies that are
      // not shipped in the production app. Keep a strict 896 KiB budget for this test-only unminified bundle.
      // Next's compiled Webpack cannot access its own Terser plugin here.
      optimization: { minimize: false },
      performance: fixturePerformanceBudget,
      resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        modules: [join(root, 'node_modules'), 'node_modules'],
        alias: { '@': root },
      },
      module: { rules: [
        { test: /\.[jt]sx?$/, exclude: /node_modules/, use: [{
          loader: join(fixtureDirectory, 'service-cart-browser-loader.cjs'),
          options: { projectPackage: join(root, 'package.json') },
        }] },
        { test: /\.module\.css$/, use: [
          { loader: styleLoader, options: { esModule: false } },
          { loader: cssLoader, options: {
            esModule: false, url: false,
            postcss: async () => ({ postcss }),
            modules: { mode: 'pure', exportLocalsConvention: 'asIs', getLocalIdent },
          } },
        ] },
      ] },
      plugins: [{ apply(build) {
        build.hooks.compilation.tap('OporaFixture', (compilation) => {
          webpack.NormalModule.getCompilationHooks(compilation).loader.tap('OporaFixture', (context) => { context.currentTraceSpan = span })
        })
      } }],
    })
    const stats = await new Promise((resolveBuild, reject) => compiler.run((error, result) => error ? reject(error) : resolveBuild(result)))
    assertFixtureCompilation(stats)
    const bundledFiles = new Set([...stats.compilation.fileDependencies].map((path) => relative(root, path).split('\\').join('/')))
    const sourceProof = []
    for (const path of productionInputs) {
      assert.ok(bundledFiles.has(path), `Fixture must bundle actual production input: ${path}`)
      sourceProof.push({ path, sha256: createHash('sha256').update(await readFile(join(root, path))).digest('hex') })
    }
    // Real inherited global/cabinet styles, matching the existing report fixtures.
    const cssPaths = ['app/globals.css', 'app/[locale]/app/[[...path]]/workspace.css']
    const styles = []
    for (const path of cssPaths) {
      const bytes = await readFile(join(root, path), 'utf8')
      sourceProof.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') })
      if (path === 'app/globals.css') {
        const compiled = await postcss([
          projectRequire('tailwindcss')({ config: join(root, 'tailwind.config.ts') }),
          projectRequire('autoprefixer')(),
        ]).process(bytes, { from: join(root, path) })
        assert.deepEqual(compiled.warnings(), [])
        styles.push(compiled.css)
      } else styles.push(bytes)
    }
    return { bundle: await readFile(join(directory, 'fixture.js')), css: styles.join('\n'), sourceProof }
  } finally {
    if (compiler) await new Promise((resolveClose, reject) => compiler.close((error) => error ? reject(error) : resolveClose()))
    span.stop()
    await rm(directory, { recursive: true, force: true })
  }
}
