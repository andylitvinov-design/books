import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { PHONE_COUNTRIES, E164_PHONE, composeCountryPhone, phoneCountryFromValue, phoneNationalPart } from '../lib/contact/phone-country.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const payload = {
  operationId: '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle: 'Tantra Reiki',
  description: 'I would like to join the next Level 1 course.',
  sourcePath: '/en/academy/reiki/tantra-reiki',
  locale: 'en',
  contactConsent: true,
  contact: { displayName:'  Alex Example  ', email:'  ALEX@example.test ', phone:' +1 (416) 555-0123 ' },
  website:'',
}

test('public course registration normalizes consented contact and marks source as academy',()=>{
  const result=normalizePublicServiceEnquiry(payload)
  assert.equal(result.contact.displayName,'Alex Example')
  assert.equal(result.contact.email,'alex@example.test')
  assert.equal(result.contact.phone,'+14165550123')
  assert.equal(result.contact.source,'academy')
  assert.equal(result.contactConsent,true)
  assert.equal(result.website,undefined)
})
test('service registration is lead-source website and accepts phone-only contact',()=>{
  const result=normalizePublicServiceEnquiry({...payload,
    locale:'ru', sourcePath:'/ru/services/alchemy-of-soul',
    contact:{displayName:'Мария',phone:'+442071234567'},
  })
  assert.deepEqual(result.contact,{displayName:'Мария', email:'', phone:'+442071234567',source:'website'})
})
test('contact-only interest is valid without a personal note across all locales',()=>{
  for(const locale of ['en','ru','es']){
    const result=normalizePublicServiceEnquiry({...payload,locale,description:''})
    assert.match(result.description,/Tantra Reiki/)
    assert.ok(result.description.length>=10)
    assert.equal(result.contactConsent,true)
    const withoutField={...payload,locale}
    delete withoutField.description
    assert.equal(normalizePublicServiceEnquiry(withoutField).description,result.description)
  }
})
test('short optional comments remain in the encrypted request and legacy guest requests still need a description',()=>{
  const short=normalizePublicServiceEnquiry({...payload,description:'Hi'})
  assert.ok(short.description.endsWith(' Hi'))
  for(const bad of [
    {...payload,description:'x'.repeat(1401)},
    {...payload,description:'hello\u0007world'},
    {...payload,description:42},
  ])assert.throws(()=>normalizePublicServiceEnquiry(bad))
  const {contact,contactConsent,website,...legacy}=payload
  assert.throws(()=>normalizePublicServiceEnquiry({...legacy,description:''}))
})
test('public registration never stores unconsented, malformed or unexpected contact fields',()=>{
  for (const candidate of [
    {...payload,contactConsent:false},
    {...payload,contactConsent:undefined},
    {...payload,contact:null},
    {...payload,contact:{displayName:'A',email:'alex@example.test'}},
    {...payload,contact:{displayName:'Alex'}},
    {...payload,contact:{displayName:'Alex',email:'not-an-email'}},
    {...payload,contact:{displayName:'Alex',phone:'(416) 555 0123'}},
    {...payload,contact:{displayName:'Alex',email:'alex@example.test',marketing:true}},
    {...payload,website:'https://spam.test'},
    {...payload,sourcePath:'/en/app/practice'},
    {...payload,sourcePath:'/en/academy/reiki?token=abc'},
  ]) assert.throws(()=>normalizePublicServiceEnquiry(candidate))
})
test('legacy contactless enquiry is backwards-compatible and contact-only consent is rejected',()=>{
  const {contact,contactConsent,website,...legacy}=payload
  assert.deepEqual(normalizePublicServiceEnquiry(legacy),legacy)
  assert.throws(()=>normalizePublicServiceEnquiry({...legacy,contactConsent:true}))
})
test('guest registration creates an encrypted CRM contact in the same transaction, without marketing opt-in',()=>{
  const backend=read('lib/practitioners/public-service-enquiry.js')
  const endpoint=read('app/api/service-enquiries/route.js')
  const sql=read('supabase/migrations/20261020165000_hh_public_service_crm_contact_intake_20261020.sql')
  assert.match(backend,/transaction\(config, null, async db =>/)
  assert.match(backend,/app\.public_service_enquiries/)
  assert.match(backend,/app\.crm_contacts/)
  assert.match(backend,/on conflict do nothing/i)
  assert.match(backend,/contactConsent|replyConsent/)
  assert.match(backend,/seal\(\{\s*displayName: contact\.displayName/)
  assert.match(backend,/contactProvenance: manuallyRecorded\?\.submittedByVisitor/)
  assert.match(backend,/enquiry: \{ referenceCode, serviceTitle, sourcePath \}/)
  assert.match(endpoint,/requireSameOrigin\(request, config\)/)
  assert.match(endpoint,/consumeRate/)
  assert.match(sql,/grant insert \(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source\)/)
  assert.match(sql,/for insert to hh_app_backend/)
  assert.match(sql,/app\.public_service_enquiries/)
  assert.match(sql,/hh\.public_enquiry_operation/)
  assert.match(sql,/crm_contacts\.owner_id/)
  assert.match(sql,/email_verified = false and suppressed = false/)
  assert.doesNotMatch(sql,/grant\s+(all|select|update|delete)\s+on\s+app\.crm_contacts\s+to\s+(anon|authenticated|hh_app_backend)/i)
  assert.doesNotMatch(sql,/security definer|marketing_consent|send_sms|send_email/i)
})
test('shared course/service chooser requires a reply contact and opt-in; name is optional',()=>{
  const view=read('components/contact-channel-chooser.tsx')
  const styles=read('components/contact-channel-chooser.module.css')
  for (const term of ['autoComplete="name"','autoComplete="email"',
    'contactConsent: consent', 'contact: { displayName:', 'type="checkbox" required',
    'setConsent(false)','setDisplayName("")','setPhone("")']) {
    assert.ok(view.includes(term),term)
  }
  assert.match(read('components/phone-country-input.tsx'),/autoComplete="tel-national"/)
  assert.match(view,/sourcePath: pathname, locale/)
  assert.match(view,/scope\.submit\(/)
  const submission=read('lib/practitioners/public-enquiry-submission.js')
  assert.match(submission,/fetchImpl\('\/api\/service-enquiries'/)
  assert.match(view,/name:\s*"Ваше имя"/)
  assert.match(view,/name:\s*"Tu nombre"/)
  assert.match(view,/className=\{styles\.optionalNote\}/)
  assert.doesNotMatch(view,/c\.situation \+ ": " \+ description/)
  const alchemy=read('components/alchemy-soul-lead-form.tsx')
  assert.doesNotMatch(alchemy,/name\.trim\(\) \? \{ context:/)
  assert.doesNotMatch(alchemy,/name="name" autoComplete="given-name"/)
  assert.match(styles,/\.honeypot/)
  assert.match(styles,/@container \(max-width:340px\)/)
  assert.doesNotMatch(view,/localStorage|sendBeacon/i)
  const contacts=read('components/app/crm-manager.jsx')
  const store=read('lib/crm/repository.js')
  assert.match(contacts,/contact\.enquiry\?\.serviceTitle/)
  assert.match(contacts,/contact\.enquiry\.referenceCode/)
  assert.match(store,/\.\.\.\(former\.enquiry \? \{enquiry:former\.enquiry\} : \{\}\)/)
})

// Inspect the actual imported JSX child, not a tel token in an unrelated file.
// Components are parsed as source only; no React hooks, rendering or requests.
const parse = (path, source = read(path)) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const compact = text => text.replace(/\s+/g, '')
function namedImport(ast, name, path) {
  const matches = ast.statements.filter(ts.isImportDeclaration).filter(statement =>
    statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings) &&
    statement.importClause.namedBindings.elements.some(element => element.name.text === name))
  assert.equal(matches.length, 1, `${name}: one actual named import`)
  const statement = matches[0]
  assert.ok(!statement.importClause.isTypeOnly, `${name}: runtime import`)
  assert.equal(statement.moduleSpecifier.text, path, `${name}: imported source`)
  const binding = statement.importClause.namedBindings.elements.find(element => element.name.text === name)
  assert.ok(!binding.isTypeOnly, `${name}: runtime binding`)
  assert.equal(binding.propertyName?.text ?? binding.name.text, name, `${name}: exported binding`)
}
function namedFunction(ast, name) {
  const matches = ast.statements.filter(ts.isFunctionDeclaration).filter(node => node.name?.text === name)
  assert.equal(matches.length, 1, `${name}: one function declaration`)
  return matches[0]
}
function jsxWithin(ast, scope, name) {
  const matches = []
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === name) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(scope)
  assert.equal(matches.length, 1, `${scope.name.text}: one actual ${name}`)
  return matches[0]
}
function attribute(ast, node, name) {
  assert.ok(!node.attributes.properties.some(ts.isJsxSpreadAttribute), `${node.tagName.getText(ast)}: no overriding spread`)
  const entries = node.attributes.properties.filter(entry => ts.isJsxAttribute(entry) && entry.name.text === name)
  assert.equal(entries.length, 1, `${node.tagName.getText(ast)}: ${name}`)
  const value = entries[0].initializer
  if (ts.isStringLiteral(value)) return value.text
  assert.ok(ts.isJsxExpression(value) && value.expression, `${name}: explicit expression`)
  return compact(value.expression.getText(ast))
}

function assertChooserPhoneContract(source = read('components/contact-channel-chooser.tsx')) {
  const chooser = parse('components/contact-channel-chooser.tsx', source)
  namedImport(chooser, 'PhoneCountryInput', '@/components/phone-country-input')
  jsxWithin(chooser, namedFunction(chooser, 'ContactChannelChooser'), 'ContactChannelChooserForm')
  const form = namedFunction(chooser, 'ContactChannelChooserForm')
  const phone = jsxWithin(chooser, form, 'PhoneCountryInput')
  for (const [name, value] of Object.entries({ id:'panelId+"-phone"', locale:'locale', disabled:'busy||googleBusy||uncertain', value:'phone' })) {
    assert.equal(attribute(chooser, phone, name), value)
  }
  assert.equal(attribute(chooser, phone, 'onChange'), 'value=>{setPhone(value);setError("");}')
  const required = phone.attributes.properties.filter(entry => ts.isJsxAttribute(entry) && entry.name.text === 'required')
  assert.equal(required.length, 1, 'Phone is required only in selected phone mode')
  assert.equal(required[0].initializer, undefined, 'Native required boolean is retained')
  let branch = phone.parent
  while (branch && !ts.isConditionalExpression(branch)) branch = branch.parent
  assert.ok(branch, 'Phone belongs to the actual contact method conditional')
  assert.equal(compact(branch.condition.getText(chooser)), 'method==="email"', 'Exact contact method selector')
  assert.ok(branch.whenFalse.getText(chooser).includes(phone.getText(chooser)), 'Phone only in phone branch')
  assert.match(branch.whenTrue.getText(chooser), /type="email"[^>]*required/, 'Email mode has its own required email')
  assert.doesNotMatch(branch.whenTrue.getText(chooser), /PhoneCountryInput/, 'Email mode does not mount phone')
  const formSource = form.getText(chooser)
  const submit = namedFunction(form.body, 'submit')
  const guard = submit.body.statements.filter(ts.isIfStatement).find(node => node.expression.getText(chooser).includes('cleanedPhone'))
  assert.ok(guard, 'actual save guard')
  assert.equal(compact(guard.expression.getText(chooser)), compact('(displayName.trim() && displayName.trim().length < 2) || displayName.trim().length > 120 || /[\\u0000-\\u001f\\u007f]/.test(displayName.trim()) || (method === "email" && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) || (method === "phone" && ! /^\\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || !consent'), 'Exact mode, optional-name and explicit-consent guard')
  assert.equal(compact(guard.thenStatement.getText(chooser)), '{setError(c.contactError);return;}')
  assert.match(formSource, /contact: \{ displayName: displayName\.trim\(\), email: method === "email" \? email\.trim\(\) : "", phone: method === "phone" \? cleanedPhone : "" \}/)
  for (const method of ['email', 'phone']) for (const name of ['', '   ', 'A', 'Alex', 'x'.repeat(120), 'x'.repeat(121), 'A\u0007B']) {
    const values = { displayName:name, method, email:'synthetic@example.test', cleanedPhone:'+14165550123', consent:true }
    const blocked = Boolean(vm.runInNewContext('(' + guard.expression.getText(chooser) + ')', values, { timeout:100, contextCodeGeneration:{strings:false,wasm:false} }))
    const input = {...payload, contact:{displayName:name.trim(), email:method==='email'?values.email:'', phone:method==='phone'?values.cleanedPhone:''}}
    let serverAccepted = true
    try { normalizePublicServiceEnquiry(input) } catch { serverAccepted = false }
    assert.equal(blocked, !serverAccepted, 'Optional submitted name agrees with unchanged server normalization')
  }
  for (const values of [
    {displayName:'',method:'email',email:'',cleanedPhone:'+14165550123',consent:true},
    {displayName:'',method:'email',email:'invalid',cleanedPhone:'+14165550123',consent:true},
    {displayName:'',method:'phone',email:'synthetic@example.test',cleanedPhone:'4165550123',consent:true},
    {displayName:'',method:'phone',email:'synthetic@example.test',cleanedPhone:'+14165550123',consent:false},
  ]) assert.equal(Boolean(vm.runInNewContext('(' + guard.expression.getText(chooser) + ')', values, {timeout:100,contextCodeGeneration:{strings:false,wasm:false}})), true, 'Inactive contact or missing consent cannot substitute for selected reply method')

  // Resolve the file from that verified import, and bind its helpers to their
  // real module, which is exercised below with synthetic phone strings only.
  const child = parse('components/phone-country-input.tsx')
  for (const name of ['PHONE_COUNTRIES', 'composeCountryPhone', 'phoneCountryFromValue', 'phoneNationalPart']) {
    namedImport(child, name, '@/lib/contact/phone-country')
  }
  const component = namedFunction(child, 'PhoneCountryInput')
  assert.ok(component.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
  const childSource = compact(component.getText(child))
  assert.ok(childSource.includes('required=false,disabled=false'))
  assert.ok(childSource.includes('useState(()=>phoneCountryFromValue(value))'))
  assert.ok(childSource.includes('constcurrent=PHONE_COUNTRIES.find(item=>item.iso===country)||PHONE_COUNTRIES[0]'))
  const input = jsxWithin(child, component, 'input')
  for (const [name, value] of Object.entries({ id:'inputId', 'aria-label':'words.number', type:'tel', inputMode:'tel', autoComplete:'tel-national', value:'phoneNationalPart(value,current.dial)', required:'required', disabled:'disabled' })) {
    assert.equal(attribute(child, input, name), value)
  }
  assert.equal(attribute(child, input, 'onChange'), compact(`event=>{
    const next=composeCountryPhone(current.dial,event.target.value);
    if(event.target.value.trim().startsWith("+"))setCountry(phoneCountryFromValue(next));
    onChange(next);
  }`))
  const country = jsxWithin(child, component, 'select')
  for (const [name, value] of Object.entries({ 'aria-label':'words.country', value:'country', disabled:'disabled' })) {
    assert.equal(attribute(child, country, name), value)
  }
  assert.equal(attribute(child, country, 'onChange'), compact(`event=>{
    const next=event.target.value,chosen=PHONE_COUNTRIES.find(item=>item.iso===next);
    const national=phoneNationalPart(value,current.dial);
    setCountry(next);
    onChange(chosen?.dial?composeCountryPhone(chosen.dial,national):"");
  }`))
  assert.match(country.parent.getText(child), /PHONE_COUNTRIES\.map\(item=><option key=\{item\.iso\} value=\{item\.iso\}/)
}

test('chooser binds real country-phone child to selected contact mode and E.164 save guard', () => assertChooserPhoneContract())

test('country-phone helpers compose national input without duplicate dial codes and preserve E.164 validation', () => {
  assert.equal(PHONE_COUNTRIES.find(country => country.iso === 'CA').dial, '+1')
  assert.equal(PHONE_COUNTRIES.find(country => country.iso === 'GB').dial, '+44')
  assert.equal(PHONE_COUNTRIES.find(country => country.iso === 'OTHER').dial, '')
  assert.equal(phoneCountryFromValue(''), 'CA')
  assert.equal(phoneCountryFromValue('+442012345678'), 'GB')
  assert.equal(phoneCountryFromValue('+999123456789'), 'OTHER')
  assert.equal(phoneNationalPart('+1 (416) 555-0123', '+1'), '4165550123')
  assert.equal(composeCountryPhone('+1', '416 555 0123'), '+14165550123')
  assert.equal(composeCountryPhone('+1', '1 416 555 0123'), '+14165550123')
  assert.equal(composeCountryPhone('+1', '+44 20 1234 5678'), '+442012345678')
  assert.equal(composeCountryPhone('+44', phoneNationalPart('+14165550123', '+1')), '+444165550123')
  assert.equal(composeCountryPhone('+1', ''), '')
  assert.equal(composeCountryPhone('', '20 1234 5678'), '2012345678')
  assert.equal(composeCountryPhone('', '+44 20 1234 5678'), '+442012345678')
  for (const value of ['+14165550123', '+442012345678']) assert.ok(E164_PHONE.test(value))
  for (const value of ['', '2012345678', '+0123456789', '+1234567', '+1234567890123456']) assert.ok(!E164_PHONE.test(value), value)
})

test('compact phone contract rejects changed method, required, consent and privacy bindings', () => {
  const source = read('components/contact-channel-chooser.tsx')
  for (const [before, after, diagnostic] of [
    ['locale={locale} required', 'locale={locale}', /Phone is required only in selected phone mode/],
    ['{method === "email" ? (', '{method === "phone" ? (', /Exact contact method selector/],
    ['disabled={busy || googleBusy || uncertain} value={phone}', 'disabled={busy || googleBusy} value={phone}', /busy\|\|googleBusy/],
    ['displayName.trim().length < 2', 'displayName.trim().length < 1', /Exact mode, optional-name and explicit-consent guard/],
    ['|| !consent) {', '|| false) {', /Exact mode, optional-name and explicit-consent guard/],
    ['phone: method === "phone" ? cleanedPhone : ""', 'phone: cleanedPhone', /contact:/],
  ]) {
    assertChooserPhoneContract(source)
    assert.ok(source.includes(before), before)
    assert.throws(() => assertChooserPhoneContract(source.replace(before, after)), diagnostic)
  }
})
