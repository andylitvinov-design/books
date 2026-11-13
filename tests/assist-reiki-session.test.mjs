import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/assist-reiki-session.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/assist-reiki-session.module.css", import.meta.url), "utf8");
const parent = readFileSync(new URL("../app/[locale]/services/page.tsx", import.meta.url), "utf8");
const booking = readFileSync(new URL("../components/remote-energy-support-booking.tsx", import.meta.url), "utf8");

test("mobile Assist has a real published Reiki directory, not synthetic masters or prices", () => {
  assert.match(parent, /<AssistReikiSession locale=\{locale as Locale\}/);
  assert.match(component, /\/api\/public\/remote-energy-support-masters\?locale=/);
  assert.match(component, /&kind=reiki/);
  assert.match(component, /priceFor\(master, duration\)/);
  assert.match(component, /slice\(0, 3\)/);
  assert.match(component, /Array\.isArray\(payload\?\.masters\)/);
  assert.doesNotMatch(component, /Моника Мансилья|Ольга Чичи|40\s*€|45\s*€/);
});

test("picker offers 10/20/30 minutes, date and time with real booking handoff", () => {
  assert.match(component, /const durations: readonly Duration\[\] = \[10, 20, 30\]/);
  assert.match(component, /type="date"/);
  assert.match(component, /type="time"/);
  assert.match(component, /aria-pressed=\{duration === value\}/);
  assert.match(component, /preferredAt > Date\.now\(\) \+ 5 \* 60 \* 1000/);
  assert.match(component, /\/services\/remote-energy-support\?/);
  assert.match(component, /serviceHref/);
  assert.match(booking, /Assist Reiki passes only/i);
});

test("mobile layout and confirmation disclaimer remain distinct from an actual booking", () => {
  assert.match(styles, /max-width:760px/);
  assert.match(styles, /min-height:44px/);
  assert.match(component, /not a confirmed booking/);
  assert.match(component, /не подтверждённая запись/);
  assert.match(component, /not medical treatment/);
  assert.match(styles, /focus-visible/);
});

test("Reiki directory has a narrow missing-database browser gate, never a blanket 503 exception", () => {
  const browser = readFileSync(new URL("../scripts/verify-public-services-production.mjs", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/public/remote-energy-support-masters/route.ts", import.meta.url), "utf8");
  assert.match(browser, /"\/api\/public\/remote-energy-support-masters"/);
  assert.match(browser, /\[data-assist-reiki-session\]/);
  assert.match(browser, /url\.origin === origin && url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(browser, /unexpectedUnavailable = unavailable\.filter\(path => !noDatabase503Paths\.has\(path\)\)/);
  assert.match(browser, /if \(!process\.env\.HH_APP_SUPABASE_URL\)/);
  assert.match(browser, /expectedUnavailable\.has\(entry\.path\)/);
  assert.match(browser, /assert\.deepEqual\(diagnostics\.pageErrors, \[\]/);
  assert.match(route, /listReikiSupportMasters\(locale\)/);
  assert.match(route, /status: 503/);
  assert.match(component, /setFailed\(true\)/);
});
