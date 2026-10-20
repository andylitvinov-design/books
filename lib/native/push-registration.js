// A token listener belongs to one explicit opt-in attempt, never another account.
export function registerNativePushToken(push, {signal, isCurrent = () => true, timeoutMs = 15000} = {}) {
  return new Promise((resolve, reject) => {
    let settled = false
    let timer
    const handles = new Set()
    const remove = handle => { try { Promise.resolve(handle?.remove()).catch(() => {}) } catch {} }
    const fresh = () => !signal?.aborted && isCurrent()
    function finish(error, value) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      for (const handle of handles) remove(handle)
      handles.clear()
      if (error) reject(error)
      else resolve(value)
    }
    const abort = () => finish(new Error('NATIVE_PUSH_CANCELLED'))
    if (!fresh()) { abort(); return }
    signal?.addEventListener('abort', abort, {once: true})
    timer = setTimeout(() => finish(new Error('NATIVE_PUSH_TIMEOUT')), timeoutMs)
    const attach = (name, callback) => Promise.resolve().then(() => {
      if (settled || !fresh()) { abort(); return null }
      return push.addListener(name, callback)
    }).then(handle => {
      if (!handle) return
      if (settled || !fresh()) { remove(handle); abort(); return }
      handles.add(handle)
    })
    Promise.all([
      attach('registration', event => {
        if (!fresh()) { abort(); return }
        const token = event?.value
        if (typeof token !== 'string' || !token.length || token.length > 2048)
          finish(new Error('INVALID_NATIVE_TOKEN'))
        else finish(null, token)
      }),
      attach('registrationError', () => finish(new Error('NATIVE_PUSH_REGISTER_FAILED'))),
    ]).then(() => {
      if (settled || !fresh()) { abort(); return }
      return push.register()
    }).catch(() => finish(new Error('NATIVE_PUSH_REGISTER_FAILED')))
  })
}
