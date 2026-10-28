import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = relative => readFileSync(path.join(root,relative),'utf8');

test('master profile uses real published stats, responsive scenic hero and working navigation', () => {
  const page=read('app/[locale]/masters/[slug]/page.tsx');
  const css=read('app/[locale]/masters/[slug]/profile.module.css');
  assert.match(page,/getPublicPractitioner\(slug, locale\)/);
  assert.match(page,/services\.length/);
  assert.match(page,/publishedMeditations\.length \+ videos\.length \+ sharedAudios\.length/);
  assert.match(page,/MasterProfileActions locale=\{locale\} name=\{name\} slug=\{practitioner\.slug\}/);
  assert.match(page,/href="#practitioner-services"/);
  assert.match(page,/href=\{"\/" \+ locale \+ "\/app\/messages\?to="/);
  assert.match(css,/\.heroMedia\{[^}]*report-lighthouse-coast\.webp/);
  assert.match(css,/\.highlights\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media \(max-width: 650px\)/);
  assert.match(css,/@media \(max-width: 360px\)/);
  assert.doesNotMatch(page,/fakeReview|fakeRating|Math\.random|onClick=.*booked/i);
});

test('save and share controls are functional, accessible and device-scoped', () => {
  const actions=read('app/[locale]/masters/[slug]/master-profile-actions.tsx');
  assert.match(actions,/window\.localStorage\.setItem\(key, "1"\)/);
  assert.match(actions,/window\.localStorage\.removeItem\(key\)/);
  assert.match(actions,/window\.location\.origin \+ window\.location\.pathname/);
  assert.match(actions,/navigator\.share/);
  assert.match(actions,/navigator\.clipboard\.writeText\(url\)/);
  assert.match(actions,/aria-pressed=\{saved\}/);
  assert.match(actions,/role="status"/);
  assert.doesNotMatch(actions,/fetch\(|Supabase|crm_contacts|health_report|medical_result/i);
});

test('existing catalog services get honest decorative fallback assets and green direct request CTAs', () => {
  const card=read('components/master-network-explorer.tsx');
  const css=read('components/master-network-explorer.module.css');
  const segment=card.split('const profileArtwork: Record<string, string> = {')[1]?.split('};')[0] ?? '';
  const assets=[...segment.matchAll(/"((?:\/images\/)[^"]+)"/g)].map(m=>m[1]);
  assert.ok(assets.length >= 5);
  for (const asset of assets) assert.ok(existsSync(path.join(root,'public',asset)),'missing '+asset);
  assert.match(card,/const artwork = coverImage \|\| \(profileView \?/);
  assert.match(card,/<TrackedServiceLink serviceId=\{service.id\} event="order"/);
  assert.match(css,/\.practitionerServicesGrid \{ grid-template-columns:repeat\(3/);
  assert.match(css,/\.practitionerServicesGrid \{[^}]*scroll-snap-type:x mandatory/);
  assert.match(css,/#0c8b61,#08714d/);
});

test('original verified video gallery is a compact touch reel, and player loads only on click', () => {
  const page=read('app/[locale]/masters/[slug]/page.tsx');
  const video=read('components/practitioner-video-gallery.tsx');
  const css=read('components/practitioner-video-gallery.module.css');
  assert.match(page,/PractitionerVideoGallery videos=\{videos\} locale=\{locale\} variant="compact"/);
  assert.match(video,/variant\?:'default'\|'compact'/);
  assert.match(video,/onClick=\{\(\)=>setPlaying\(id\)\}/);
  assert.match(video,/youtube-nocookie\.com/);
  assert.match(css,/\.compact \.grid\{[^}]*scroll-snap-type:x mandatory/);
  assert.doesNotMatch(video,/autoplay on load|dangerouslySetInnerHTML/);
});
