(() => {
  const MONITOR = 'https://holistic-house-pr-monitor.vercel.app'
  const KEY = 'hh.commander.monitor.next.v1'
  const status = document.getElementById('status')
  const button = document.getElementById('continue')
  let busy = false
  let buttonAction = 'google'

  function safeNext(value) {
    if (typeof value !== 'string' || value.length > 240) return '/agents.html'
    try {
      const url = new URL(value, MONITOR)
      if (url.origin !== MONITOR || url.hash || url.pathname.includes('//')) return '/agents.html'
      const allowed = new Set(['/agents.html','/pr-monitor.html','/task-editor.html','/chats.html','/projects.html','/memory.html'])
      if (!allowed.has(url.pathname)) return '/agents.html'
      if (url.pathname === '/chats.html') {
        const params = [...url.searchParams.entries()]
        if (params.length && !(params.length === 1 && params[0][0] === 'task' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params[0][1]))) return '/chats.html'
        return url.pathname + url.search
      }
      return url.pathname
    } catch { return '/agents.html' }
  }

  function nextPath() {
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved) return safeNext(saved)
    } catch {}
    return safeNext(new URLSearchParams(location.search).get('next') || '/agents.html')
  }

  async function fetchWithTimeout(url, options, timeoutMs, label) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } catch (error) {
      if (error?.name === 'AbortError') throw Error(label + ' не ответил за ' + Math.round(timeoutMs / 1000) + ' сек. Проверьте соединение и повторите.')
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  async function json(response) {
    let data
    try { data = await response.json() } catch { throw Error('Сервер вернул некорректный ответ.') }
    if (!response.ok) {
      const error = Error(data.error || 'Не удалось подтвердить сессию владельца.')
      error.status = response.status
      error.code = typeof data.error === 'string' ? data.error : ''
      throw error
    }
    return data
  }

  function showAction(message, action = 'google', label = 'Продолжить через Google') {
    status.textContent = message
    button.hidden = false
    button.disabled = false
    button.textContent = label
    buttonAction = action
  }

  function recoverHandoff(error) {
    // A true expired/invalid main-app session needs SSO, not an endless retry loop.
    if (error?.status === 401 &&
        ['OWNER_SESSION_INVALID', 'SIGN_IN_REQUIRED', 'OWNER_SIGN_IN_REQUIRED'].includes(error.code)) {
      showAction('Сессия Holistic House истекла. Продолжите через Google для восстановления входа.', 'google')
      return
    }
    showAction(String(error.message || error) + ' Повторите проверку владельца.', 'handoff', 'Повторить проверку')
  }

  async function handoff() {
    status.textContent = 'Проверяю права владельца и подключаю приватное хранилище…'
    const response = await fetchWithTimeout('/api/app/commander/session', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    }, 10000, 'Проверка владельца')
    const data = await json(response)
    if (data.owner !== true || data.privateStoreConfigured !== true ||
        typeof data.accessToken !== 'string' || data.accessToken.length < 120 ||
        typeof data.refreshToken !== 'string' || data.refreshToken.length < 12 || data.refreshToken.length > 4096) {
      throw Error('У этого аккаунта нет подтверждённых прав владельца Agent Commander.')
    }
    const target = new URL(MONITOR + '/commander-auth.html')
    target.searchParams.set('next', nextPath())
    // The short-lived JWT is in the URL fragment only: it is not sent to servers
    // in HTTP requests or Referer headers. The monitor page removes it immediately.
    target.hash = new URLSearchParams({
      token: data.accessToken,
      refresh_token: data.refreshToken,
    }).toString()
    try { sessionStorage.removeItem(KEY) } catch {}
    location.replace(target.href)
  }

  async function startGoogle() {
    if (busy) return
    busy = true
    button.disabled = true
    status.textContent = 'Открываю существующий Google-вход Holistic House…'
    try {
      const response = await fetchWithTimeout('/api/app/auth/start', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ provider: 'google', continueTo: 'commander-monitor', locale: 'ru' }),
      }, 12000, 'Google-вход')
      const data = await json(response)
      if (typeof data.redirectUrl !== 'string' ||
          new URL(data.redirectUrl).origin !== 'https://shervdixkaxurnaecioe.supabase.co') {
        throw Error('Не удалось открыть защищённый вход Google.')
      }
      location.assign(data.redirectUrl)
    } catch (error) {
      showAction(String(error.message || error) + ' Можно повторить вход.', 'google')
      busy = false
    }
  }

  async function start() {
    const next = safeNext(new URLSearchParams(location.search).get('next') || nextPath())
    try { sessionStorage.setItem(KEY, next) } catch {}
    if (new URLSearchParams(location.search).get('finish') === '1') {
      try { await handoff() } catch (error) {
        recoverHandoff(error)
      }
      return
    }
    try {
      const response = await fetchWithTimeout('/api/app/session', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      }, 8000, 'Проверка сессии')
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.authenticated === true) {
        try { await handoff() } catch (error) {
          recoverHandoff(error)
        }
        return
      }
    } catch (error) {
      // A slow auth provider must never leave the owner on an endless spinner.
      showAction(String(error.message || error) + ' Войдите повторно через Google.', 'google')
      return
    }
    showAction('Сессия не подтверждена. Войдите через Google-аккаунт владельца Holistic House.', 'google')
  }

  button.addEventListener('click', () => {
    if (busy) return
    if (buttonAction === 'handoff') {
      busy = true
      button.disabled = true
      handoff().catch(error => recoverHandoff(error))
        .finally(() => { busy = false })
      return
    }
    startGoogle()
  })

  start().catch(error => showAction(String(error.message || error) + ' Войдите повторно через Google.', 'google'))
})()
