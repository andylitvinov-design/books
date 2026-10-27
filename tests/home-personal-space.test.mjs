import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { homeSpaceSummary } from '../lib/home-personal-space.mjs';

const id = '7b62e07b-bb56-4af6-8140-6185f52eb682';
const courseId = '03302c2d-72ca-4a97-8165-7587021459a9';
const base = { account: { id, onboardingState: 'active' }, results: [],
  savedReports: [], practitioner: null, practice: null };

test('unverified or absent accounts never become a signed-in My Space', () => {
  for (const account of [null, {}, { id: 'not-a-uuid', onboardingState: 'active' }]) {
    assert.equal(homeSpaceSummary({ ...base, account }), null);
  }
});

test('a new user gets a real existing test entry, not fabricated progress', () => {
  assert.deepEqual(homeSpaceSummary(base), {
    accountId: id, professional: false, owner: false, next: 'tests',
    courseId: null, completedLessons: null,
  });
});

test('an actually available unread report takes priority; withdrawn reports do not', () => {
  const report = { available: true, unread: true, title: 'PRIVATE REPORT' };
  const actual = homeSpaceSummary({ ...base, savedReports: [report] });
  assert.equal(actual.next, 'report');
  assert.equal(JSON.stringify(actual).includes('PRIVATE REPORT'), false);
  assert.equal(homeSpaceSummary({ ...base, savedReports: [{ ...report, available: false }] }).next, 'tests');
});

test('select an owned primary course with bounded progress but no private title, notes or scores', () => {
  const actual = homeSpaceSummary({
    ...base, practitioner: { id: 'master' }, results: [{ score: 70, note: 'SECRET' }],
  }, { courses: [
    { id: 'foreign-course', status: 'active', isPrimary: true },
    { id: courseId, status: 'active', isPrimary: true, completedLessons: 4,
      title: 'SECRET COURSE NAME', notes: 'PRIVATE' },
  ] });
  assert.equal(actual.next, 'course');
  assert.equal(actual.courseId, courseId);
  assert.equal(actual.completedLessons, 4);
  assert.equal(actual.professional, true);
  assert.equal(actual.owner, true);
  for (const hidden of ['SECRET', 'PRIVATE', '\"score\"', '\"notes\"']) assert.equal(JSON.stringify(actual).includes(hidden), false);
});

test('only real account state determines action and professional permissions', () => {
  const pending = homeSpaceSummary({ ...base, account: { id, onboardingState: 'pending' } });
  assert.equal(pending.next, 'onboarding');
  const results = homeSpaceSummary({ ...base, results: [{ id: 'measured' }], professional: true });
  assert.equal(results.next, 'growth');
  assert.equal(results.professional, false);
});

test('homepage uses shared client-only My Space and avoids a duplicate footer card', () => {
  const home = readFileSync(new URL('../components/holistic-house-home.tsx', import.meta.url),'utf8');
  const es = readFileSync(new URL('../app/es/page.tsx', import.meta.url),'utf8');
  const nav = readFileSync(new URL('../components/site-navigation.tsx', import.meta.url),'utf8');
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url),'utf8');
  const panel = readFileSync(new URL('../components/home-personal-space.tsx', import.meta.url),'utf8');
  const stage = readFileSync(new URL('../components/home-featured-workspace.tsx', import.meta.url),'utf8');
  for (const source of [home,es]) {
    assert.doesNotMatch(source, /HomePersonalSpaceProvider|<HomePersonalSpaceCard/);
    // The topic picker moved directly below the photo hero; keep a single workspace.
    for (const name of ["HomeSectionCarousel", "HomeMoreDisclosure", "HomeFeaturedWorkspace"]) {
      assert.equal((source.match(new RegExp("<" + name + "\\b", "g")) || []).length, 1, name);
    }
    assert.ok(source.indexOf("<HomeSectionCarousel") < source.indexOf("<HomeMoreDisclosure"));
    assert.ok(source.indexOf("<HomeMoreDisclosure") < source.indexOf("<HomeFeaturedWorkspace"));
  }
  assert.match(stage, /data-home-reports-cta/);
  assert.match(layout, /<HomePersonalSpaceProvider locale=\{lang\}>\{children\}<\/HomePersonalSpaceProvider>/);
  assert.match(nav, /<HomePersonalSpaceNavEntry/);
  assert.doesNotMatch(nav, /pathname === '\/' \|\| pathname === '\/ru' \|\| pathname === '\/es'/);
  assert.match(panel, /bootstrap\?view=portrait/);
  assert.match(panel, /accountId: first.accountId/);
  assert.match(panel, /IntersectionObserver/);
  assert.match(panel, /BroadcastChannel\(["']hh-app-session["']\)/);
  assert.match(panel, /showModal\(/);
  assert.match(panel, /usePathname\(\)/);
  assert.match(panel, /activeLocale/);
  assert.match(panel, /site-cabinet-entry__compact/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|sendBeacon|analytics|dangerouslySetInnerHTML/);
});

test('the home drawer keeps a personal left column and a separate master right column for guests and members', () => {
  const panel = readFileSync(new URL('../components/home-personal-space.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../components/home-personal-space.module.css', import.meta.url), 'utf8');
  for (const label of ['For me', 'For masters', 'Для себя', 'Для мастера', 'Para mí', 'Para maestros']) {
    assert.ok(panel.includes(label), label);
  }
  assert.match(panel, /className=\{styles\.pathGrid\}/);
  assert.match(panel, /personalActions\.map\(/);
  assert.match(panel, /masterActions\.map\(/);
  assert.match(panel, /summary\.professional \?/);
  assert.match(panel, /href=\{root \+ "\/practice"\}/);
  assert.match(panel, /practice\?panel=services/);
  assert.match(panel, /practice\?panel=materials&materialTab=courses/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.doesNotMatch(css, /\.pathGrid\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('guest Google entry uses the existing rate-limited PKCE Cabinet continuation without auto-enrolment', () => {
  const panel = readFileSync(new URL('../components/home-personal-space.tsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../app/api/app/[...path]/route.js', import.meta.url), 'utf8');
  assert.match(panel, /status === "guest"/);
  assert.match(panel, /onClick=\{\(\) => void startGoogleSignIn\(\)\}/);
  assert.match(panel, /appFetch\("auth\/start",/);
  assert.match(panel, /continueTo: destination/);
  assert.match(panel, /"cabinet" \| "my-practice" = "cabinet"/);
  assert.match(panel, /startGoogleSignIn\("my-practice"\)/);
  assert.match(panel, /isNativeHolisticHouse\(\)/);
  assert.match(panel, /Browser\.open\(\{ url: result\.redirectUrl \}\)/);
  assert.match(panel, /window\.location\.assign\(result\.redirectUrl\)/);
  assert.match(panel, /role="alert"/);
  assert.match(route, /signInWithOAuth\(\{/);
  assert.match(route, /continueTo === 'cabinet'/);
  assert.match(route, /continueTo === 'my-practice'/);
  assert.match(route, /\/app\/practice/);
  assert.match(route, /op: 'oauth-start'/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|sendBeacon|autoSubmit/);
});
