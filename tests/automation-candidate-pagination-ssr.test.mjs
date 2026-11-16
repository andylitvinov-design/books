import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('candidate DB queries page research rows with stable tie breaker and bounded page',()=>{
 const src=read('lib/automations/scout-db.mjs');
 assert.match(src,/candidatePage\s*=\s*1/);
 assert.match(src,/candidatePageInfo\(candidatePage/);
 assert.match(src,/order by first_seen_at desc,candidate_id desc limit \$1 offset \$2/);
 assert.match(src,/CANDIDATE_PAGE_SIZE/);
 assert.match(src,/pageInfo.offset/);
 assert.doesNotMatch(src,/order by first_seen_at desc limit \$1`/);
});
test('editorial decisions are selected by the actual displayed IDs, not offset into sparse decisions',()=>{
 const src=read('lib/automations/candidate-editorial-review.mjs');
 assert.match(src,/readCandidateEditorialReviewsForPage/);
 assert.match(src,/r\.candidate_id\s*=\s*ANY\(\$1::uuid\[\]\)/);
 assert.match(src,/EDITORIAL_INVALID_PAGE_IDS/);
});
test('server rendered UX shows next/previous and only owner candidate IDs',()=>{
 const src=read('app/admin/automations/page.tsx');
 assert.match(src,/requireAdminRequest/);
 assert.match(src,/parseCandidatePage/);
 assert.match(src,/candidatePageInfo/);
 assert.match(src,/readCandidateEditorialReviewsForPage/);
 assert.match(src,/\?page=/);
 assert.match(src,/\/api\/admin\/automations\/candidates\/dossier/);
});
test('owner API GET accepts only one bounded page query',()=>{
 const src=read('app/api/admin/automations/route.js');
 assert.match(src,/parseCandidatePage/);
 assert.match(src,/candidatePage/);
 assert.match(src,/ownerMaterialRequest/);
 assert.match(src,/INVALID_QUERY/);
});
