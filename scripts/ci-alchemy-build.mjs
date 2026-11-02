// #2575: exact production asset preparation for Alchemy's independent browser QA.
// No scripts, resources, or payments are skipped; only unrelated coaching tests
// already enforced by the mandatory Core production-build release gate.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8'));
const core=readFileSync(new URL('../.github/workflows/hh-pr-core-release.yml',import.meta.url),'utf8');
const canonical=[
  "node scripts/ensure-owner-video-renderer.mjs",
  "node scripts/cache-ancient-coaching-photos.mjs",
  "node --test tests/psychic-alchemy-featured-video.test.mjs",
  "npm run test:coaching:release",
  "node --test tests/public-coaching-discovery.test.mjs",
  "node --test tests/tests-coaching-switchboard.test.mjs",
  "node scripts/generate-soft-ocean-melody.mjs",
  "node scripts/build-public-card-artwork.mjs",
  "node scripts/build-report-pdf-art.mjs"
];
const delegated=new Set([
  'npm run test:coaching:release',
  'node --test tests/public-coaching-discovery.test.mjs',
  'node --test tests/tests-coaching-switchboard.test.mjs',
]);
// Only the protected production PR has an independently required Core build.
// Manual, push and other-branch runs must execute the full prebuild themselves.
const protectedPr=process.env.GITHUB_EVENT_NAME==='pull_request' &&
  process.env.GITHUB_BASE_REF==='codex/public-book-library';
assert.equal(pkg.scripts?.prebuild,canonical.join(' && '),'Prebuild drift: do not skip newly required production steps');
assert.equal(pkg.scripts?.build,'next build','Production build command drift');
assert.match(core,/run: npm run build/,'Core must execute full production prebuild');
assert.match(core,/^  hh-merge-check:\s*$/m,'Protected unified merge check must exist');
assert.match(core,/needs: \[scope, code, hh-specialist\]/,
  'Unified merge check must require real Core and specialist evidence');
assert.match(core,/\[\[ "\$SCOPE_RESULT" == success && "\$SPECIALIST_RESULT" == success \]\]/,
  'Missing or failing specialist must block unified merge check');
const verifyOnly=process.argv.length===3&&process.argv[2]==='--verify-only';
assert.ok(process.argv.length===2||verifyOnly,'Only --verify-only is supported');
if(verifyOnly){
  console.log('Alchemy production prebuild and Core coverage contract verified');
}else{
  for(const command of canonical){
    if(protectedPr && delegated.has(command)){
      console.log('[alchemy-ci] Unrelated coaching test remains in mandatory Core:',command);
      continue;
    }
    const [bin,...args]=command.split(' ');
    const started=performance.now();
    console.log('[alchemy-ci] Checking required production asset / Alchemy:',command);
    const child=spawnSync(bin,args,{stdio:'inherit',env:process.env});
    if(child.error)throw child.error;
    assert.equal(child.status,0,'Required prebuild command failed: '+command);
    console.log('[alchemy-ci] '+((performance.now()-started)/1000).toFixed(1)+'s:',command);
  }
}
