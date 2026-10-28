import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parse } from 'acorn'

// A routing migration must retain the complete original synthetic cases, not
// obtain a green client lane by silently losing server-only coverage.
// Deliberate future case changes must review this inventory alongside the case.
const suites = [
  {
    "file": "tests/booking-arrival-transaction.integration.mjs",
    "originalFile": "tests/booking-arrival-transaction.test.mjs",
    "sha256": "aa053d0d532706e5c1ed410f548550767646ef03d098c4a94a7f16ad644fdc30",
    "cases": [
      "commit creates exactly one neutral assigned-master inbox arrival; replay stays externally silent",
      "arrival storage failure rolls the entire booking back",
      "ordinary requests keep their existing behavior without remote arrival",
      "an unrelated account knowing the UUID cannot send; only the actual assigned master can reply",
      "talisman enquiry commits one private request and one neutral master notice, without session price or appointment"
    ]
  },
  {
    "file": "tests/booking-master-email-behavior.integration.mjs",
    "originalFile": "tests/booking-master-email-behavior.test.mjs",
    "sha256": "7da49ebc7fc397905ee5d362bd192f208eb149e15872ed29d2bfab8df15dd872",
    "cases": [
      "real adapter sends an invariant neutral payload with stable per-revision idempotency",
      "disabled, unapproved and malformed config never reaches the provider",
      "another assigned practitioner cannot use the owner destination; invalid events cannot send",
      "bad receipts and provider rejection never claim acceptance or expose provider payloads",
      "ten-second timeout aborts the real adapter without automatically resending"
    ]
  },
  {
    "file": "tests/crm-express-review-language-channels.integration.mjs",
    "originalFile": "tests/crm-express-review-language-channels.test.mjs",
    "sha256": "1bb4d51f7e18c801c115c1dd0737e7a405b81a7da0f58d8b3cefc9958a41ab83",
    "cases": [
      "English Russian Spanish website chooses the correct verified Telegram bot start language",
      "WhatsApp personal link stays manual and carries only a non-secret site language request",
      "signed official WhatsApp webhook stores language marker as locale only, never starts a bot",
      "free situation landing exposes locale-scoped chooser with distinct Telegram bot and manual WhatsApp labels",
      "free-review copy does not contradict consented optional Telegram photo and drawing",
      "free-review messenger CTAs have branded colors, clear localized names and no duplicate primary button"
    ]
  },
  {
    "file": "tests/crm-salesbot-internal-runtime.integration.mjs",
    "originalFile": "tests/crm-salesbot-internal-runtime.test.mjs",
    "sha256": "ecf0287157483ef5bde3f50e4461aaa2290c514e8988c43fedcb61a25d174b55",
    "cases": [
      "signed opt-in CRM event creates exactly one encrypted internal run; no outbound delivery",
      "no owner-activated graph makes no run or sender action",
      "invalid signed event identities, hashes and locales fail closed",
      "internal statuses explicitly distinguish waiting, owner review and done",
      "authenticated owner may resume a waiting choice, never an external send",
      "CI structural controls: only signed post-consent opt-in event can enroll; no sender",
      "R4 follow-on RLS migration explicitly binds run owner, consented Telegram identity and minimal column writes"
    ]
  },
  {
    "file": "tests/crm-telegram-inline-buttons.integration.mjs",
    "originalFile": "tests/crm-telegram-inline-buttons.test.mjs",
    "sha256": "082a16403632ca26a785c8814496131bcb3a74f5d2cc2d6d05ca1add10032993",
    "cases": [
      "message-attached V2 and legacy V1 buttons render above text composer without slash labels",
      "a genuine Telegram private callback becomes ONE bounded synthetic inbound event",
      "cross-chat, forwarded bot, automated sender and invalid updates never create CRM events",
      "stale or wrong-locale buttons are refused before encrypted CRM changes",
      "first valid signed incoming update upgrades existing webhook once, without hijack or dropping updates",
      "provider sends six owner text replies with INLINE markup, acknowledges buttons and never opens mass send",
      "webhook route acknowledges signed private callback and catches zero unwanted sends"
    ]
  },
  {
    "file": "tests/crm-telegram-preflight.integration.mjs",
    "originalFile": "tests/crm-telegram-preflight.test.mjs",
    "sha256": "f2b86a194c2e1ad9efeec8ed32b9cd6ba706241d8d2f8bc3af131ba9f2512cf4",
    "cases": [
      "private Telegram BotFather credentials can be verified BEFORE pilot without opening sends",
      "preflight verifies exact getMe username and ID, reads webhook without installing it",
      "existing correct webhook is reported without provider changes",
      "foreign webhook is a conflict, NEVER silently hijacked",
      "getMe mismatch rejects a wrong bot token without reading provider webhook",
      "a network error does not turn an unknown webhook into a connected one",
      "owner API and UI require verified sign-in and explicit action; all real delivery gates remain"
    ]
  }
]
const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const packageScripts = () => JSON.parse(read('package.json')).scripts
const digest = source => createHash('sha256').update(source).digest('hex')
function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  visit(node)
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit))
    else if (value && typeof value === 'object') walk(value, visit)
  }
}
function cases(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const names = new Set()
  const namespaces = new Set()
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== 'node:test') continue
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') namespaces.add(specifier.local.name)
      if (specifier.type === 'ImportDefaultSpecifier' ||
          ['test', 'it'].includes(specifier.imported?.name)) names.add(specifier.local.name)
    }
  }
  const memberName = node => node.computed ? node.property.value : node.property.name
  function testCallee(node) {
    if (node.type === 'Identifier') return names.has(node.name)
    if (node.type !== 'MemberExpression') return false
    if (node.object.type === 'Identifier' && namespaces.has(node.object.name)) {
      return ['test', 'it', 'default'].includes(memberName(node))
    }
    return ['skip', 'only', 'todo'].includes(memberName(node)) && testCallee(node.object)
  }
  const found = []
  walk(ast, node => {
    if (node.type !== 'CallExpression' || !testCallee(node.callee)) return
    const title = node.arguments[0]
    const name = title?.type === 'TemplateLiteral' && title.expressions.length === 0
      ? title.quasis[0].value.cooked : title?.value
    if (typeof name === 'string') {
      found.push({ name, direct: node.callee.type === 'Identifier' && names.has(node.callee.name) })
    }
  })
  return found
}

