import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parse, descendants, sourceModule, ts } from './helpers/current-source-render.mjs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { safeEnquiryReturnPath } from '../lib/app/enquiry-auth-redirect.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const base={operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle:'Tantra Reiki',sourcePath:'/en/academy/reiki/tantra-reiki',
  locale:'en',description:'',contactConsent:true,contact:{email:'test@example.org',displayName:''}}
test('one contact field and no name creates an unverified reply-only registration',()=>{
  const result=normalizePublicServiceEnquiry(base)
  assert.deepEqual(result.contact,{displayName:'Website enquiry',email:'test@example.org',phone:'',source:'academy'})
  assert.equal(result.contactConsent,true)
  for(const [locale,name] of [['ru','Заявка с сайта'],['es','Solicitud web']]){
    const item=normalizePublicServiceEnquiry({...base,locale,sourcePath:'/'+locale+'/services',
      contact:{phone:'+14165550123'}})
    assert.equal(item.contact.displayName,name)
    assert.equal(item.contact.phone,'+14165550123')
    assert.equal(item.contact.email,'')
  }
  for(const suppliedName of ['A','x'.repeat(121),'Visitor\nInjected']){
    assert.throws(()=>normalizePublicServiceEnquiry({...base,contact:{...base.contact,displayName:suppliedName}}))
  }
  assert.throws(()=>normalizePublicServiceEnquiry({...base,contactConsent:false}))
  assert.throws(()=>normalizePublicServiceEnquiry({...base,contact:{displayName:''}}))
})
test('OAuth enquiry continuation cannot redirect to a private page or foreign website',()=>{
  for(const [locale,path] of [
    ['en','/en/services'],['ru','/ru/academy/reiki/tantra-reiki'],
    ['es','/es/services'],['en','/en/toronto'],['en','/en/explore/business'],
  ])assert.equal(safeEnquiryReturnPath(path,locale),path)
  for(const path of [
    'https://evil.example/','//evil.example/en/services','/en/app/practice',
    '/en/client/report','/en/tests','/en/services?next=https://evil.example/',
    '/en/services#secret','/en/services/../api','/en/services/%2e%2e/api',
    '/en/services\\\\api','/en/services//api','/ru/services',
    '/en',
  ])assert.equal(safeEnquiryReturnPath(path,'en'),'','blocked: '+path)
})
test('Google entry uses existing PKCE and prefill, never silently submits a CRM lead',()=>{
  const src=source('components/contact-channel-chooser.tsx')
  const auth=source('app/api/app/[...path]/route.js')
  const css=source('components/contact-channel-chooser.module.css')
  assert.match(src,/continueTo: "enquiry", returnPath: pathname/)
  assert.match(src,/sessionStorage\.setItem\("hh-google-enquiry-return"/)
  assert.match(src,/fetch\("\/api\/app\/auth\/contact-profile"/)
  assert.match(src,/setGoogleReady\(true\)/)
  assert.match(src,/contactConsent: consent/)
  assert.match(src,/<details className=\{styles\.optionalName\}>/)
  assert.match(src,/<details className=\{styles\.privacy\}>/)
  assert.doesNotMatch(src,/localStorage|sendBeacon|autoSubmit/)
  assert.match(auth,/safeEnquiryReturnPath\(returnPath, locale\)/)
  assert.match(auth,/auth\.client\.auth\.signInWithOAuth/)
  assert.match(auth,/auth\.client\.auth\.exchangeCodeForSession/)
  assert.match(auth,/joined === 'auth\/contact-profile' && method === 'GET'/)
  assert.match(auth,/const actor = await auth\.verified\(\)/)
  assert.match(auth,/PRIVATE_HEADERS/)
  assert.match(css,/\.googleButton:focus-visible/)
  assert.match(css,/\.methodChoices button\[aria-pressed="true"\]/)
  assert.match(css,/font-size:16px/)
  for(const language of ['en','ru','es']) assert.match(src,new RegExp('  '+language+': \\{'))
})

// Evaluate the actual saveEnquiry payload declarations, not a copied formula.
// Compact phone intentionally overrides the legacy form's default email mode.
function assertContactPayload(src = source('components/contact-channel-chooser.tsx')) {
  const ast = parse(src, 'contact-channel-chooser.tsx');
  const saves = descendants(ast).filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'saveEnquiry');
  assert.equal(saves.length, 1, 'Exactly one real submit implementation');
  const declarations = descendants(saves[0].body).filter(node => ts.isVariableDeclaration(node));
  const components = descendants(ast).filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ContactChannelChooser');
  assert.equal(components.length, 1, 'Exactly one actual chooser component');
  const modeDeclarations = components[0].body.statements.filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .filter(node => node.name.getText(ast) === 'expressReview');
  assert.equal(modeDeclarations.length, 1, 'One actual component-scope expressReview declaration');
  const actualMode = 'const ' + modeDeclarations[0].getText(ast) + ';';
  const actual = ['cleanedPhone', 'usePhone', 'payload'].map(name => {
    const matches = declarations.filter(node => node.name.getText(ast) === name);
    assert.equal(matches.length, 1, 'One actual ' + name + ' declaration');
    return 'const ' + matches[0].getText(ast) + ';';
  }).join('\n');
  const privateCases = [
    { publicTopic: '', description: '', express: false, normal: '', compact: '' },
    { publicTopic: '  General service  ', description: '', express: false, normal: '', compact: 'General service' },
    { publicTopic: 'General service', description: '  Synthetic private question  ', express: false, normal: 'Synthetic private question', compact: 'Synthetic private question' },
    { publicTopic: 'Express review focus: clarity', description: '', express: true, normal: '', compact: 'Express review focus: clarity' },
    { publicTopic: 'Express review focus: clarity', description: '  Synthetic private question  ', express: true, normal: 'Synthetic private question', compact: 'Express review focus: clarity\nInitial question: Synthetic private question' },
    { publicTopic: 'Express review focus:clarity', description: '', express: false, normal: '', compact: 'Express review focus:clarity' },
  ];
  for (const compactPhone of [false, true]) for (const method of ['email', 'phone']) for (const fixture of privateCases) {
    const usePhone = compactPhone || method === 'phone';
    const { payload, expressReview } = sourceModule(actualMode + '\n' + actual + '\nexport { payload, expressReview };', 'contact-payload.tsx', {}, {
      compactPhone, method, phone: '+1 (416) 555-0123', email: ' synthetic@example.test ', displayName: '',
      crypto: { randomUUID: () => base.operationId }, serviceTitle: base.serviceTitle,
      description: fixture.description, quick: false, publicTopic: fixture.publicTopic, pathname: '/en/services', locale: 'en', consent: true, website: '',
    });
    assert.equal(expressReview, compactPhone && fixture.express, 'Actual component mode respects compact scope and exact topic prefix');
    const sent = JSON.parse(JSON.stringify(payload));
    assert.equal(sent.description, compactPhone ? fixture.compact : fixture.normal, 'Actual private payload preserves the optional note only under its intended mode');
    assert.equal(sent.contact.email, usePhone ? '' : 'synthetic@example.test', 'Only selected email mode may send email');
    assert.equal(sent.contact.phone, usePhone ? '+14165550123' : '', 'Compact or selected phone mode sends normalized phone only');
    assert.equal(sent.contactConsent, true);
    const normalized = normalizePublicServiceEnquiry(sent);
    assert.equal(normalized.contact.email, sent.contact.email);
    assert.equal(normalized.contact.phone, sent.contact.phone);
  }
}
test('current compact-phone and legacy email/phone modes keep mutually exclusive contact payloads', () => assertContactPayload());
test('contact payload contract rejects losing the compact-phone override or sending hidden contact data', () => {
  const src = source('components/contact-channel-chooser.tsx');
  for (const [before, after] of [
    ['const usePhone = compactPhone || method === "phone";', 'const usePhone = method === "phone";'],
    ['email: usePhone ? "" : email.trim()', 'email: email.trim()'],
    ['phone: usePhone ? cleanedPhone : ""', 'phone: cleanedPhone'],
    ['const expressReview = compactPhone && publicTopic?.startsWith("Express review focus: ");', 'const expressReview = false;'],
    ['const expressReview = compactPhone && publicTopic?.startsWith("Express review focus: ");', 'const expressReview = publicTopic?.startsWith("Express review focus: ");'],
    ['publicTopic?.startsWith("Express review focus: ")', 'publicTopic?.includes("Express review")'],
    ['["Initial question: " + description.trim()]', '[]'],
  ]) {
    assert.equal(src.split(before).length, 2, 'Mutation targets actual contact payload exactly once');
    assert.throws(() => assertContactPayload(src.replace(before, after)), error => error.code === 'ERR_ASSERTION');
  }
});

test('actual Google auth and prefill handlers remain consented and never silently submit', () => {
  const expected = [
    'phone channel validates before POST without carrying the hidden email',
    'normal auth-start retains public-only marker and parent lock until navigation unmount',
    'quick Google prefill supplies contact but never supplies reply consent',
  ];
  const root = fileURLToPath(new URL('../', import.meta.url));
  const env = { ...process.env, ENQUIRY_SOURCE_ROOT: root };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap',
    '--test-name-pattern=^(' + expected.join('|') + ')$', 'tests/public-enquiry-selection-lifecycle.test.mjs'],
    { cwd: root, env, encoding: 'utf8', timeout: 60000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const executed = result.stdout.split('\n').filter(line => /^ok \d+ - /.test(line) && !/ # (?:SKIP|TODO)/.test(line))
    .map(line => line.replace(/^ok \d+ - /, ''));
  assert.deepEqual(executed, expected, 'All three real handler checks must execute; a stale pattern cannot pass');
  assert.match(result.stdout, /^# pass 3$/m);
  for (const outcome of ['fail', 'cancelled', 'todo']) assert.match(result.stdout, new RegExp('^# ' + outcome + ' 0$', 'm'));
});
