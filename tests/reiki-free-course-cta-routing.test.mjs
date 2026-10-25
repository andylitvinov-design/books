import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const canonical = "/en/academy/principles-of-energywork/learn";

test("one canonical EN learner destination is shared by all free Reiki COURSE capture buttons", () => {
  const shared = read("lib/academy/reiki-free-course.ts");
  assert.match(shared, /export const REIKI_FREE_COURSE_PATH = "\/en\/academy\/principles-of-energywork\/learn"/);
  for (const path of [
    "components/academy-hub.tsx",
    "components/academy-free-course-banner.tsx",
    "components/reiki-referral-landing.tsx",
    "components/academy-record-page.tsx",
    "components/tantra-free-initiation.tsx",
    "components/principles-of-energywork.tsx",
    "app/[locale]/academy/reiki/tantra-reiki/discover/page.tsx",
    "components/yggdrasil-program-landing.tsx",
    "components/yggdrasil-module-landing.tsx",
    "components/yggdrasil-free-initiation.tsx",
    "components/kundalini-reiki-course.tsx",
  ]) {
    assert.match(read(path), /REIKI_FREE_COURSE_PATH/, path);
  }
  assert.equal(canonical, "/en/academy/principles-of-energywork/learn");
});

test("main Reiki hero CTAs go to the interactive learner rather than an overview or lead form", () => {
  const hub = read("components/academy-hub.tsx");
  assert.match(hub, /id: "academy-featured-principles-energywork"[\s\S]*?href: "\/" \+ locale \+ "\/academy\/principles-of-energywork",[\s\S]*?courseHref: REIKI_FREE_COURSE_PATH,[\s\S]*?actionLabel: /);

  const core = read("components/principles-of-energywork.tsx");
  assert.match(core, /const learnPath = REIKI_FREE_COURSE_PATH/);
  assert.match(core, /href=\{learnPath\} className=\{styles.primaryButton\} data-energywork-interactive-course/);

  const referral = read("components/reiki-referral-landing.tsx");
  assert.match(referral, /const courseHref = REIKI_FREE_COURSE_PATH/);
  assert.doesNotMatch(referral, /learn\?start=1/);

  const banner = read("components/academy-free-course-banner.tsx");
  assert.match(banner, /const href = course\.id === "stress"[\s\S]*?: REIKI_FREE_COURSE_PATH/);
  assert.match(banner, /detailsPath: "academy\/reiki\/tantra-reiki\/free-initiation"/);
  assert.match(banner, /detailsPath: "academy\/reiki\/yggdrasil\/free-initiation"/);
  assert.match(banner, /course\.id === "stress"/);

  const tantra = read("components/academy-record-page.tsx");
  assert.match(tantra, /href=\{REIKI_FREE_COURSE_PATH\}[^>]*>[^<]*\{locale === "ru"/);
  assert.match(read("components/tantra-free-initiation.tsx"), /freeCourseBridge\} href=\{REIKI_FREE_COURSE_PATH\}/);
  assert.match(read("app/[locale]/academy/reiki/tantra-reiki/discover/page.tsx"), /const freeCourse=REIKI_FREE_COURSE_PATH/);
});

test("Level 1 gift links on the three Reiki system landings open Reiki Practitioner", () => {
  const ygg = read("components/yggdrasil-program-landing.tsx");
  const tantra = read("components/academy-record-page.tsx");
  const journey = read("components/tantra-reiki-journey.tsx");
  const kundalini = read("components/kundalini-reiki-course.tsx");
  const routes = read("app/[locale]/academy/[[...slug]]/page.tsx");

  assert.ok(tantra.includes('<Link className="tantra-course-hero__cta" href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>'));
  assert.ok(journey.includes('<Link href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>{focus.request}'));
  assert.ok(kundalini.includes('<Link href={REIKI_FREE_COURSE_PATH} className={styles.heroSecondary} data-reiki-course-cta>'));
  assert.equal(ygg.split('href={REIKI_FREE_COURSE_PATH} data-reiki-course-cta>{text.free}').length - 1, 2);
  assert.doesNotMatch(kundalini, /freeLevelHref/);
  assert.match(tantra, /Get Tantra Reiki Level 1 as a gift/);
  assert.match(kundalini, /Request free Level 1/);
  assert.match(ygg, /Get Level 1 for free/);

  // Teacher-guided initiation information and request routes remain available.
  assert.ok(routes.includes('if (key === "reiki/tantra-reiki/free-initiation") return <TantraFreeInitiation locale={locale} />;'));
  assert.ok(routes.includes('if (key === "reiki/kundalini-reiki/free-initiation") return <KundaliniFreeInitiation locale={locale} />;'));
  assert.ok(routes.includes('if (child === "free-initiation") return <YggdrasilFreeInitiation locale={locale} />;'));
  assert.match(read("components/principles-of-energywork.tsx"), /href="#kundalini-free-request"/);
});
