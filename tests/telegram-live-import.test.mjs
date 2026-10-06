import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("imports live Psychic Alchemy posts 1060–1078 without service/pinned duplicates", () => {
  const data = JSON.parse(readFileSync(path.join(root, "data/telegram-psychic-alchemy-live-import.json"), "utf8"));
  const ids = data.posts.map(({ id }) => id);
  assert.equal(ids[0], 1060);
  assert.equal(ids.at(-1), 1078);
  assert.equal(ids.includes(1062), false);
  assert.equal(ids.includes(1074), false);
  assert.equal(ids.includes(1070), true);
});

test("publishes Nux Vomica as a canonical card with its source photo and linked comparison", () => {
  const ru = readFileSync(path.join(root, "content/remedies/ru/nux-vomica.md"), "utf8");
  const en = readFileSync(path.join(root, "content/remedies/en/nux-vomica.md"), "utf8");
  assert.match(ru, /primary_source_message: message1070/);
  assert.match(ru, /message1069/);
  assert.match(en, /translated-from-ru/);
  assert.equal(existsSync(path.join(root, "public/media/remedies/nux-vomica/message1070-1.jpg")), true);
});

test("archives the new source photos locally instead of depending on Telegram CDN playback", () => {
  for (const file of [
    "public/media/remedies/secale-cornutum/message1061-1.jpg",
    "public/media/remedies/nux-vomica/message1070-1.jpg",
    "public/media/alchemy/latest/message1063-1.jpg",
    "public/media/alchemy/latest/message1064-1.jpg",
    "public/media/alchemy/latest/message1065-1.jpg",
  ]) assert.equal(existsSync(path.join(root, file)), true, file);
});
