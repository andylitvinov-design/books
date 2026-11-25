import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8');
const core = read('hh-pr-core-release.yml');
const gate = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";

test('Core owns production PR type/build and specialists retain independent nonproduction checks',()=>{
  assert.match(core,/name: Exact proposed release production build and TypeScript check/);
  assert.match(core,/run: npm run build/);
  assert.match(core,/^  hh-merge-check:/m);
  for(const name of ['hh-growth-journey.yml','hh-course-presets.yml']){
    const s=read(name);
    assert.ok(!s.includes("      - 'tests/ci-growth-course-core-reuse.test.mjs'"),name+' CI-only contract changes must not launch duplicate domain runners');
    assert.ok(s.includes("      - '.github/workflows/"+name+"'"),name+' own workflow-policy edits must still trigger independent domain QA');
    assert.ok(s.includes("run: node --test tests/ci-growth-course-core-reuse.test.mjs"),name+' policy test execution missing');
    assert.ok(s.includes("    if: ${{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}"),name+' Draft work not gated');
    assert.ok(s.includes(gate),name+' nonproduction build gate missing');
    assert.doesNotMatch(s,/continue-on-error:\s*true/);
  }
});
test('Growth journey retains business, consent and account scope verification',()=>{
  const s=read('hh-growth-journey.yml');
  for(const path of ['tests/growth-journey-public.test.mjs','tests/business-consultation-finder.test.mjs',
    'tests/business-service-browser.test.mjs','tests/topic-journey-account-scope.test.mjs'])
    assert.ok(s.includes(path),'Growth evidence lost '+path);
  assert.doesNotMatch(s,/business-journey-consultation-banner\.test\.mjs/,
    'Retired Business landing oracle must not block current directions');
  assert.match(s,/name: TypeScript compatibility\n        if:/);
  assert.match(s,/name: Production build\n        if:/);
});
test('Course presets retain private saves, concurrency and curricula',()=>{
  const s=read('hh-course-presets.yml');
  for(const path of ['tests/course-presets.test.mjs','tests/my-course.test.mjs','tests/course-dashboard-integration.test.mjs',
    'tests/course-concurrency-ui.test.mjs','tests/course-free-slot-restart.test.mjs',
    'tests/energywork-ai-course-private-save.test.mjs']) assert.ok(s.includes(path),'Course evidence lost '+path);
  assert.ok(s.includes("--test-skip-pattern='one private six-milestone route reuses tests, insights and keeps mobile bottom navigation'"), 'Only one obsolete six-tab layout oracle may be skipped; original course suite remains');
  assert.ok(s.includes("group: hh-course-presets-${{ github.event_name == 'pull_request' && github.run_attempt == 1 && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(s.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' && github.run_attempt == 1 && github.event.action == 'synchronize' }}"));
});

test('P2 scoped specialists defer redundant compilation only to required production Core',()=>{
  const required = [
    ['hh-personal-coaching-session.yml',['TypeScript noEmit','Build production Next.js'],
      ['tests/personal-coaching-session.test.mjs','tests/coaching-intelligence-state.test.mjs','Scoped eslint']],
    ['hh-language-agent.yml',['TypeScript check'],
      ['tests/holistic-language-agent.test.mjs','tests/holistic-reiki-audio-language-agent.test.mjs','Targeted ESLint']],
  ];
  for(const [file,steps,contracts] of required){
    const source=read(file);
    for(const name of steps) assert.ok(source.includes('- name: '+name+'\n        '+gate+'\n'),
      file+': the duplicated production PR type/build step must be scoped: '+name);
    for(const contract of contracts) assert.ok(source.includes(contract),
      file+': original domain/security/browser contract lost: '+contract);
    assert.doesNotMatch(source,/continue-on-error:\s*true/,file+' must fail closed');
  }
  // Both source-scope optimizations rely on Core's mandatory real build.
  assert.match(core,/^  hh-merge-check:/m);
  assert.match(core,/run: npm run build/);
  assert.match(core,/needs: \[scope\]/);
  assert.match(core,/ci-specialist-aggregate\.mjs/);
  assert.match(core,/Fail closed if mandatory Core failed/);
  assert.ok(core.includes('tests/ci-growth-course-core-reuse.test.mjs'));
});

