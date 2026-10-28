import assert from 'node:assert/strict'

// The account root is a portrait/reports entry. Tests and PDF export live in My Tests.
// Follow the same visible navigation as a signed-in user, without replacing auth
// or relying on a nav that is also rendered before consent has been committed.
export async function assertCabinetPortrait(page, expect, { origin, locale = 'en' }) {
  await expect(page).toHaveURL(origin + '/' + locale + '/app/portrait', { timeout: 30000 })
  const profile = page.locator('[data-profile-domains][data-profile-interactive="true"]')
  await expect(profile).toBeVisible({ timeout: 30000 })
  // The authenticated Profile now begins with four selectable areas,
  // rather than the removed Reports heading. Check actual accessible tabs.
  const chooser = profile.locator('details.hh-domain-more')
  await expect(chooser).toBeVisible()
  await expect(chooser).toHaveAttribute('open', '')
  await expect(chooser.getByRole('tab')).toHaveCount(4)
}

export async function openCabinetMyTests(page, expect, { origin, locale = 'en' }) {
  const path = '/' + locale + '/app/tests'
  await openCabinetAccountLink(page, expect, { path, label: locale === 'ru' ? 'Тесты' : 'Tests' })
  await expect(page).toHaveURL(origin + path, { timeout: 30000 })
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({ timeout: 30000 })
}

export async function openCabinetProfile(page, expect, { origin, locale = 'en' }) {
  const path = '/' + locale + '/app/portrait'
  await openCabinetAccountLink(page, expect, { path, label: locale === 'ru' ? 'Мой профиль' : 'My Profile' })
  await expect(page).toHaveURL(origin + path)
}

async function openCabinetAccountLink(page, expect, { path, label }) {
  // Tests and My Profile remain in the Account menu; the mobile dock
  // intentionally has different destinations. Open the real disclosure first.
  const menu = page.locator('details.hh-account-menu:visible')
  await expect(menu).toHaveCount(1)
  await expect(menu).toBeVisible()
  const summary = menu.locator(':scope > summary')
  await expect(summary).toHaveCount(1)
  await expect(summary).toBeVisible()
  if (await menu.getAttribute('open') === null) await summary.click()
  await expect(menu).toHaveAttribute('open', '')
  const link = menu.locator(':scope > div > a[href="' + path + '"]')
  await expect(link).toHaveCount(1)
  await expect(link).toBeVisible()
  await expect(link).toHaveText(label)
  await expect(link).toHaveAttribute('href', path)
  await link.click()
}

export async function assertCabinetPrimaryNavigation(page, expect, { locale = 'en', current } = {}) {
  const nav = page.locator('nav.hh-nav:visible, nav.hh-mobile-app-nav:visible')
  await expect(nav).toHaveCount(1)
  await expect(nav).toBeVisible()
  const links = nav.locator(':scope > a')
  const mobile = (await nav.getAttribute('class')).split(/\s+/).includes('hh-mobile-app-nav')
  const root = '/' + locale + '/app/'
  const isActive = id => id === current ||
    (id === 'portrait' && ['labs', 'portfolio', 'reports', 'history', 'monitoring', 'results'].includes(current)) ||
    (id === 'course' && ['business', 'coaching'].includes(current))
  const entries = mobile ? [
    ['home', locale === 'ru' ? 'Главная' : 'Home', locale === 'ru' ? '/ru' : '/'],
    ['practice', locale === 'ru' ? 'Практики' : 'Practices', '/' + locale + '/practice'],
    ['messages', locale === 'ru' ? 'Заявки' : 'Requests', root + 'messages'],
    ['portfolio', locale === 'ru' ? 'Прогресс' : 'Progress', root + 'portfolio'],
    ['settings', locale === 'ru' ? 'Настройки' : 'Settings', root + 'settings'],
  ] : [
    ['portrait', locale === 'ru' ? 'Мой профиль' : 'My Profile', root + 'portrait'],
    ['course', locale === 'ru' ? 'Курсы' : 'Courses', root + 'course?view=courses'],
    ['tests', locale === 'ru' ? 'Тесты' : 'Tests', root + 'tests'],
    ['practice', locale === 'ru' ? 'Практика' : 'Practice', '/' + locale + '/practice'],
    ['messages', locale === 'ru' ? 'Сообщения' : 'Messages', root + 'messages'],
  ]
  const expected = entries.map(([id, label, href]) => ({ href, label,
    current: id !== 'home' && isActive(id) ? 'page' : null,
    ariaLabel: id === 'home' ? (locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage') : null }))
  await expect(links).toHaveCount(5)
  assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => ({ href: node.getAttribute('href'), label: node.textContent.trim(), current: node.getAttribute('aria-current'), ariaLabel: node.getAttribute('aria-label') }))), expected)
}

export async function openCabinetHome(page, expect, { origin, locale = 'en' }) {
  const path = locale === 'ru' ? '/ru' : '/'
  const home = page.locator('nav.hh-mobile-app-nav:visible > a.hh-mobile-app-nav-home')
  await expect(home).toHaveCount(1)
  await expect(home).toBeVisible()
  await expect(home).toHaveText(locale === 'ru' ? 'Главная' : 'Home')
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
