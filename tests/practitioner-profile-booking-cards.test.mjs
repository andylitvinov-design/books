import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('public practitioner profile is compact, mobile-first and shows approved service cards before biography', async () => {
  const page = await read('app/[locale]/masters/[slug]/page.tsx');
  const css = await read('app/[locale]/masters/[slug]/profile.module.css');
  assert.match(page, /profile\.photoPath/);
  assert.match(page, /styles\.portrait/);
  assert.match(page, /id="practitioner-services"/);
  assert.match(page, /<PractitionerServicesGrid services=\{services\} locale=\{locale\}/);
  assert.ok(page.indexOf('id="practitioner-services"') < page.indexOf('className={styles.about}'), 'service booking must precede full biography');
  assert.match(page, /<details className=\{styles\.disclosure\}>/);
  assert.match(page, /PractitionerPresentationVideo/);
  assert.match(page, /practitioner\.credentials/);
  assert.doesNotMatch(page, /services-studio-hero/);
  assert.match(css, /\.identity\s*\{\s*display:\s*flex/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /min-width:\s*0/);
});

test('profile shares canonical marketplace service card, preserving direct request and tracking', async () => {
  const serviceCards = await read('components/master-network-explorer.tsx');
  const css = await read('components/master-network-explorer.module.css');
  assert.match(serviceCards, /export function PractitionerServicesGrid/);
  assert.match(serviceCards, /<ServiceCard key=\{service\.id\} service=\{service\} locale=\{locale\} profileView/);
  assert.match(serviceCards, /<ServiceFunnelImpression serviceId=\{service\.id\}/);
  assert.match(serviceCards, /<TrackedServiceLink serviceId=\{service\.id\} event="order"/);
  assert.match(serviceCards, /"\/app\/consultations\?service=" \+ encodeURIComponent\(service\.id\)/);
  assert.match(serviceCards, /"\/services\/remote-energy-support\?practitioner="/);
  assert.match(serviceCards, /detailsHref/);
  assert.match(serviceCards, /styles\.secondary/);
  assert.match(serviceCards, /styles\.primary/);
  assert.match(serviceCards, /service\.pricingMode === "free"/);
  assert.match(serviceCards, /profileCoverFallback/);
  assert.match(css, /\.practitionerServicesGrid/);
  assert.match(css, /\.profileServiceCard > \.actions/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\.8fr\) minmax\(0,1\.2fr\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
});

test('only actual published remote-energy service enables practitioner shortcut; links are localized', async () => {
  const page = await read('app/[locale]/masters/[slug]/page.tsx');
  assert.match(page, /hasEnergySupport = services\.some/);
  assert.match(page, /service\.slug === "remote-energy-support"/);
  assert.match(page, /\{hasEnergySupport && \(/);
  assert.match(page, /encodeURIComponent\(practitioner\.slug\)/);
  for (const expected of ['Выбрать услугу','Elegir un servicio','Choose a service',
    'Квалификация проверена','Formación verificada','Credentials verified']) {
    assert.ok(page.includes(expected), 'localized copy missing: ' + expected);
  }
});
