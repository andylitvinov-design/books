import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/services-magical-help-mobile.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/services-magical-help-mobile.module.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/[locale]/services/page.tsx", import.meta.url), "utf8");

test("the existing Services route contains one independent mobile Magical Help section", () => {
  assert.match(page, /<ServicesMagicalHelpMobile locale=\{locale as Locale\}/);
  assert.equal((page.match(/<ServicesMagicalHelpMobile/g) || []).length, 1);
  assert.match(component, /data-assist-magical-help/);
  assert.match(styles, /^\.section\{display:none\}/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:350px\)/);
});
test("exactly three distinct symbolic offerings have real non-payment request paths", () => {
  assert.match(component, /const kinds = \["health", "money", "energy"\] as const/);
  assert.match(component, /ContactChannelChooser/);
  assert.match(component, /publicServiceTitle=\{item.title\}/);
  assert.match(component, /whatsappEnquiryUrl/);
  assert.match(component, /services\/remote-energy-support/);
  assert.match(component, /holistic-support\/mandala\?mode=photo/);
  assert.ok(component.includes('href={"/" + locale + "/masters"}'));
  assert.doesNotMatch(component, /€\d+|confirmed booking|guaranteed income/i);
});
test("Russian, English and Spanish titles, privacy language and links are present", () => {
  for (const phrase of ["Мандала · Здоровье", "Мандала · Деньги", "Энергетическая подкачка",
    "Mandala · Wellbeing", "Mandala · Money", "Energy recharge",
    "Mandala · Bienestar", "Mandala · Dinero", "Recarga energética"]) {
    assert.ok(component.includes(phrase), phrase);
  }
  assert.match(component, /не лечение или финансовые рекомендации/);
  assert.match(component, /not medical treatment or financial advice/);
  assert.match(component, /no tratamientos médicos ni asesoramiento financiero/);
});