test('P2 leaves real Visual Services QA untouched and mandatory on UI changes',()=>{
  const visual=read('hh-visual-service-landings.yml');
  for(const contract of [
    "      - 'components/personal-service-landing.tsx'",
    '- name: Typecheck changed pages in full project context',
    'run: npx --no-install tsc --noEmit',
    'npm run build > artifacts/visual-service-mobile/build.log',
    'playwright install --with-deps chromium webkit',
    'node scripts/verify-visual-service-mobile.mjs',
  ]) assert.ok(visual.includes(contract),'Visual Services acceptance must remain: '+contract);
  assert.doesNotMatch(visual,/continue-on-error:\s*true/);
});

test('CI-only policy changes run the existing Core owner, not two independent full domain runners',()=>{
  const policy='tests/ci-growth-course-core-reuse.test.mjs';
  assert.ok(core.includes(policy+'|\\'), 'Core CI-only planner must retain this test');
  assert.ok(core.includes('node --test tests/ci-workflow-globs.test.mjs tests/workflow-next-route-filters.test.mjs tests/ci-specialist-aggregate.test.mjs '+policy),
    'mandatory Core must execute the entire exact policy contract when CI code changes');
  const growth=read('hh-growth-journey.yml');
  const course=read('hh-course-presets.yml');
  for(const realPath of ["      - 'tests/growth-journey-public.test.mjs'", "      - 'tests/business-consultation-finder.test.mjs'", "      - 'tests/topic-journey-account-scope.test.mjs'"])
    assert.ok(growth.includes(realPath),'Growth still requires real user-facing domain verification for '+realPath);
  for(const realPath of ["      - 'tests/my-course.test.mjs'", "      - 'lib/billing/**'", "      - 'app/api/app/courses/**'"])
    assert.ok(course.includes(realPath),'Course still requires real private/billing/domain verification for '+realPath);
  assert.doesNotMatch(course,/^\s*-\s*['"]?package\.json['"]?\s*$/m,
    'Core owns the proven additive coaching-test prebuild route; Course must not start from package-only fan-out');
  assert.ok(growth.includes('run: node --test '+policy));
  assert.ok(course.includes('run: node --test '+policy));
  assert.doesNotMatch(growth,/continue-on-error:\s*true/);
  assert.doesNotMatch(course,/continue-on-error:\s*true/);
});

test('ordinary production PRs delegate only duplicate lint/types to protected Core',()=>{
  const scoped=[
  [
    "hh-cabinet-journey.yml",
    "Install dependencies for independent nonproduction QA"
  ],
  [
    "hh-cabinet-journey.yml",
    "Scoped ESLint"
  ],
  [
    "hh-my-progress-release.yml",
    "Install pinned dependencies"
  ],
  [
    "hh-my-progress-release.yml",
    "Scoped ESLint"
  ],
  [
    "hh-event-referral-contract.yml",
    "Check TypeScript without publishing"
  ],
  [
    "reiki-enquiry-capture-ci.yml",
    "Type-check Next app"
  ],
  [
    "reiki-enquiry-capture-ci.yml",
    "Lint changed components"
  ],
  [
    "hh-personal-coaching-session.yml",
    "Scoped eslint"
  ],
  [
    "hh-ideas-coaching-public.yml",
    "Lint modified application components"
  ],
  [
    "hh-course-presets.yml",
    "Lint course code"
  ],
  [
    "hh-course-presets.yml",
    "Lint Energywork learner"
  ],
  [
    "hh-growth-journey.yml",
    "Lint changed JS and TypeScript"
  ],
  [
    "hh-reports-development-program.yml",
    "Lint newly created feature files"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint SalesBot operator-assist contract and UI"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint localized express review channel entry and strict WhatsApp marker"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint dedicated Instagram source and operator contract"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint canonical Telegram script viewer and its parity tests"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint Telegram V2 pure conversation and CRM private persistence"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint Telegram inline keyboard and callback handler"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint Telegram diagnostic runtime, owner photo proxy and public entry"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint SalesBot editor and strict import policy"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint new SalesBot owner UI and deterministic runtime"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint scoped internal SalesBot execution and owner controls"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint SalesBot draft storage, private API and UI"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint opportunity lifecycle, store, protected API and mobile page"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint deal booking task integration"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint business pipeline flow and accessible board"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint request-bound audio service and streaming endpoints"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint member inbox backend, privacy route and EN/RU/ES UI"
  ],
  [
    "hh-crm-source-check.yml",
    "Validate practitioner CRM JSX explicitly"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint changed CRM runtime and UI"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint express report account ownership and notification routes"
  ],
  [
    "hh-crm-source-check.yml",
    "Lint secured free review Google claim UI and account route"
  ],
  [
    "hh-messenger-notification-build.yml",
    "Lint new notification service and Settings integration"
  ],
  [
    "hh-support-guided-recommendations.yml",
    "Scoped lint"
  ]
];
  assert.ok(core.includes('npx --no-install eslint "${files[@]}"'));
  assert.ok(core.includes('run: npm run build'));
  assert.match(core,/^  hh-merge-check:/m);
  assert.match(core,/ci-specialist-aggregate\.mjs/);
  assert.match(core,/full_lint=true/);
  for(const [file,name] of scoped){
    const src=read(file);
    const block=src.split('      - name: '+name+'\n');
    assert.equal(block.length,2,file+' missing or duplicate '+name);
    assert.ok(block[1].startsWith('        '+gate+'\n        run:'),file+' duplicate work must be scoped to nonproduction/manual');
    assert.match(src,/node --test|node --conditions=react-server --test/,file+' real source/privacy contracts remain');
    assert.doesNotMatch(src,/continue-on-error:\s*true/);
  }
});

test('Axis keeps both original mandatory jobs but shares one locked dependency install',()=>{
  const src=read('hh-profile-axis-matching.yml');
  const parts=src.split(/^  axis-unit-types-build:\n/m);
  assert.equal(parts.length,2);
  const writer=parts[0].split(/^  writer-practical-focused:\n/m)[1];
  const axis=parts[1];
  assert.ok(writer);
  for(const f of ['meditation-writer-brief','meditation-writer-literary','meditation-writer-free-gemini',
    'meditation-writer-preview-source','meditation-writer-device-voice-source','meditation-writer-practical-director',
    'meditation-writer-small-model-skill','meditation-writer-free-providers','hypno-private-signals',
    'meditation-writer-course-outline','meditation-writer-intent-codes','meditation-writer-mandala-bridge'])
    assert.ok(writer.includes('tests/'+f+'.test.mjs'),f+' writer contract must still run');
  assert.doesNotMatch(writer,/run: npm ci|run: npx .*eslint|run: npx .*tsc|uses: .*ci-ffmpeg-static/);
  assert.equal((src.match(/run: npm ci --no-audit --no-fund/g)||[]).length,1);
  assert.equal((src.match(/run: npx --no-install tsc --noEmit --pretty false/g)||[]).length,1);
  assert.ok(axis.includes('npx --no-install eslint --max-warnings 0'));
  assert.ok(axis.includes('tests/app-auth-pkce.integration.mjs'),'independent authenticated regression is retained');
  assert.ok(axis.includes('tests/intelligence-risk.test.mjs'));
  assert.ok(axis.includes('tests/portrait-sectors.test.mjs'));
  assert.ok(axis.includes('- name: TypeScript check\n        '+gate+'\n        run:'));
  assert.ok(axis.includes('- name: Build site\n        '+gate+'\n        run:'));
  assert.doesNotMatch(src,/continue-on-error:\s*true/);
});

test('Cabinet and My Progress run their real dependency-free contracts before any shared Core result',()=>{
  const cabinet=read('hh-cabinet-journey.yml');
  const progress=read('hh-my-progress-release.yml');
  for(const file of ['tests/cabinet-learning-journey.test.mjs','tests/cabinet-today.test.mjs',
    'tests/workflow-next-route-filters.test.mjs','tests/my-progress.test.mjs'])
    assert.ok(cabinet.includes(file));
  assert.match(progress,/run: node --test tests\/my-progress\.test\.mjs/);
  const noPackages=['lib/app/my-progress.mjs','lib/app/learning-journey.mjs','lib/app/cabinet-today.mjs'];
  for(const path of noPackages){
    const code=readFileSync(new URL('../'+path,import.meta.url),'utf8');
    // Exact current pure modules. A future import/dependency requires the
    // maintainers to review this CI lane rather than silently skip its tests.
    assert.doesNotMatch(code,/^\s*import\s|^\s*export\s+[^\n]*\sfrom\s|\b(?:require|import)\s*\(/m,path+' pure contract dependency changed');
  }
  assert.ok(cabinet.includes("'\.github/workflows/hh-cabinet-journey.yml'".replace('\\.','.')));
  assert.doesNotMatch(cabinet,/cabinet-today-ci\.yml/);
  const [pr,push]=progress.split(/^  push:\n/m);
  assert.ok(pr.includes("      - '.github/workflows/hh-my-progress-release.yml'"));
  assert.ok(push.includes("      - 'components/app/my-progress.*'"));
  assert.ok(push.includes("      - 'app/api/app/video-progress/route.js'"));
  assert.ok(!push.includes("      - '.github/workflows/hh-my-progress-release.yml'"),
    'CI-only policy is verified in PR, not an extra product build after merge');
  assert.ok(push.includes('- name: Production build\n        '+gate+'\n        run: npm run build'));
});

test('IA reuses only Core prebuild tests on exact protected Messenger UI diffs; real compilation and assets remain',()=>{
  const ia=read('ia-v2.yml');
  const start=ia.indexOf('- name: Real IA browser build with verified Core prebuild reuse');
  const end=ia.indexOf('- name: Full TypeScript outside production PR',start);
  assert.ok(start>=0 && end>start);
  const block=ia.slice(start,end);
  for(const token of ['HEAD^1','HEAD^2','GITHUB_SHA','HH_PR_HEAD','HH_EVENT_BASE',
    "github.event.pull_request.head.sha","github.event.pull_request.base.sha",
    'merge-base','--is-ancestor','--no-renames','--name-status',
    '5e3a459dc70f8bcd5a83e9e8cbe31b0a5dbf0189',
    '80665a0c3531989d71e93d6e69ef6ef6d53ef900',
    "if(fields[i]!=='M'",'if(!hasUI)','s.preprebuild','s.postprebuild','s.postbuild',
    'node scripts/ensure-owner-video-renderer.mjs',
    'node scripts/cache-ancient-coaching-photos.mjs',
    'node scripts/generate-soft-ocean-melody.mjs',
    'node scripts/build-public-card-artwork.mjs',
    'node scripts/build-report-pdf-art.mjs',
    'node scripts/prepare-my-coach-natural-mp4.mjs',
    './node_modules/.bin/next build --no-lint','npm run build']) assert.ok(block.includes(token),token);
  assert.ok(ia.includes('npm run verify:ia-v2'));
  assert.ok(ia.includes('tests/helpers/app-db-setup.mjs'));
  assert.ok(ia.includes('playwright install --with-deps chromium webkit'));
  assert.ok(core.includes('run: npm run build -- --no-lint'));
  assert.match(core,/^  hh-merge-check:/m);
});

test('IA Core proof accepts only exact existing Messenger UI source changes and known policy',()=>{
  const ia=read('ia-v2.yml');
  const body=ia.split("<<'HH_IA_CORE_PROOF'\n")[1].split('\n          HH_IA_CORE_PROOF\n')[0]
    .split('\n').map(line=>line.slice(10)).join('\n');
  const run=new Function('require','process',body);
  const merge='a'.repeat(40),base='b'.repeat(40),head='c'.repeat(40);
  // Use the reviewed manifest shape as a fixture. Future manifest changes
  // must restore the full build rather than fail this policy test.
  const prebuild=JSON.parse(body.match(/s\.prebuild!==(\"(?:[^\"\\\\]|\\\\.)*\")/)[1]);
  const pkg={scripts:{build:'next build',prebuild}};
  const z=String.fromCharCode(0);
  function accepted(rows,opts={}){
    let failed=false;
    const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_BASE_REF:'codex/public-book-library',GITHUB_SHA:merge,HH_PR_HEAD:head,HH_EVENT_BASE:base,...opts.env};
    const exit=()=>{failed=true;throw new Error('expected fallback');};
    const git=(_cmd,args)=>{
      const rev={'HEAD':merge,'HEAD^1':base,'HEAD^2':head,
        [base+':.github/workflows/hh-pr-core-release.yml']:opts.core||'5e3a459dc70f8bcd5a83e9e8cbe31b0a5dbf0189',
        [base+':scripts/ci-quick-route.mjs']:opts.router||'80665a0c3531989d71e93d6e69ef6ef6d53ef900'};
      if(args[0]==='rev-parse' && rev[args[1]])return rev[args[1]]+'\n';
      if(args[0]==='merge-base'){if(opts.diverged)throw new Error('diverged');return '';}
      if(args[0]==='diff')return rows.flat().join(z)+z;
      throw new Error('unknown git request');
    };
    try{run(name=>name==='node:child_process'?{execFileSync:git}:{readFileSync:()=>JSON.stringify(opts.pkg||pkg)},{env,exit});}
    catch(err){if(!failed)throw err;}
    return !failed;
  }
  const ui=['M','components/app/messages-simple-inbox.jsx'];
  const testRow=['M','tests/messages-simple-inbox.test.mjs'];
  assert.equal(accepted([ui]),true);
  assert.equal(accepted([ui,testRow]),true);
  for(const rows of [[testRow],[['A',ui[1]]],[['D',ui[1]]],
    [ui,['M','components/app/messages-bottom-navigation.jsx']],
    [ui,['M','package.json']],[ui,['M','.github/workflows/ia-v2.yml']],
    [ui,['M','app/api/app/direct-messages/route.js']],
    [ui,['M','supabase/migrations/new.sql']]])assert.equal(accepted(rows),false,JSON.stringify(rows));
  assert.equal(accepted([ui],{env:{GITHUB_EVENT_NAME:'workflow_dispatch'}}),false);
  assert.equal(accepted([ui],{env:{HH_PR_HEAD:'d'.repeat(40)}}),false);
  assert.equal(accepted([ui],{env:{GITHUB_SHA:'d'.repeat(40)}}),false);
  assert.equal(accepted([ui],{env:{HH_EVENT_BASE:'d'.repeat(40)},diverged:true}),false);
  assert.equal(accepted([ui],{core:'d'.repeat(40)}),false);
  assert.equal(accepted([ui],{router:'d'.repeat(40)}),false);
  assert.equal(accepted([ui],{pkg:{...pkg,scripts:{...pkg.scripts,postbuild:'node new-hook.js'}}}),false);
  assert.equal(accepted([ui],{pkg:{scripts:{...pkg.scripts,prebuild:prebuild+' && node new-test.js'}}}),false);
});

test('remaining source specialists avoid redundant production PR installs and lint without removing contracts',()=>{
  for(const [file,steps] of [
    ['practitioner-presentations.yml',['Load original checksum-verified FFmpeg for npm ci','Install dependencies for standalone practitioner compile','Install SHA-verified FFmpeg into package after npm ci']],
    ['hh-public-journey-wave1.yml',['Install dependencies for independent public journey QA']],
    ['hh-public-test-collections.yml',['Lint modified application code']],
    ['hh-energywork-ai.yml',['Targeted ESLint']],
    ['library-public-feed.yml',['Lint changed TypeScript and JavaScript sources']],
  ]){
    const s=read(file);
    for(const name of steps) assert.ok(s.includes('- name: '+name+'\n        '+gate+'\n'),file+' missing production-only scope '+name);
    assert.match(s,/node (?:--conditions=react-server )?--test/);
    assert.doesNotMatch(s,/continue-on-error:\s*true/);
  }
  const practitioner=read('practitioner-presentations.yml');
  for(const f of ['practitioner-presentation-video','practitioner-video-materials','practitioner-articles-v4','practitioner-articles-folders','master-network-r2','master-showcase-landing','practice-public-alias'])
    assert.ok(practitioner.includes('tests/'+f+'.test.mjs'),f+' must still run');
  assert.match(practitioner,/^  push:/m);
  assert.ok(practitioner.includes('run: npm run build'));
  const journey=read('hh-public-journey-wave1.yml');
  assert.equal((journey.match(/if \[\[ "\$GITHUB_EVENT_NAME" != pull_request \|\| "\$GITHUB_BASE_REF" != codex\/public-book-library \]\]; then/g)||[]).length,2);
  for(const f of ['tests/public-pathway-migration.test.mjs','tests/public-pathway-toronto.test.mjs','tests/ci-public-journey-consolidation.test.mjs','node scripts/verify-public-pathway-mobile.mjs','node scripts/verify-public-pathway-toronto-mobile.mjs'])
    assert.ok(journey.includes(f),f+' retained');
  assert.ok(journey.split(/^  push:/m)[0].includes("      - '.github/workflows/hh-public-journey-wave1.yml'"));
  assert.ok(!journey.split(/^  push:/m)[1].includes("      - '.github/workflows/hh-public-journey-wave1.yml'"));
  assert.match(journey,/^  workflow_dispatch:/m);
  assert.match(journey,/run: npm run build/);
  const library=read('library-public-feed.yml');
  assert.ok(library.includes('run: npm run build -- --no-lint'));
  assert.ok(library.includes('node scripts/verify-ideas-mobile-browser.mjs'));
  assert.ok(library.includes('node scripts/verify-unified-six-dock-browser.mjs'));
  for(const [file,job] of [['hh-business-coaching.yml','business-coaching-contract'],['hh-public-test-collections.yml','collections-unit-build']]){
    const s=read(file);
    assert.ok(s.includes('  pull_request:\n    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]'));
    assert.ok(s.includes('  '+job+':\n    if: ${{ github.event_name != \'pull_request\' || github.event.pull_request.draft == false }}'));
    assert.ok(s.includes("      - '.github/workflows/"+file+"'"));
  }
});
