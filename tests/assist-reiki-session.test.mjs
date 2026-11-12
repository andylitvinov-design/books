import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../components/assist-reiki-session.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/assist-reiki-session.module.css", import.meta.url), "utf8");
const parent = readFileSync(new URL("../components/services-studio-offers.tsx", import.meta.url), "utf8");
const booking = readFileSync(new URL("../components/remote-energy-support-booking.tsx", import.meta.url), "utf8");

test("mobile Assist has a real published Reiki directory, not synthetic masters or prices", () => {
  assert.match(parent, /<AssistReikiSession locale=\{locale\}/);
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
  assert.match(booking, /prefill from Assist Reiki/i);
});

test("mobile layout and confirmation disclaimer remain distinct from an actual booking", () => {
  assert.match(styles, /max-width:760px/);
  assert.match(styles, /min-height:44px/);
  assert.match(component, /not a confirmed booking/);
  assert.match(component, /не подтверждённая запись/);
  assert.match(component, /not medical treatment/);
  assert.match(styles, /focus-visible/);
});
