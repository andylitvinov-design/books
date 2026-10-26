import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const content = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const exists = path => existsSync(new URL('../'+path,import.meta.url));
test('Spanish service funnel has real pages and localized form without EN fallback', () => {
 for (const path of ['app/es/page.tsx','app/es/services/page.tsx','components/free-situation-review-form.tsx','app/[locale]/services/free-situation-review/page.tsx','app/[locale]/services/imagery-therapy/page.tsx']) assert.ok(exists(path),path);
 const services=content('app/es/services/page.tsx');
 assert.match(services,/<ServicesConversionHero locale="es" \/>/);
 assert.match(services,/<ServicesStudioOffers locale="es" \/>/);
 const offers=content('data/core-service-offers.ts');
 assert.match(offers,/Alquimia del Alma · Psicohomeopatía/);
 assert.match(offers,/Hipnoterapia con imágenes guiadas/);
 assert.match(offers,/route: "free-situation-review"/);
 const studio=content('components/services-studio-offers.tsx');
 assert.match(studio,/Constelaciones sistémicas y apoyo arquetípico/);
 const form=content('components/free-situation-review-form.tsx');
 assert.match(form,/<FreeDrawingIntake locale=\{locale\}/);
 const chooser=content('components/consultation-choice-capture.tsx');
 assert.match(chooser,/Evaluación gratuita mediante dibujo/);
 assert.match(chooser,/locale: PublicLocale/);
 assert.match(chooser,/Situación personal/);
 const free=content('app/[locale]/services/free-situation-review/page.tsx');
 const imagery=content('app/[locale]/services/imagery-therapy/page.tsx');
 for(const page of [free,imagery]) { assert.match(page,/isPublicLocale\(locale\)/);assert.match(page,/es: "\/es\/services\//); }
});
test('Spanish practitioner paths and contact routes keep protected app separate', () => {
 for(const path of ['app/[locale]/masters/page.tsx','app/[locale]/masters/[slug]/page.tsx','app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx']) assert.match(content(path),/isPublicLocale\(locale\)/);
 const service=content('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx');
 // The public marketplace request is now localized and directly submitted on
 // the same service page; the protected Cabinet remains optional.
 const assertRequestContract = input => {
  const expression=input.match(/const requestHref=([\s\S]*?);\s*const delivery=/)?.[1];
  assert.ok(expression,'public website request route');
  for(const locale of ['en','ru','es']) {
   const href=runInNewContext('('+expression+')',{locale},{timeout:1000});
   assert.equal(href,'#site-service-request');
  }
  assert.equal([...input.matchAll(/<TrackedServiceLink\b[^>]*href=\{requestHref\}/g)].length,2);
  assert.match(input,/<MarketplaceWebsiteEnquiry locale=\{locale as PublicLocale\}/);
  assert.match(input,/serviceId=\{service\.id\}/);
  assert.match(input,/practitionerSlug=\{practitioner\.slug\}/);
  assert.doesNotMatch(input,/El formulario de solicitud se abre en inglés\./);
 };
 assertRequestContract(service);
 for(const [before,after] of [
  ['const requestHref="#site-service-request";','const requestHref="/en/app/consultations";'],
  ['<MarketplaceWebsiteEnquiry locale={locale as PublicLocale}','<Link locale={locale as PublicLocale}'],
  ['href={requestHref}','href="/en/services"'],
 ]) {
  assert.ok(service.includes(before),before);
  assert.throws(()=>assertRequestContract(service.replace(before,after)),undefined,before);
 }
 const cabinet=content('app/[locale]/app/[[...path]]/page.jsx');
 assert.match(cabinet,/if \(!\['en', 'ru'\]\.includes\(locale\)\) notFound\(\)/);
 assert.match(cabinet,/'consultations'/);
 const workspace=content('components/app/app-workspace.jsx');
 assert.match(workspace,/serviceId: searchParams\.get\('service'\) \|\| null/);
 assert.match(workspace,/initialServiceId=\{searchParams\.get\('service'\) \|\| ''\}/);

 assert.match(content('data/remedies.d.ts'),/Locale = "ru" \| "en"/);
 assert.match(content('app/es/client/page.tsx'),/locale="en" displayLocale="es"/);
 assert.doesNotMatch(content('app/sitemap.ts'),/['"]\/es\/client['"]/);
});
test('Spanish public explorer, privacy and terms exist and authenticate via the English account', () => {
 for(const path of ['app/es/client/tests/page.tsx','app/es/privacy/page.tsx','app/es/terms/page.tsx']) assert.ok(exists(path),path);
 assert.match(content('components/app/test-explorer.jsx'),/Prepara tu selección de pruebas/);
 assert.match(content('components/app/public-test-explorer.jsx'),/locale === 'ru' \? 'ru' : 'en'/);
 assert.match(content('components/app/public-test-explorer.jsx'),/client\?startTests=/);
 assert.doesNotMatch(content('components/app/public-test-explorer.jsx'),/auth\/start/);
 assert.match(content('app/es/client/tests/page.tsx'),/idioma original/);
 assert.match(content('app/es/privacy/page.tsx'),/Privacidad/);
 assert.match(content('app/es/terms/page.tsx'),/Condiciones de uso/);
});
