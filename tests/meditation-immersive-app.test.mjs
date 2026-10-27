import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("meditation app uses full-screen, stable native YouTube playback and the four owner directions", () => {
  const app = read("components/meditation-practice-app.tsx");
  const css = read("components/meditation-practice-app.module.css");
  const route = read("app/[locale]/meditations/page.tsx");
  const gallery = read("components/holistic-meditation-gallery.tsx");
  for (const text of ["Здоровье и энергия", "Бизнес и деньги", "Отношения", "Магия и развитие", "Египетская", "Майя", "Рейки", "Греческая",
    "Health & energy", "Business & money", "Relationships", "Magic & growth", "Salud y energía", "Negocios y dinero", "Relaciones", "Magia y crecimiento"]) {
    assert.ok(app.includes(text), "missing localized app choice: " + text);
  }
  assert.match(app, /data-meditation-fullscreen-app/);
  assert.match(css, /position:fixed;inset:0/);
  assert.match(css, /height:100dvh;overflow:hidden/);
  assert.match(css, /aspect-ratio:16\/9/);
  assert.match(app, /youtube-nocookie\.com\/embed/);
  assert.match(app, /controls=1&playsinline=1&rel=0&fs=1/);
  assert.match(app, /<iframe key=\{activeVideo\.id\}/);
  assert.doesNotMatch(app, /<AcademyVideoPlayer|autoplay=1|setPlaying\(/);
  assert.match(app, /data-meditation-tradition/);
  assert.match(app, /data-meditation-goal/);
  assert.match(app, /data-meditation-course/);
  assert.match(app, /data-meditation-recording/);
  assert.match(app, /setView\("courses"\)/);
  assert.match(route, /osirisOriginalVideos/);
  assert.match(route, /freeMeditationVideos\(locale\)/);
  assert.match(route, /videos\.some\(video => video\.id === requested\)/);
  assert.match(gallery, /data-open-meditation-app/);
  assert.doesNotMatch(gallery, /<AcademyVideoPlayer/);
  assert.match(app, /mysteries\/maya-aztec\/feathered-serpent/);
  assert.match(app, /principles-of-energywork/);
  assert.match(app, /egyptian-priesthood/);
  assert.match(app, /coaching\/greek/);
});

test("no synthetic or uploaded media introduced", () => {
  const app = read("components/meditation-practice-app.tsx");
  const route = read("app/[locale]/meditations/page.tsx");
  assert.doesNotMatch(app + route, /(?:\.mp3|\.m4a|\.mp4|(?:upload|publish|generateVoice|synthesizeSpeech)\s*\()/);
});
