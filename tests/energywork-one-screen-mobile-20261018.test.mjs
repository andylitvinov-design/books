import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("components/principles-of-energywork.tsx", "utf8");
const css = () => readFile("components/principles-of-energywork.module.css", "utf8");

test("Energywork landing has one compact mobile concept per visible screen", async () => {
  const [page, styles] = await Promise.all([source(), css()]);
  for (const section of ["intro", "meditation", "foundations", "initiation"]) {
    assert.ok(page.includes('data-energywork-screen="' + section + '"'), section);
  }
  assert.match(page, /data-energywork-screen=\{system\.key\}/);
  assert.match(styles, /\.courseDeck > \.hero[\s\S]*?min-height: 0/);
  assert.match(styles, /\.courseDeck \.foundationCard\s*\{[\s\S]*?grid-template-columns: 36px minmax\(0, 1fr\)/);
  assert.match(styles, /\.courseDeck \.systemCard\s*\{[\s\S]*?flex-direction: column/);
  assert.match(styles, /@media \(max-width: 550px\)/);
  assert.doesNotMatch(styles, /\.courseDeck > section\s*\{[^}]*overflow: hidden/);
});

test("Flight to the Sun has one description, retains video, poster fallback and source link", async () => {
  const page = await source();
  // Foundations are unnumbered preparation before Flight; do not use them as its closing boundary.
  const flight = page.match(/<section\b[^>]*id="energywork-flight-to-sun"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.ok(flight, 'The original Flight section remains present');
  const foundations = page.indexOf('data-energywork-screen="foundations"');
  assert.ok(foundations >= 0 && foundations < page.indexOf(flight));
  assert.match(flight, /data-energywork-screen="meditation" data-energywork-step="1"/);
  assert.match(flight, /<h2 id="flight-to-sun-title">\{v\.flightTitle\}<\/h2>/);
  assert.match(flight, /<AcademyVideoPlayer youtubeId=\{flight\.youtubeId\}/);
  assert.match(flight, /data-video-source-pending="flight-to-sun"/);
  assert.match(flight, /https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.match(flight, /href=\{"https:\/\/www\.youtube\.com\/watch\?v=" \+ flight\.youtubeId\}/);
  assert.match(flight, /<Image src=\{flight\?\.image \?\? "\/academy\/reiki-yggdrasil\/source\/toltec-tradition\.jpg"\}/);
  assert.equal((flight.match(/<p>\{v\.flightLead\}<\/p>/g) || []).length, 1);
  assert.doesNotMatch(flight, /<h3>\{v\.flightTitle\}<\/h3>/);
  assert.doesNotMatch(flight, /<p>\{v\.flightLead\}<\/p>[\s\S]*<p>\{v\.flightLead\}<\/p>/);
});

test("Each Reiki path keeps its initiation links, original videos and optional resources", async () => {
  const [page, styles] = await Promise.all([source(), css()]);
  assert.match(page, /href=\{academyUrl\(locale, system\.free\)\}/);
  assert.match(page, /href=\{academyUrl\(locale, system\.study\)\}/);
  assert.match(page, /<EnergyworkReikiCapture locale=\{locale\} course=\{system\.key\} \/>/);
  assert.match(page, /<EnergyworkVideoArchive locale=\{locale\} \/>/);
  assert.match(page, /<details className=\{styles\.captureDisclosure\}>/);
  assert.match(page, /<details className=\{styles\.extraVideoDisclosure\}>/);
  assert.match(page, /<details className=\{styles\.archiveDisclosure\}>/);
  assert.match(page, /youtubeId="DYo-fG-SyKw"/);
  assert.match(styles, /\.captureDisclosure > summary:focus-visible/);
  assert.match(page, /locale === "ru"[\s\S]*?locale === "es"/);
  // All locales intentionally share the owner's exact English free-course target.
  const shared = await readFile("lib/academy/reiki-free-course.ts", "utf8");
  assert.match(shared, /export const REIKI_FREE_COURSE_PATH = "\/en\/academy\/principles-of-energywork\/learn"/);
  assert.match(page, /import \{ REIKI_FREE_COURSE_PATH \} from "@\/lib\/academy\/reiki-free-course"/);
  assert.match(page, /const learnPath = REIKI_FREE_COURSE_PATH/);
  assert.match(page, /href=\{learnPath\} className=\{styles\.primaryButton\} data-energywork-interactive-course/);
  assert.match(page, /href=\{learnPath\} className=\{styles\.primaryButton\} data-energywork-final-online/);
  assert.match(page, /function academyUrl\(locale: PublicLocale, path: string\) \{\s*return "\/" \+ locale \+ "\/academy\/" \+ path;/);
  for (const media of ['tantraPractice', 'yggdrasilMeditation', 'kundaliniMeditation'])
    assert.ok(page.includes('<AcademyVideoPlayer youtubeId={' + media + '.youtubeId}'), media + ' keeps its original recording');
  const originals = [
    ['flight-to-sun', 'HqfixazXqRY'], ['tantra-reiki', 'w2BN-HYmHUk'],
    ['reiki-yggdrasil', '80xZ7jN6o2Y'], ['kundalini-reiki', '_IOX0E8N-To'],
  ];
  const registry = await readFile("data/academy/english-guided-meditations.ts", "utf8");
  assert.deepEqual([...registry.matchAll(/key: "([^"]+)",[\s\S]*?youtubeId: "([^"]+)"/g)].map(match => [match[1], match[2]]), originals);
  for (const [index, media] of ['flight', 'tantraPractice', 'yggdrasilMeditation', 'kundaliniMeditation'].entries())
    assert.ok(page.includes('const ' + media + ' = englishGuidedMeditations.find((item) => item.key === "' + originals[index][0] + '")'), media + ' uses its own approved recording');
  assert.doesNotMatch(page, /autoPlay|autoplay/);
});
