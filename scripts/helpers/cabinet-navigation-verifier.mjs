import assert from 'node:assert/strict'

// The account root is a portrait/reports entry. Tests and PDF export live in My Tests.
// Follow the same visible navigation as a signed-in user, without replacing auth
// or relying on a nav that is also rendered before consent has been committed.
export async function assertCabinetPortrait(page, expect, { origin, locale = 'en' }) {
  await expect(page).toHaveURL(origin + '/' + locale + '/app/portrait', { timeout: 30000 })
  const profile = page.locator('[data-profile-domains][data-profile-interactive="true"]')
  await expect(profile).toBeVisible({ timeout: 30000 })
  await expect(profile.getByRole('heading', {
    name: locale === 'ru' ? 'Мой профиль и отчёты' : 'My profile & reports', level: 1, exact: true,
  })).toBeVisible()
}

export async function openCabinetMyTests(page, expect, { origin, locale = 'en' }) {
  const path = '/' + locale + '/app/tests'
  const link = page.locator('nav a[href="' + path + '"]:visible').first()
  await expect(link).toBeVisible()
  await expect(link).toHaveText(locale === 'ru' ? 'Тесты' : 'Tests')
  await expect(link).toHaveAttribute('href', path)
  await link.click()
  await expect(page).toHaveURL(origin + path, { timeout: 30000 })
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({ timeout: 30000 })
}

export async function assertCabinetPrimaryNavigation(page, expect, { locale = 'en', current } = {}) {
  const nav = page.locator('nav.hh-nav:visible, nav.hh-mobile-app-nav:visible')
  await expect(nav).toHaveCount(1)
  await expect(nav).toBeVisible()
  const links = nav.locator(':scope > a')
  const mobile = (await nav.getAttribute('class')).split(/\s+/).includes('hh-mobile-app-nav')
  // Match current App Workspace: seven desktop entries, Home and four mobile entries.
  // Practice is the canonical public /{locale}/practice, not /app/practice.
  const root = '/' + locale + '/app'
  const active = current === 'history' ? 'progress'
    : ['reports','monitoring','results'].includes(current) ? 'portfolio'
    : ['business','coaching'].includes(current) ? 'course'
    : current === 'labs' ? 'portrait' : current
  const item = (href, label, id, ariaLabel = null) => ({
    href, label, current: id === active ? 'page' : null, ariaLabel,
  })
  const expected = mobile ? [
    item(locale === 'ru' ? '/ru' : locale === 'es' ? '/es' : '/',
      locale === 'ru' ? 'Главная' : locale === 'es' ? 'Inicio' : 'Home', null,
      locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage'),
    item('/' + locale + '/practice',
      locale === 'ru' ? 'Мои практики' : locale === 'es' ? 'Mis prácticas' : 'My practices', 'practice'),
    item(root + '/messages', locale === 'ru' ? 'Сообщения' : locale === 'es' ? 'Mensajes' : 'Messages', 'messages'),
    item(root + '/progress', locale === 'ru' ? 'Мой прогресс' : locale === 'es' ? 'Mi progreso' : 'My progress', 'progress'),
    item(root + '/settings', locale === 'ru' ? 'Настройки' : locale === 'es' ? 'Ajustes' : 'Settings', 'settings'),
  ] : [
    item(root + '/portrait', locale === 'ru' ? 'Профиль' : 'Profile', 'portrait'),
    item(root + '/tests', locale === 'ru' ? 'Тесты' : 'Tests', 'tests'),
    item(root + '/portfolio', locale === 'ru' ? 'Отчёты' : 'Reports', 'portfolio'),
    item(root + '/progress', locale === 'ru' ? 'Мой прогресс' : locale === 'es' ? 'Mi progreso' : 'My Progress', 'progress'),
    item(root + '/course?view=courses', locale === 'ru' ? 'Курсы' : 'Courses', 'course'),
    item('/' + locale + '/practice', locale === 'ru' ? 'Практика' : 'Practice', 'practice'),
    item(root + '/messages', locale === 'ru' ? 'Сообщения' : 'Messages', 'messages'),
  ]
  await expect(links).toHaveCount(expected.length)
  assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => ({
    href: node.getAttribute('href'), label: node.textContent.trim(),
    current: node.getAttribute('aria-current'), ariaLabel: node.getAttribute('aria-label'),
  }))), expected)
}

export async function openCabinetHome(page, expect, { origin, locale = 'en' }) {
  const path = locale === 'ru' ? '/ru' : locale === 'es' ? '/es' : '/'
  const home = page.locator('nav.hh-mobile-app-nav:visible > a.hh-mobile-app-nav-home')
  await expect(home).toHaveCount(1)
  await expect(home).toBeVisible()
  await expect(home).toHaveText(locale === 'ru' ? 'Главная' : locale === 'es' ? 'Inicio' : 'Home')
  await expect(home).toHaveAttribute('aria-label', locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage')
  await expect(home).toHaveAttribute('href', path)
  await home.click()
  await expect(page).toHaveURL(origin + path, { timeout: 30000 })
}

// Only the isolated dev-server harness needs this. Cold Home compilation can
// emit a full Fast Refresh reload that cancels WebKit's actual navigation.
export async function warmCabinetExitDocument(context, origin) {
  assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/)
  const response = await context.request.get(origin + '/')
  try {
    assert.equal(response.status(), 200, 'isolated public Home must compile successfully')
    await response.body()
  } finally {
    await response.dispose()
  }
}
