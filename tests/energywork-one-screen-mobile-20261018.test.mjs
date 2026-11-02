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
  const flight = page.slice(page.indexOf('id="energywork-flight-to-sun"'), page.indexOf('data-energywork-screen="foundations"'));
  assert.match(flight, /<h2 id="flight-to-sun-title">\{v\.flightTitle\}<\/h2>/);
  assert.match(flight, /<AcademyVideoPlayer youtubeId=\{flight\.youtubeId\}/);
  assert.match(flight, /data-video-source-pending="flight-to-sun"/);
  assert.match(flight, /https:\/\/www\.youtube\.com\/watch\?v=/);
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
  assert.match(page, /\(locale === "es" \? "en" : locale\)/);
});
