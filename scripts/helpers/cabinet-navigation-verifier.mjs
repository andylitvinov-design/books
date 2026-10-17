// The account root is a portrait/reports entry. Tests and PDF export live in My Tests.
// Follow the same visible navigation as a signed-in user, without replacing auth
// or relying on a nav that is also rendered before consent has been committed.
export async function assertCabinetPortrait(page, expect, { origin, locale = 'en' }) {
  await expect(page).toHaveURL(origin + '/' + locale + '/app/portrait', { timeout: 30000 })
  const profile = page.locator('[data-profile-domains][data-profile-interactive="true"]')
  await expect(profile).toBeVisible({ timeout: 30000 })
  await expect(profile.getByRole('heading', {
    name: locale === 'ru' ? 'Мои личные отчёты' : 'My personal reports', level: 1, exact: true,
  })).toBeVisible()
}

export async function openCabinetMyTests(page, expect, { origin, locale = 'en' }) {
  const path = '/' + locale + '/app/tests'
  const link = page.locator('nav a[href="' + path + '"]:visible').first()
  await expect(link).toBeVisible()
  await expect(link).toHaveText(locale === 'ru' ? 'Мои тесты' : 'My tests')
  await expect(link).toHaveAttribute('href', path)
  await link.click()
  await expect(page).toHaveURL(origin + path, { timeout: 30000 })
  await expect(page.locator('[data-my-tests-dashboard]')).toBeVisible({ timeout: 30000 })
}
