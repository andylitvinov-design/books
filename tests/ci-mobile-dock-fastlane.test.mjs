import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOBILE_DOCK_ALLOWED_FILES,
  isMobileDockOnlyChange,
  isExactMobileDockMerge,
} from '../scripts/ci-mobile-dock-fastlane.mjs';

const nav = 'components/app/messages-bottom-navigation.jsx';
const workspace = 'app/[locale]/app/[[...path]]/workspace.css';
const page = 'app/[locale]/app/messages/messages-page.css';
const helper = 'lib/mobile-visual-bottom.mjs';
const testFile = 'tests/mobile-visual-dock.test.mjs';
const sha = char => char.repeat(40);

test('mobile dock fast lane accepts only the bounded set of modified dock files', () => {
  assert.deepEqual(MOBILE_DOCK_ALLOWED_FILES, [workspace, page, nav, helper, testFile]);
  assert.equal(isMobileDockOnlyChange([{status:'M',filename:nav}]), true);
  assert.equal(isMobileDockOnlyChange([
    {status:'M',filename:nav},
    {status:'M',filename:workspace},
    {status:'M',filename:page},
    {status:'M',filename:helper},
    {status:'M',filename:testFile},
  ]), true);
  assert.equal(isMobileDockOnlyChange([{status:'M',filename:workspace}]), false);
});

test('dock fast lane rejects mixed, added, deleted, renamed, duplicate and unknown changes', () => {
  const cases = [
    [{status:'M',filename:nav},{status:'M',filename:'app/api/app/direct-messages/route.js'}],
    [{status:'A',filename:nav}],
    [{status:'D',filename:nav}],
    [{status:'R100',filename:nav}],
    [{status:'M',filename:nav},{status:'M',filename:nav}],
    [{status:'M',filename:nav},{status:'M',filename:'.github/workflows/ia-v2.yml'}],
    [{status:'M',filename:nav},{status:'M',filename:'components/app/messages-simple-inbox.jsx'}],
    [],
    Array.from({length:6},(_,index)=>({status:'M',filename:MOBILE_DOCK_ALLOWED_FILES[index%5]})),
  ];
  for (const rows of cases) assert.equal(isMobileDockOnlyChange(rows), false);
});

test('exact merge gate requires same PR HEAD, production base ancestry and merge SHA', () => {
  const good = {
    eventName:'pull_request',
    baseRef:'codex/public-book-library',
    expectedBase:sha('a'),
    expectedHead:sha('b'),
    mergeSha:sha('c'),
    firstParent:sha('a'),
    secondParent:sha('b'),
    baseIsAncestor:true,
    rows:[{status:'M',filename:nav},{status:'M',filename:workspace}],
  };
  assert.equal(isExactMobileDockMerge(good), true);
  assert.equal(isExactMobileDockMerge({...good,secondParent:sha('d')}), false);
  assert.equal(isExactMobileDockMerge({...good,baseIsAncestor:false}), false);
  assert.equal(isExactMobileDockMerge({...good,baseRef:'main'}), false);
  assert.equal(isExactMobileDockMerge({...good,eventName:'push'}), false);
  assert.equal(isExactMobileDockMerge({...good,mergeSha:'bad'}), false);
  assert.equal(isExactMobileDockMerge({...good,rows:[...good.rows,{status:'M',filename:'supabase/migrations/private.sql'}]}), false);
});
