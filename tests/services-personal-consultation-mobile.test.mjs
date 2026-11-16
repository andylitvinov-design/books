import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../components/services-personal-consultation-mobile.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/services-personal-consultation-mobile.module.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8');
const spanishPage = readFileSync(new URL('../app/es/services/page.tsx', import.meta.url), 'utf8');

test('consultation choice shelf is inside the actual Services/Assist route', () => {
  assert.match(page, /<ServicesPersonalConsultationMobile locale=/);
  assert.match(component, /data-assist-personal-consultation/);
  assert.deepEqual([...component.matchAll(/data-consultation-choice="([\w-]+)"/g)].map(m => m[1]), ['free','remote-photo','video']);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
});

test('three distinct real request actions with existing consented CRM and free wizard', () => {
  assert.match(component, /free-situation-review#request-free-review/);
  assert.equal((component.match(/<ContactChannelChooser /g) || []).length, 2);
  assert.equal((component.match(/compactPhone compactTrigger compactMessenger stayAfterSave/g) || []).length, 2);
  assert.match(component, /publicServiceTitle=\{remoteServiceTitle\}/);
  assert.match(component, /publicServiceTitle=\{videoServiceTitle\}/);
  assert.match(component, /not medical diagnosis/i);
  assert.doesNotMatch(component, /<input[^>]+type="file"/);
  assert.doesNotMatch(component, /api\/payments|pay-now|checkout/);
});

test('all three locales have useful distinct offer texts', () => {
  for (const locale of ['ru','en','es']) assert.match(component, new RegExp('  ' + locale + ': \\{'));
  assert.match(component, /"Экспресс-диагностика"/);
  assert.match(component, /"Расширенная диагностика"/);
  assert.match(component, /"Личная диагностика"/);
});

// The dedicated Spanish route shadows /[locale]/services. The same approved
// three-option choice shelf must be available alongside Magical Help.
test('Spanish Services mounts one mobile consultation shelf with all real actions', () => {
  assert.ok(spanishPage.includes('import { ServicesPersonalConsultationMobile } from "@/components/services-personal-consultation-mobile";'));
  assert.equal(spanishPage.split('<ServicesPersonalConsultationMobile locale="es" />').length - 1, 1);
  assert.ok(spanishPage.indexOf('<ServicesAssistMobile locale="es" />') < spanishPage.indexOf('<ServicesPersonalConsultationMobile locale="es" />'));
  assert.ok(spanishPage.indexOf('<ServicesPersonalConsultationMobile locale="es" />') < spanishPage.indexOf('<ServicesConversionHero locale="es" />'));
  assert.ok(spanishPage.includes('<ServicesMagicalHelpMobile locale="es" />'));
  assert.ok(spanishPage.includes('<PublicSiteHeader locale="es"'));
  assert.ok(spanishPage.includes('<ServicesExplorerProvider>'));
});

test('mobile consultation keeps image and right-column CTA when messenger choices expand', () => {
  assert.match(css, /\.card:has\(\[data-compact-messenger="true"\]\) > \.photo\{grid-column:1;grid-row:1 \/ 3\}/);
  assert.match(css, /\.card:has\(\[data-compact-messenger="true"\]\) > \.order\{grid-column:2;grid-row:2;/);
  assert.match(css, /\.card:has\(\[data-compact-messenger="true"\] details\[open\]\)\{padding-bottom:82px\}/);
  assert.match(css, /details\[open\] > div\)\{position:absolute;left:8px;right:8px;bottom:8px;/);
  assert.doesNotMatch(css, /\.card:has\(\.order details\[open\]\) \.photo\{display:none\}/);
  assert.doesNotMatch(css, /\.card:has\(\.order details\[open\]\)\{grid-template-columns:minmax\(0,1fr\)\}/);
});
