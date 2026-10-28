import { assertIsolatedDatabaseEnvironment } from '../../tests/helpers/app-db-fixture-policy.mjs'

const ORIGIN = 'http://localhost:3100'
const DOCUMENTS = Object.freeze(['/en/courses/antistress', '/ru/courses/antistress'])
const FAIL = 'Isolated OPORA public-document precompile failed'

// Test setup only: warmed development functional acceptance, not a runtime fix
// or production cold-performance evidence. The known cold dev compile/HMR
// overlap is deliberately not exercised by the following browser journey.
// Call before launching any browser/HMR client; never retry or sign in.
export async function precompileOporaPublicRoutes({ origin, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  assertIsolatedDatabaseEnvironment(env)
  if (env.NODE_ENV !== 'development' || origin !== ORIGIN ||
      env.HH_TEST_APP_ORIGIN !== ORIGIN || env.HH_APP_ALLOWED_ORIGINS !== ORIGIN ||
      env.HH_APP_SUPABASE_URL !== 'http://localhost:54329' ||
      env.HH_APP_SUPABASE_PUBLISHABLE_KEY !== 'synthetic-publishable-key')
    throw new Error(FAIL)

  const controller = new AbortController()
  let timer, reader = null, body = null
  const deadline = new Promise((_, reject) => {
    // One total upper bound for both documents, including streaming/cleanup.
    timer = setTimeout(() => { controller.abort(); reject(new Error(FAIL)) }, 90000)
  })
  async function cancelBody(currentReader, currentBody) {
    try {
      const cancellation = currentReader ? currentReader.cancel() : currentBody?.cancel()
      if (cancellation) await Promise.race([cancellation, deadline])
    } catch {
      // Cleanup must not replace or extend the fixed setup failure.
    } finally {
      try { currentReader?.releaseLock() } catch {}
    }
  }
  try {
    await Promise.race([deadline, (async () => {
      for (const path of DOCUMENTS) {
        if (controller.signal.aborted) throw new Error(FAIL)
        const target = ORIGIN + path
        const response = await fetchImpl(target, {
          method: 'GET', redirect: 'error', credentials: 'omit',
          headers: { Accept: 'text/html' }, signal: controller.signal,
        })
        // A late response after an abort cannot start another request or leak
        // its stream, even if a synthetic fetch ignores its abort signal.
        if (controller.signal.aborted) {
          await cancelBody(null, response.body)
          throw new Error(FAIL)
        }
        body = response.body
        if (response.status !== 200 || response.redirected !== false || response.url !== target ||
            !/^text\/html(?:\s*;|\s*$)/i.test(response.headers.get('content-type') || '') || !body)
          throw new Error(FAIL)
        reader = body.getReader()
        const currentReader = reader
        let bytes = 0, chunks = 0
        while (true) {
          const chunk = await currentReader.read()
          if (controller.signal.aborted) throw new Error(FAIL)
          if (chunk.done === true) {
            if (bytes === 0) throw new Error(FAIL)
            break
          }
          if (chunk.done !== false || !(chunk.value instanceof Uint8Array)) throw new Error(FAIL)
          bytes += chunk.value.byteLength
          chunks += 1
          if (bytes > 8 * 1024 * 1024 || chunks > 2048) throw new Error(FAIL)
          // Do not decode, parse, retain, log or forward document bytes/cookies.
        }
        currentReader.releaseLock()
        reader = null
        body = null
      }
    })()])
  } catch {
    throw new Error(FAIL)
  } finally {
    controller.abort()
    await cancelBody(reader, body)
    clearTimeout(timer)
  }
}
