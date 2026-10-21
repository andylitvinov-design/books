// Read-only portrait-entry contract. Never sign in, retry, or open private data.
export async function assertCabinetGuestEntry(page, expect) {
  const guest = page.locator('main.hh-app [data-cabinet-guest-overview="true"]');
  await expect(guest).toHaveCount(1);
  await expect(guest).toBeVisible();
  await expect(guest).toHaveAttribute('aria-labelledby', 'cabinet-guest-title');
  await expect(guest.getByRole('heading', { level: 1, includeHidden: true })).toHaveCount(1);
  const heading = guest.getByRole('heading', {
    level: 1, name: 'Discover where you are. Grow into what comes next.', exact: true, includeHidden: true,
  });
  await expect(heading).toHaveCount(1);
  await expect(heading).toBeVisible();
  await expect(heading).toHaveAttribute('id', 'cabinet-guest-title');
  for (const [name, href] of [
    ['Explore free tests', '/en/client/tests'],
    ['Open the previous access page', '/en/client'],
  ]) {
    const link = guest.getByRole('link', { name, exact: true, includeHidden: true });
    await expect(link).toHaveCount(1);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
  // Include hidden nodes so a hidden or stale duplicate cannot satisfy either state.
  const signin = guest.getByRole('button', {
    name: 'Open my Cabinet with Google', exact: true, includeHidden: true,
  });
  const unavailable = guest.getByRole('status', { includeHidden: true }).filter({
    hasText: /^Google sign-in is temporarily unavailable\. You can still explore free tests and return later\.$/,
  });
  await expect(signin.or(unavailable)).toHaveCount(1);
  await expect(signin.or(unavailable)).toBeVisible();
  if (await signin.count()) await expect(signin).toBeEnabled();
  await expect(guest.getByRole('alert', { includeHidden: true })).toHaveCount(0);
  await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0);
}
