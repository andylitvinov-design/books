import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const guide = read("components/yggdrasil-source-study-guide.tsx");
const guideStyles = read("components/yggdrasil-source-study-guide.module.css");
const library = read("components/yggdrasil-superskills-sources-page.tsx");
const routing = read("app/[locale]/academy/[[...slug]]/page.tsx");
const nav = read("components/reiki-course-side-nav.tsx");
const freeArticle = read("components/yggdrasil-free-initiation.tsx");
const reviews = read("components/yggdrasil-testimonials.tsx");

test("landing overview is a compact three-path selector rather than duplicate 5-level/6-instructor/19-link archive", () => {
  assert.match(guide, /mode === "overview" \? \(/);
  assert.match(guide, /const showLevels = mode === "basic"/);
  assert.match(guide, /const showInstructor = mode === "instructor"/);
  assert.match(guide, /mode !== "overview" \? <div className=\{styles\.chapter\} aria-labelledby="superskills-originals"/);
  assert.match(guide, /className=\{styles\.pathCards\}/);
  assert.match(guide, /"\/superskills-sources"/);
  assert.match(guideStyles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(guideStyles, /\.pathCards a/);
  assert.match(guideStyles, /@media \(max-width: 650px\)/);
});

test("all six source Instructor blocks include their 23 attunement names in EN/RU/ES", () => {
  const blocks = guide.split("const instructorTracks:")[1].split("const resources:")[0];
  const matches = [...blocks.matchAll(/themes: \{ en: \[([^\]]+)\], ru: \[([^\]]+)\], es: \[([^\]]+)\] \}/g)];
  assert.equal(matches.length, 6);
  for (const [langIndex, lang] of ["en", "ru", "es"].entries()) {
    const counts = matches.map((row) => row[langIndex + 1].split(", ").length);
    assert.deepEqual(counts, [4, 3, 4, 4, 3, 5], "incorrect source attunement counts for " + lang);
    assert.equal(counts.reduce((sum, n) => sum + n, 0), 23);
  }
  for (const name of ["Chakras", "U-Sin", "Meridians", "Hypnosis", "Golden Calf", "Co-tuning", "Easy communication", "Fetch", "Fountain of Life", "Assemblage point", "Wheel of Immortality", "Yoni-Lingam"]) {
    assert.ok(blocks.includes(name), "missing original setting " + name);
  }
  assert.match(guide, /<details className=\{styles\.track\}/);
  assert.match(guide, /track\.themes\[locale\]\.length/);
});

test("nineteen original Reiki/entry links are grouped on a standalone source archive without mixing Temple/Tantra courses", () => {
  assert.match(routing, /child === "superskills-sources"\) return <YggdrasilSuperSkillsSourcesPage locale=\{locale\}/);
  assert.match(routing, /if \(child === "superskills-sources"\) return locale === "ru"/);
  assert.match(library, /mode="resources"/);
  assert.match(nav, /key: "superskills-sources"/);
  assert.match(guide, /resourceCategories\.map/);
  assert.match(guide, /const resourceCategories: Array/);
  for (const path of ["/reiki.html", "/shamanic-energy-healing-free-program.html", "testimonials-1.html", "testimonials-2.html", "questions-to-get-the-free-class-of-runic-reiki.html"]) {
    assert.ok(guide.includes(path), "missing " + path);
  }
  const resourcesBlock = guide.split("const resources:")[1].split("const resourceCategories:")[0];
  // 5 levelSource members + 14 single source objects = 19 independently linked URLs.
  assert.equal((resourcesBlock.match(/\{ url:/g) ?? []).length, 14);
  assert.match(resourcesBlock, /\.\.\.levelSources\.map/);
});

test("archived first-level source video is click-to-play and appropriately localised", () => {
  assert.match(freeArticle, /AcademyVideoPlayer youtubeId="DYo-fG-SyKw" title=\{c\.videoTitle\}/);
  assert.match(freeArticle, /"Оригинальное вводное видео/);
  assert.match(freeArticle, /"Original Level 1 introduction/);
  assert.match(freeArticle, /"Introducción original al Nivel 1/);
  assert.match(freeArticle, /href=\{readingSource\}/);
  const player = read("components/academy-video-player.tsx");
  assert.match(player, /if \(playing\)/);
  assert.match(player, /youtube-nocookie\.com\/embed/);
  assert.match(player, /setPlaying\(true\)/);
});

test("historical testimonials are reachable where original student reviews appear, never represented as proven outcomes", () => {
  assert.match(reviews, /testimonials-1\.html/);
  assert.match(reviews, /testimonials-2\.html/);
  assert.match(reviews, /Older student reports are personal experiences, not guaranteed outcomes/);
  assert.match(reviews, /yggdrasilVideoTestimonials\.map/);
  assert.match(reviews, /<AcademyVideoPlayer youtubeId=\{video\.youtubeId\}/);
  assert.match(read("app/academy.css"), /yggdrasil-testimonials__historical-links/);
});
