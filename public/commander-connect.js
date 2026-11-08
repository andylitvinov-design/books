(() => {
  const MONITOR = 'https://holistic-house-pr-monitor.vercel.app'
  const KEY = 'hh.commander.monitor.next.v1'
  const status = document.getElementById('status')
  const button = document.getElementById('continue')
  let busy = false

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

  async function json(response) {
    let data
    try { data = await response.json() } catch { throw Error('Сервер вернул некорректный ответ.') }
    if (!response.ok) throw Error(data.error || 'Не удалось подтвердить сессию владельца.')
    return data
  }

  async function handoff() {
    status.textContent = 'Проверяю права владельца и подключаю приватное хранилище…'
    const response = await fetch('/api/app/commander/session', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
    })
    const data = await json(response)
    if (data.owner !== true || data.privateStoreConfigured !== true ||
        typeof data.accessToken !== 'string' || data.accessToken.length < 120) {
      throw Error('У этого аккаунта нет подтверждённых прав владельца Agent Commander.')
    }
    const target = new URL(MONITOR + '/commander-auth.html')
    target.searchParams.set('next', nextPath())
    // The short-lived JWT is in the URL fragment only: it is not sent to servers
    // in HTTP requests or Referer headers. The monitor page removes it immediately.
    target.hash = 'token=' + encodeURIComponent(data.accessToken)
    try { sessionStorage.removeItem(KEY) } catch {}
    location.replace(target.href)
  }

  async function startGoogle() {
    if (busy) return
    busy = true
    button.disabled = true
    status.textContent = 'Открываю существующий Google-вход Holistic House…'
    try {
      const response = await fetch('/api/app/auth/start', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ provider: 'google', continueTo: 'commander-monitor', locale: 'ru' }),
      })
      const data = await json(response)
      if (typeof data.redirectUrl !== 'string' ||
          new URL(data.redirectUrl).origin !== 'https://shervdixkaxurnaecioe.supabase.co') {
        throw Error('Не удалось открыть защищённый вход Google.')
      }
      location.assign(data.redirectUrl)
    } catch (error) {
      busy = false
      button.disabled = false
      status.textContent = String(error.message || error)
    }
  }

  async function start() {
    const next = safeNext(new URLSearchParams(location.search).get('next') || nextPath())
    try { sessionStorage.setItem(KEY, next) } catch {}
    if (new URLSearchParams(location.search).get('finish') === '1') {
      await handoff()
      return
    }
    try {
      const response = await fetch('/api/app/session', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.authenticated === true) {
        await handoff()
        return
      }
    } catch {}
    status.textContent = 'Войдите через Google-аккаунт владельца Holistic House.'
    button.hidden = false
    button.addEventListener('click', startGoogle, { once: true })
  }

  start().catch(error => {
    status.textContent = String(error.message || error)
    button.hidden = false
    button.disabled = false
    button.addEventListener('click', startGoogle, { once: true })
  })
})()
