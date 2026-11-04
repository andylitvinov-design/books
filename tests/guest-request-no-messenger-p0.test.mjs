import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("sitewide request can be saved independently of optional Telegram/WhatsApp", () => {
  const src = read("components/compact-lead-capture.tsx");
  const css = read("components/compact-lead-capture.module.css");
  const handler = src.slice(src.indexOf("async function chooseChannel("),src.indexOf("\n  return (\n    <section"));
  assert.match(src,/async function chooseChannel\(channel\?: Channel\)/);
  assert.match(src,/data-compact-request-only/);
  assert.match(src,/void chooseChannel\(\)/);
  assert.match(src,/Send request without a messenger/);
  assert.match(src,/Отправить заявку без мессенджера/);
  assert.match(src,/Enviar solicitud sin mensajería/);
  assert.match(handler,/if \(channel\) \{\s*handoffWindow = window\.open/);
  assert.match(handler,/if \(!channel\) return/);
  assert.match(handler,/contact\.email \? "Email" : "Phone \(manual\)"/);
  assert.ok(handler.indexOf('fetch("/api/service-enquiries"') < handler.indexOf("if (!channel) return"));
  assert.match(handler,/result\?\.saved !== true/);
  assert.match(css,/\.requestSubmit:disabled/);
});

test("homepage and Reiki phone capture submits without a messenger app", () => {
  const src=read("components/contact-channel-chooser.tsx");
  const css=read("components/contact-channel-chooser.module.css");
  assert.match(src,/data-contact-save-without-messenger/);
  assert.match(src,/onSubmit=\{event => \{ event\.preventDefault\(\); void saveEnquiry\(\); \}\}/);
  assert.match(src,/compactSave: "Save request without a messenger"/);
  assert.match(src,/compactSave: "Сохранить заявку без мессенджера"/);
  assert.match(src,/compactSave: "Guardar solicitud sin mensajería"/);
  assert.match(src,/if \(channel\) \{[\s\S]*?window\.open/);
  assert.match(src,/contactConsent: consent/);
  assert.match(css,/\.compactSave:disabled/);
});
