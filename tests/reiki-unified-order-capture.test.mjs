import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "../lib/whatsapp-enquiry.js";

const read = (file) => readFile(file, "utf8");

test("Kundalini joins existing Academy three-card capture style on mobile and desktop", async () => {
  const [page, capture, css, academy] = await Promise.all([
    read("components/kundalini-reiki-course.tsx"),
    read("components/kundalini-reiki-order-capture.tsx"),
    read("components/academy-course-capture.module.css"),
    read("components/academy-course-capture.tsx"),
  ]);
  assert.match(page, /<KundaliniReikiOrderCapture locale=\{locale\} \/>/);
  assert.doesNotMatch(page, /https:\/\/wa\.me\/|https:\/\/t\.me\/|enquiryUrl\(/);
  assert.match(capture, /from "\.\/academy-course-capture\.module\.css"/);
  assert.match(capture, /id="kundalini-enquire"/);
  assert.match(capture, /data-consultation-cta="kundalini"/);
  assert.match(capture, /data-kundalini-course-capture/);
  assert.match(capture, /optionOrder\.map/);
  assert.match(capture, /aria-pressed=\{active\}/);
  assert.match(capture, /data-kundalini-choice=\{id\}/);
  assert.match(capture, /<Image src=\{optionImages\[id\]\} alt=""/);
  assert.match(capture, /<ContactChannelChooser/);
  assert.match(capture, /label=\{c\.action\}/);
  assert.match(capture, /stayAfterSave/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /\.choices \{ grid-template-columns: 1fr/);
  assert.match(css, /\.action \{ min-height: 54px/);
  assert.match(academy, /data-academy-course-capture/);
});

test("Kundalini three options contain distinct, public-only, localized messages", async () => {
  const capture = await read("components/kundalini-reiki-order-capture.tsx");
  for (const option of ["free", "personal", "training"]) {
    assert.match(capture, new RegExp(option + ': "/academy/kundalini-reiki/kundalini-manual-level-'));
  }
  for (const phrase of [
    "Try the free Level 1 introduction",
    "Request personal Level 1",
    "Explore all three levels",
    "Попробовать 1-ю ступень бесплатно",
    "Личную инициацию 1-й ступени",
    "Пройти все три ступени",
    "Probar el Nivel 1 gratis",
    "Una iniciación personal de Nivel 1",
    "Conocer los tres niveles",
  ]) assert.ok(capture.includes(phrase), "Missing localized choice: " + phrase);
  assert.match(capture, /whatsappEnquiryUrl\(\{/);
  assert.match(capture, /service: "Kundalini Reiki"/);
  assert.match(capture, /request: c\.messages\[selected\]/);
  assert.match(capture, /option: c\.options\[selected\]\.title/);
  assert.match(capture, /pagePath,/);
  assert.doesNotMatch(capture, /medical history|diagnosis|health score|password/i);
  for (const locale of ["en", "ru", "es"]) {
    const request = "Kundalini Reiki training and current fees";
    const url = whatsappEnquiryUrl({
      locale, service: "Kundalini Reiki", request, option: "Three levels",
      pagePath: "/" + locale + "/academy/reiki/kundalini-reiki",
    });
    assert.equal(new URL(url).hostname, "wa.me");
    const telegram = new URL(telegramEnquiryUrlFromWhatsApp(url));
    assert.equal(telegram.hostname, "t.me");
    assert.ok(telegram.searchParams.get("text")?.includes(request));
  }
});

test("all Reiki/Academy request forms wait for server-confirmed save before showing messenger links", async () => {
  const chooser = await read("components/contact-channel-chooser.tsx");
  for (const file of [
    "components/kundalini-reiki-order-capture.tsx",
    "components/academy-course-capture.tsx",
    "components/reiki-choice-capture.tsx",
    "components/energywork-reiki-capture.tsx",
    "components/reiki-landing-forms.tsx",
  ]) {
    const source = await read(file);
    assert.match(source, /<ContactChannelChooser/);
    assert.match(source, /stayAfterSave/);
  }
  assert.match(chooser, /stayAfterSave\?: boolean/);
  assert.match(chooser, /if \(!stayAfterSave\) router\.push/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries", \{/);
  assert.match(chooser, /operationId: nextId/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /if \(!response\.ok \|\| data\.saved !== true/);
  assert.match(chooser, /setSaved\(\{ saved: true, referenceCode: data\.referenceCode \}\)/);
  assert.match(chooser, /data-contact-channel": "whatsapp"/);
  assert.match(chooser, /data-contact-channel": "telegram"/);
  // An unsubmitted or failed request must never produce a fabricated CRM receipt.
  assert.match(chooser, /if \(busy \|\| saved\) return/);
  assert.match(chooser, /setError\(c\.error\)/);
});
