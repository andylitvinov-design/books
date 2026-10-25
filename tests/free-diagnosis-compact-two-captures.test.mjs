import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("free diagnosis has one phone input and two linked captures around testimonials", () => {
  const offers = read("components/free-diagnosis-offers.tsx");
  const landing = read("components/free-entry-landing.tsx");
  const short = read("components/free-diagnosis-short-form.tsx");
  const css = read("components/free-diagnosis-short-form.module.css");
  assert.match(offers, /renderCapture\("top"\)/);
  assert.match(offers, /renderCapture\("bottom"\)/);
  assert.match(offers, /const \[phone, setPhone\] = useState\(""\)/);
  assert.match(offers, /phone=\{phone\} onPhoneChange=\{setPhone\}/);
  assert.match(offers, /href="#request-free-review"/);
  assert.ok(landing.indexOf("<PersonalTestimonials") < landing.indexOf("</FreeDiagnosisOffers>"));
  assert.match(short, /type="tel" name="phone"/);
  assert.match(short, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/);
  assert.match(short, /window\.location\.assign\("\/" \+ locale \+ "\/coaching\/intake"\)/);
  assert.doesNotMatch(short, /fetch\(|name="email"|<textarea|<select/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test("paid and Wu Xing requests keep CRM-first handoff and consent", () => {
  const offers = read("components/free-diagnosis-offers.tsx");
  const capture = read("components/compact-lead-capture.tsx");
  assert.match(offers, /phoneOnly variant="diagnosis" contactValue=\{phone\} onContactChange=\{setPhone\}/);
  assert.match(capture, /phoneOnly && !contact\.phone/);
  assert.match(capture, /contactConsent: true/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /setReference\(committedReference\)/);
  assert.match(capture, /window\.open\("about:blank", "_blank"\)/);
  assert.match(capture, /handoffWindow\.location\.replace\(destination\)/);
});
