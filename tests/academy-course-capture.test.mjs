import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { whatsappEnquiryUrl } from "../lib/whatsapp-enquiry.js";

const read = (...parts) => readFileSync(path.join(process.cwd(), ...parts), "utf8");

test("Academy footers use one consistent three-course enquiry instead of generic training links", () => {
  const hub = read("components", "academy-hub.tsx");
  const capture = read("components", "academy-course-capture.tsx");
  assert.match(hub, /import \{ AcademyCourseCapture \}/);
  assert.equal((hub.match(/<AcademyCourseCapture locale=\{locale\} \/>/g) || []).length, 3);
  assert.doesNotMatch(hub, /<PublicConsultationCta/);
  assert.match(capture, /data-consultation-cta="academy"/); // suppress duplicated global footer
  assert.match(capture, /data-academy-course-capture/);
});

test("all three courses are selectable and resolve to their own Academy detail pages", () => {
  const component = read("components", "academy-course-capture.tsx");
  for (const name of ["Tantra Reiki", "Kundalini Reiki", "Reiki Yggdrasil"]) {
    assert.ok(component.includes(name), name);
  }
  for (const slug of ["tantra-reiki", "kundalini-reiki", "yggdrasil"]) {
    assert.match(component, new RegExp('path: "' + slug + '"'));
  }
  assert.match(component, /onClick=\{\(\) => setSelected\(id\)\}/);
  assert.match(component, /aria-pressed=\{active\}/);
  assert.match(component, /"\/academy\/reiki\/"/);
  assert.match(component, /href=\{coursePath\}/);
});

test("course-specific WhatsApp enrolment requests are opt-in and measurable", () => {
  const component = read("components", "academy-course-capture.tsx");
  assert.match(component, /whatsappEnquiryUrl\(\{/);
  assert.match(component, /service: course\.title/);
  assert.match(component, /pagePath: coursePath/);
  assert.match(component, /academy_course_enquiry_click/);
  assert.match(component, /data-contact-channel/);
  assert.match(component, /No message is sent until you press Send/);
  assert.match(component, /запись подтверждается лично/);

  for (const locale of ["en", "ru", "es"]) {
    for (const title of ["Tantra Reiki", "Kundalini Reiki", "Reiki Yggdrasil"]) {
      const url = new URL(whatsappEnquiryUrl({
        locale,
        service: title,
        request: "Please confirm current dates and availability.",
        pagePath: "/" + locale + "/academy/reiki/" + title.toLowerCase().replace(/ /g, "-"),
      }));
      assert.equal(url.hostname, "wa.me");
      assert.equal(url.pathname, "/14376066502");
      assert.match(url.searchParams.get("text") || "", new RegExp(title));
    }
  }
});

test("Academy course capture follows blue design and fits mobile widths", () => {
  const css = read("components", "academy-course-capture.module.css");
  assert.match(css, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(css, /background: #e66d50/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 800px\)/);
  assert.match(css, /grid-template-columns: 1fr/);
  assert.match(css, /:focus-visible/);
});
