import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const content = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const exists = path => existsSync(new URL('../'+path,import.meta.url));
test('Spanish service funnel has real pages and localized form without EN fallback', () => {
 for (const path of ['app/es/page.tsx','app/es/services/page.tsx','components/free-situation-review-form.tsx','app/[locale]/services/free-situation-review/page.tsx','app/[locale]/services/imagery-therapy/page.tsx']) assert.ok(exists(path),path);
 const services=content('app/es/services/page.tsx');
 assert.match(services,/Psicohomeopatía/);
 assert.match(services,/title: "Trabajo con imágenes guiadas"/);
 assert.match(services,/href: "\/es\/services\/imagery-therapy"/);
 assert.match(services,/Constelaciones y acompañamiento arquetípico/);
 assert.match(services,/\/es\/services\/free-situation-review/);
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
 // Canonical #979 preserves the selected service when Spanish opens the
 // supported English Cabinet, rather than diverting it to a generic free review.
 const assertRequestContract = input => {
  const expression=input.match(/const requestHref=([\s\S]*?);\s*const delivery=/)?.[1];
  assert.ok(expression,'shared request route expression');
  const serviceId='service /&=é', practitionerSlug='practitioner /&=ñ';
  for(const locale of ['en','ru','es']) {
   for(const pricingMode of ['free','fixed','contact']) {
    const context={locale,es:locale==='es',service:{slug:'personal-session',id:serviceId,pricingMode},practitioner:{slug:practitionerSlug}};
    const href=runInNewContext('('+expression+')',context,{timeout:1000});
    assert.equal(href,`/${locale==='es'?'en':locale}/app/consultations?service=${encodeURIComponent(serviceId)}`);
   }
   const href=runInNewContext('('+expression+')',{locale,es:locale==='es',service:{slug:'remote-energy-support',id:serviceId},practitioner:{slug:practitionerSlug}},{timeout:1000});
   assert.equal(href,`/${locale}/services/remote-energy-support?practitioner=${encodeURIComponent(practitionerSlug)}`);
  }
  assert.equal([...input.matchAll(/<TrackedServiceLink\b[^>]*href=\{requestHref\}/g)].length,2,'both request CTAs use the selected-service route');
  assert.doesNotMatch(input,/\/es\/services\/free-situation-review\?topic=/);
  assert.match(input,/El formulario de solicitud se abre en inglés\./);
 };
 assertRequestContract(service);
 for(const [before,after] of [
  ['es?"en":locale','locale'],
  ['encodeURIComponent(service.id)','encodeURIComponent(service.slug)'],
  ['encodeURIComponent(service.id)','service.id'],
  ['/app/consultations?service=', '/services/free-situation-review?topic='],
  ['/services/remote-energy-support?practitioner=', '/app/consultations?service='],
  ['encodeURIComponent(practitioner.slug)','practitioner.slug'],
  ['href={requestHref}','href="/en/services"'],
  ['El formulario de solicitud se abre en inglés.',''],
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
