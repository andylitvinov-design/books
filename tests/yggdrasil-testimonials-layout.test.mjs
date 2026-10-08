import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Reiki Yggdrasil program shows text reviews and video reviews instead of a photo catalog", async () => {
  const [landing, testimonials, data] = await Promise.all([
    readFile("components/yggdrasil-program-landing.tsx", "utf8"),
    readFile("components/yggdrasil-testimonials.tsx", "utf8"),
    readFile("data/academy/yggdrasil-testimonials.ts", "utf8"),
  ]);

  assert.match(landing, /YggdrasilTestimonials locale=\{locale\}/);
  assert.doesNotMatch(landing, /yggdrasil-source-gallery/);
  assert.match(testimonials, /Text reviews/);
  assert.match(testimonials, /Video reviews/);
  assert.match(testimonials, /View original review/);

  for (const id of ["testimonial-1", "testimonial-2", "testimonial-3", "testimonial-4", "testimonial-5"]) {
    assert.match(data, new RegExp(`id: "${id}"`));
  }
  for (const youtubeId of ["wN_SNwZ1Epo", "3Apc8P1Yudc"]) {
    assert.match(data, new RegExp(youtubeId));
  }
});

test("testimonial videos are removed from the English explanation guide", async () => {
  const [guide, data] = await Promise.all([
    readFile("components/yggdrasil-english-video-guide.tsx", "utf8"),
    readFile("data/academy/yggdrasil-testimonials.ts", "utf8"),
  ]);
  assert.doesNotMatch(guide, /wN_SNwZ1Epo/);
  assert.doesNotMatch(guide, /3Apc8P1Yudc/);
  assert.match(data, /wN_SNwZ1Epo/);
  assert.match(data, /3Apc8P1Yudc/);
});
