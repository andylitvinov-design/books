import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(path, "utf8");
test("Reiki landings share viewport stages and closed, accessible source detail", async () => {
  const [route, styles, ygg, module, book, tantra, journey, kundalini] = await Promise.all([
    read("app/[locale]/academy/[[...slug]]/page.tsx"),
    read("app/reiki-landing-screens.css"),
    read("components/yggdrasil-program-landing.tsx"),
    read("components/yggdrasil-module-landing.tsx"),
    read("components/yggdrasil-basic-course-description.tsx"),
    read("components/academy-record-page.tsx"),
    read("components/tantra-reiki-journey.tsx"),
    read("components/kundalini-reiki-course.tsx"),
  ]);
  assert.match(route, /import "@\/app\/reiki-landing-screens\.css"/);
  assert.match(styles, /scroll-snap-type: x proximity/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /summary:focus-visible/);
  assert.match(ygg, /reiki-module-jumps/);
  assert.match(ygg, /yggdrasil-module-grid" tabIndex=\{0\}/);
  assert.match(ygg, /yggdrasil-basic-level-attunements reiki-disclosure/);
  assert.match(ygg, /reiki-optional-capture/);
  assert.match(module, /reiki-roadmap-track/);
  assert.match(module, /reiki-disclosure--archive/);
  assert.match(book, /<details className="reiki-full-manual">/);
  assert.ok(book.indexOf("yggdrasil-description-summary") < book.indexOf("yggdrasil-full-book"), "overview should precede the long manual");
  assert.match(tantra, /tantra-course-hero reiki-screen/);
  assert.match(tantra, /TantraReikiProgrammeModules/);
  assert.match(journey, /tantra-journey__extras"/);
  assert.doesNotMatch(journey, /<details className="tantra-journey__extras" open=/);
  assert.match(kundalini, /reiki-kundalini-levels/);
  assert.match(kundalini, /tabIndex=\{0\}/);
  assert.match(kundalini, /reiki-disclosure--quote/);
  assert.match(kundalini, /kundaliniOriginalManual\.fileName/);
});