test('server-context inventory preserves all 37 complete original synthetic cases', () => {
  assert.equal(suites.length, 6)
  assert.equal(suites.reduce((sum, suite) => sum + suite.cases.length, 0), 37)
  for (const suite of suites) {
    assert.equal(existsSync(new URL(suite.originalFile, root)), false, suite.originalFile)
    const source = read(suite.file)
    assert.equal(digest(source), suite.sha256, 'original body changed: ' + suite.file)
    const actual = cases(source)
    assert.ok(actual.every(item => item.direct), 'skip/only modifier: ' + suite.file)
    assert.deepEqual(actual.map(item => item.name), suite.cases, suite.file)
  }
})

test('server suites run exactly once in the first native test:app command, not a later conditional tail', () => {
  const scripts = packageScripts()
  assert.equal(scripts['test:unit'], 'node --test "tests/**/*.test.mjs"')
  const commands = scripts['test:app'].split(' && ')
  assert.equal(commands.length, 2)
  assert.equal(commands[1], 'npm run test:monetization')
  const argv = commands[0].split(/\s+/)
  assert.deepEqual(argv.slice(0, 3), ['node', '--conditions=react-server', '--test'])
  const files = argv.slice(3)
  assert.ok(files.every(file => /^tests\/[A-Za-z0-9_./-]+\.(?:test|integration)\.mjs$/.test(file)))
  assert.equal(new Set(files).size, files.length, 'duplicate first-lane path')
  for (const suite of suites) {
    assert.equal(files.filter(file => file === suite.file).length, 1, suite.file)
    for (const [name, command] of Object.entries(scripts)) {
      assert.equal(command.includes(suite.originalFile), false, name + ': stale path')
      if (name !== 'test:app') assert.equal(command.includes(suite.file), false, name + ': duplicate route')
    }
  }
  assert.ok(scripts['test:monetization'].includes(' tests/crm-*.test.mjs '))
  assert.doesNotMatch(scripts['test:monetization'], /integration\.mjs|tests\/\*\*\/\*|NODE_OPTIONS|--test-skip/)
})

test('each migrated original case has one static named definition in the test inventory', () => {
  const expected = new Map(suites.flatMap(suite => suite.cases.map(name => [name, suite.file])))
  assert.equal(expected.size, 37, 'duplicate original case name')
  const found = new Map([...expected.keys()].map(name => [name, []]))
  for (const path of readdirSync(new URL('tests/', root), { recursive: true })) {
    if (!path.endsWith('.mjs')) continue
    const file = 'tests/' + path.replaceAll('\\', '/')
    const source = read(file)
    for (const item of cases(source)) {
      if (found.has(item.name)) found.get(item.name).push(file)
    }
  }
  for (const [name, file] of expected) assert.deepEqual(found.get(name), [file], name)
})

test('default unit context still reaches the genuine server-only client poison', async () => {
  assert.equal(fileURLToPath(import.meta.resolve('server-only')).split('/').at(-1), 'index.js')
  await assert.rejects(import('server-only'), error =>
    error.message.includes('cannot be imported from a Client Component module'))
  for (const file of [
    'lib/app/repository.js', 'lib/app/database.js',
    'lib/practitioners/client-messages.js', 'lib/practitioners/booking-master-email.js',
    'lib/crm/messenger-webhook.js', 'lib/crm/messenger-provider.js',
    'lib/crm/salesbot-internal-runtime.js', 'lib/crm/salesbot-internal-store.js',
  ]) assert.match(read(file), /^import ['"]server-only['"]/m, file)
})

test('both existing focused workflows follow renamed suites and every change keeps the unfiltered AppR1 route', () => {
  const app = read('.github/workflows/hh-app-r1.yml')
  assert.match(app, /pull_request:\n    branches: \['codex\/public-book-library'\]/)
  assert.doesNotMatch(app, /^\s*paths(?:-ignore)?:/m)
  assert.match(app, /run: npm run test:app(?:\s|$)/)
  for (const [path, prefix] of [
    ['.github/workflows/hh-crm-source-check.yml', 'crm-'],
    ['.github/workflows/hh-messenger-notification-build.yml', 'booking-'],
  ]) {
    const workflow = read(path)
    assert.ok(workflow.includes("      - 'tests/" + prefix + "*.test.mjs'"), 'existing triggers retained')
    for (const suite of suites.filter(item => item.file.startsWith('tests/' + prefix))) {
      assert.ok(workflow.includes("      - '" + suite.file + "'"), 'missing trigger: ' + suite.file)
      assert.equal(workflow.includes(suite.originalFile), false, 'stale workflow path')
      const commands = workflow.split('\n').filter(line => line.includes('run: node --conditions=react-server --test '))
      assert.equal(commands.filter(line => line.trim().split(/\s+/).includes(suite.file)).length, 1,
        'focused native server execution: ' + suite.file)
    }
  }
})
