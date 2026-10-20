import assert from 'node:assert/strict';

// The private locale gate still denies Spanish; the shared not-found page
// follows the URL-derived public locale and offers only public recovery links.
export async function assertUnsupportedSpanishPrivateLocale(page, response, target, expect) {
  // Next may stream the not-found boundary with HTTP 200; redirects and server
  // errors are never acceptable substitutes for the visible denial below.
  assert.ok(response && [200, 404].includes(response.status()), 'Unsupported private locale must not redirect or server-error');
  await expect(page).toHaveURL(target);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page).toHaveTitle('404 — Página no encontrada | Holistic House');
  const main = page.locator('main');
  await expect(main).toHaveCount(1);
  await expect(main).toHaveAttribute('lang', 'es');
  await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(main.getByRole('heading', { name: 'Página no encontrada', level: 1, exact: true })).toBeVisible({ timeout: 15000 });
  await expect(main.getByText('404 · Holistic House', { exact: true })).toBeVisible();
  await expect(main.getByText('Es posible que el enlace haya cambiado. Sigue explorando el sitio:', { exact: true })).toBeVisible();
  const recovery = main.getByRole('navigation', { name: 'Página no encontrada', exact: true });
  await expect(recovery.locator('a')).toHaveCount(5);
  for (const [name, href] of [['Inicio', '/es'], ['Servicios', '/es/services'], ['Catálogo de remedios', '/es/homeopathy/remedies'], ['Hacer un test gratuito', '/es/client/tests'], ['Análisis personal gratuito', '/es/services/free-situation-review']]) {
    const link = recovery.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
  const languages = main.getByRole('navigation', { name: 'Elegir idioma', exact: true });
  await expect(languages.locator('a')).toHaveCount(3);
  for (const [name, lang, href] of [['English', 'en', '/'], ['Русский', 'ru', '/ru'], ['Español', 'es', '/es']]) {
    const link = languages.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('lang', lang);
    await expect(link).toHaveAttribute('href', href);
  }
  assert.ok((response.headers()['x-robots-tag'] || '').split(/[\s,]+/).includes('noindex'), 'Private denial response must remain noindex');
  await expect.poll(() => page.locator('meta[name="robots"]').evaluateAll(elements => elements.some(el => (el.getAttribute('content') || '').split(/[\s,]+/).includes('noindex')))).toBe(true);
  await expect(page.locator('.client-cabinet, .prescription-access-gate, .client-entry-form')).toHaveCount(0);
}
