import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const content = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const exists = path => existsSync(new URL('../'+path,import.meta.url));
test('Spanish service funnel has real pages and localized form without EN fallback', () => {
 for (const path of ['app/es/page.tsx','app/es/services/page.tsx','components/free-situation-review-form.tsx','app/[locale]/services/free-situation-review/page.tsx','app/[locale]/services/imagery-therapy/page.tsx']) assert.ok(exists(path),path);
 const services=content('app/es/services/page.tsx');
 assert.match(services,/Psicohomeopatía/);
 assert.match(services,/Psicoterapia con imágenes/);
 assert.match(services,/Constelaciones y acompañamiento arquetípico/);
 assert.match(services,/\/es\/services\/free-situation-review/);
 const form=content('components/free-situation-review-form.tsx');
 assert.match(form,/Empecemos con una conversación gratuita/);
 assert.match(form,/locale: Locale \| "es"/);
 const free=content('app/[locale]/services/free-situation-review/page.tsx');
 const imagery=content('app/[locale]/services/imagery-therapy/page.tsx');
 for(const page of [free,imagery]) { assert.match(page,/isPublicLocale\(locale\)/);assert.match(page,/es: "\/es\/services\//); }
});
test('Spanish practitioner paths and contact routes keep protected app separate', () => {
 for(const path of ['app/[locale]/masters/page.tsx','app/[locale]/masters/[slug]/page.tsx','app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx']) assert.match(content(path),/isPublicLocale\(locale\)/);
 const service=content('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx');
 assert.match(service,/\/es\/services\/free-situation-review/);
 assert.match(content('data/remedies.d.ts'),/Locale = "ru" \| "en"/);
 assert.match(content('app/es/client/page.tsx'),/locale="en" displayLocale="es"/);
 assert.doesNotMatch(content('app/sitemap.ts'),/['"]\/es\/client['"]/);
});
test('Spanish public explorer, privacy and terms exist and authenticate via the English account', () => {
 for(const path of ['app/es/client/tests/page.tsx','app/es/privacy/page.tsx','app/es/terms/page.tsx']) assert.ok(exists(path),path);
 assert.match(content('components/app/test-explorer.jsx'),/Prepara tu selección de pruebas/);
 assert.match(content('components/app/public-test-explorer.jsx'),/locale === 'ru' \? 'ru' : 'en'/);
 assert.match(content('components/app/public-test-explorer.jsx'),/continueTo: 'tests'/);
 assert.match(content('app/es/client/tests/page.tsx'),/idioma original/);
 assert.match(content('app/es/privacy/page.tsx'),/Privacidad/);
 assert.match(content('app/es/terms/page.tsx'),/Condiciones de uso/);
});
