import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const player = read("components/holistic-support-mobile.tsx");
const route = read("app/[locale]/holistic-support/mobile/page.tsx");
const css = read("components/holistic-support-mobile.module.css");

test("visible video master shortcut links the selected recording to its existing localized profile", () => {
  assert.match(player, /const selected = relevantVideos\.find\(video => video\.id === selectedId\) \?\? relevantVideos\[0\]/);
  assert.match(player, /selected\?\.masterProfile \? <Link/);
  assert.match(player, /href=\{"\/" \+ locale \+ "\/masters\/" \+ selected\.masterProfile\.slug\}/);
  assert.match(player, /data-support-video-master=\{selected\.masterProfile\.slug\}/);
  assert.match(player, /aria-label=\{t\.masterProfile \+ ": " \+ selected\.masterProfile\.name\}/);
  assert.match(player, /selected\.masterProfile\.image/);
  assert.match(player, /prefetch=\{false\} className=\{styles\.heroMasterLink\}/);
  assert.match(player, /className=\{styles\.heroMasterArrow\}/);
  assert.ok(player.indexOf("data-support-video-master=") > player.indexOf("data-support-player data-playing="));
  assert.ok(player.indexOf("data-support-video-master=") < player.indexOf("className={styles.iframeWrap}"));
});

test("only verified originals get Andrey's published master slug and portrait", () => {
  assert.match(route, /slug: "andy-litvinov"/);
  assert.match(route, /name: locale === "ru" \? "Андрей Литвинов" : "Andrey Litvinov"/);
  assert.equal((route.match(/masterProfile: andreyMasterProfile\(/g) ?? []).length, 3);
  assert.match(player, /masterProfile\?: \{ slug: string; name: string; image: string \}/);
  const path = "public/images/holistic-house/portrait-static/andy-192-86e7f5b9ca61.webp";
  const image = readFileSync(new URL("../" + path, import.meta.url));
  assert.equal(image.toString("ascii", 0, 4), "RIFF");
  assert.equal(image.toString("ascii", 8, 12), "WEBP");
});

test("badge is accessible and mobile-safe across EN/RU/ES, without covering the filters", () => {
  for (const translation of [
    'masterProfile: "Open master profile", videoMaster: "Meditation guide"',
    'masterProfile: "Открыть страницу мастера", videoMaster: "Мастер медитаций"',
    'masterProfile: "Abrir perfil del guía", videoMaster: "Guía de meditación"',
  ]) assert.ok(player.includes(translation), translation);
  assert.match(css, /\.heroMasterLink \{[\s\S]*?z-index: 4; top: 83px/);
  assert.match(css, /\.heroMasterLink:focus-visible \{ outline:/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.heroMasterLink/);
  assert.match(css, /@media \(max-width: 350px\) \{\s*\.heroMasterLink/);
  assert.match(css, /max-width: min\(61%, 176px\)/);
  assert.match(css, /\.heroMasterCopy strong, \.heroMasterCopy small \{[\s\S]*?text-overflow: ellipsis/);
});
