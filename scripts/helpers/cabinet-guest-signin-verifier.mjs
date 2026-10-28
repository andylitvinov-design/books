// Assert the authored anonymous portrait entry before any explicit sign-in action.
// This helper does not click, authenticate, write, or retry another entry route.
export async function assertCabinetGuestSignin(page, expect, { origin }) {
  await expect(page).toHaveURL(origin + '/en/app/portrait', { timeout: 30000 })
  const guest = page.locator('[data-cabinet-guest-overview="true"]')
  await expect(guest).toHaveCount(1, { timeout: 30000 })
  await expect(guest).toBeVisible({ timeout: 30000 })
  const signin = guest.getByRole('button', { name: 'Open my Cabinet with Google', exact: true })
  await expect(signin).toHaveCount(1, { timeout: 30000 })
  await expect(signin).toBeVisible({ timeout: 30000 })
  await expect(signin).toBeEnabled({ timeout: 30000 })
  return signin
}
