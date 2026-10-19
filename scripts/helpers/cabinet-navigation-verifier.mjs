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
  const labels = locale === 'ru' ? ['Профиль', 'Тесты', 'Отчёты', 'Курсы', 'Практика'] : ['Profile', 'Tests', 'Reports', 'Courses', 'Practice']
  const paths = ['portrait', 'tests', 'portfolio', 'course', 'practice']
  const links = nav.locator(':scope > a')
  const mobile = (await nav.getAttribute('class')).split(/\s+/).includes('hh-mobile-app-nav')
  const expected = paths.map((path, index) => ({ href: '/' + locale + '/app/' + path + (path === 'course' ? '?view=courses' : ''), label: labels[index], current: path === current ? 'page' : null, ariaLabel: null }))
  if (mobile) expected.push({ href: locale === 'ru' ? '/ru' : '/', label: locale === 'ru' ? 'Главная' : 'Home', current: null, ariaLabel: locale === 'ru' ? 'На главную страницу Holistic House' : 'Go to Holistic House homepage' })
  await expect(links).toHaveCount(mobile ? 6 : 5)
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
