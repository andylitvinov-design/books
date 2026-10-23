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

test('homepage uses shared client-only provider and keeps existing hero/banner/dialogue order', () => {
  const home = readFileSync(new URL('../components/holistic-house-home.tsx', import.meta.url),'utf8');
  const es = readFileSync(new URL('../app/es/page.tsx', import.meta.url),'utf8');
  const nav = readFileSync(new URL('../components/site-navigation.tsx', import.meta.url),'utf8');
  const panel = readFileSync(new URL('../components/home-personal-space.tsx', import.meta.url),'utf8');
  for (const source of [home, es]) {
    assert.match(source, /HomePersonalSpaceProvider/);
    assert.match(source, /HomePersonalSpaceCard/);
    assert.ok(source.indexOf('<HomeSectionCarousel') < source.indexOf('<HomeFreeDiagnosisBanner'));
    assert.ok(source.indexOf('<HomeFreeDiagnosisBanner') < source.indexOf('<HomeConversationGuide'));
    assert.ok(source.indexOf('<HomeConversationGuide') < source.indexOf('<HomePersonalSpaceCard'));
  }
  assert.match(nav, /HomePersonalSpaceNavEntry/);
  assert.match(panel, /bootstrap\?view=portrait/);
  assert.match(panel, /accountId: first.accountId/);
  assert.match(panel, /IntersectionObserver/);
  assert.match(panel, /BroadcastChannel\('hh-app-session'\)/);
  assert.match(panel, /showModal\(/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|sendBeacon|analytics|dangerouslySetInnerHTML/);
});
