import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const ts = createRequire(import.meta.url)('typescript')
export const syntheticMediaOrigin = 'https://abcdefghijklmnopqrst.supabase.co'

// Execute the checkout's complete, unchanged middleware. Redirect/auth transports
// are explicit inert fixtures: these policy tests perform no network or DB work.
// A fresh isolated environment prevents real credentials or upload flags leaking in.
export function courseMediaCspFixture(source) {
  const compiled = ts.transpileModule(source, { fileName: 'middleware.ts', compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  return async (pathname, origin = syntheticMediaOrigin) => {
    let forwardedHeaders
    const dependencies = {
      'next/server': { NextResponse: {
        next(options) {
          forwardedHeaders = options.request.headers
          return { headers: new Headers(), cookies: { set() { assert.fail('Unexpected auth cookie mutation') } } }
        },
        redirect() { assert.fail('Unexpected redirect in CSP fixture') },
      } },
      './lib/canonical-redirect': { canonicalRedirectTarget: () => null, privateMigrationBridge: () => null },
      './lib/app/admin-auth-refresh': { refreshAdminAuth: async () => [] },
    }
    const runtime = { exports: {}, Headers, URL,
      crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
      process: { env: { NODE_ENV: 'production', HH_APP_SUPABASE_URL: origin } },
      require(name) {
        assert.ok(Object.hasOwn(dependencies, name), 'Unexpected CSP fixture import: ' + name)
        return dependencies[name]
      },
    }
    vm.runInNewContext(compiled, runtime, { filename: 'middleware.ts' })
    assert.equal(typeof runtime.exports.middleware, 'function')
    const url = new URL(pathname, 'https://csp-fixture.invalid')
    const response = await runtime.exports.middleware({ url: url.href, nextUrl: url,
      method: 'GET', headers: new Headers(), cookies: { get: () => undefined } })
    const policy = response.headers.get('Content-Security-Policy')
    assert.ok(policy, 'Middleware must emit a CSP response header')
    assert.equal(forwardedHeaders.get('Content-Security-Policy'), policy,
      'Server-rendered document and browser must receive the same policy')
    return Object.fromEntries(policy.split(';').map(item => {
      const [directive, ...values] = item.trim().split(/\s+/)
      return [directive, values]
    }))
  }
}
