import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const ide = JSON.parse(read('.vscode/mcp.json'))
const codex = read('.codex/config.toml')
const agent = read('AGENTS.md')
const visualSkill = read('.agents/skills/visual-to-code-pro/SKILL.md')
const browser = read('scripts/verify-practice-visual-browser.mjs')
const workflow = read('.github/workflows/practice-visual-browser.yml')
const sample = JSON.parse(read('scripts/fixtures/practice-approved-reference-20261028.json'))

test('official visual MCPs are declared for trusted IDE and Codex, with pinned versions', () => {
  const servers = ide.servers
  assert.deepEqual(Object.keys(servers).sort(),['figma','holistic-chrome-devtools','holistic-playwright'])
  assert.equal(servers.figma.url,'https://mcp.figma.com/mcp')
  for (const [key,version] of [
    ['holistic-playwright','@playwright/mcp@0.0.83'],
    ['holistic-chrome-devtools','chrome-devtools-mcp@1.12.0'],
  ]) {
    assert.equal(servers[key].type,'stdio')
    assert.equal(servers[key].command,'npx')
    assert.ok(servers[key].args.includes(version),key+' must use reviewed version')
    assert.ok(servers[key].args.includes('--isolated'),key+' must not borrow a personal browser')
    assert.ok(servers[key].args.includes('--headless'),key+' must be automation-friendly')
    assert.ok(codex.includes(version),key+' project Codex config in sync')
  }
  assert.match(codex,/\[mcp_servers\.figma\]/)
  assert.doesNotMatch(JSON.stringify(servers)+codex,/@latest|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY/)
})

test('agent guidance requires correct view first and actual rendered screenshot comparisons', () => {
  assert.match(agent,/page identity/i)
  assert.match(visualSkill,/Critical gate — identify the right screen/)
  assert.match(visualSkill,/Different route, function and image dimensions/)
  assert.match(visualSkill,/browser screenshot/)
  assert.match(visualSkill,/Chrome DevTools/)
})

test('browser QA has real Chromium + WebKit, all four iPhone widths, EN/RU/ES and synthetic boundaries', () => {
  for (const value of ['chromium','webkit','320','354','390','430','ru','en','es','page.screenshot','documentWidth'])
    assert.ok(browser.includes(value),value)
  assert.match(browser,/data-practice-showcase/)
  assert.match(browser,/ready=service/)
  assert.match(browser,/SYNTHETIC_FIXTURE_ONLY/)
  assert.match(browser,/playwright/)
  assert.match(workflow,/node scripts\/verify-practice-visual-browser\.mjs/)
  assert.match(workflow,/actions\/upload-artifact@v4/)
  assert.match(workflow,/node --test tests\/compare-ui-screenshots\.test\.mjs/)
  assert.ok(!workflow.includes('VERCEL_TOKEN') && !workflow.includes('SUPABASE_SERVICE_ROLE_KEY'))
})

test('approved reference landmarks refer to correct existing dashboard, not service editor', () => {
  assert.equal(sample.referenceRoute,'/ru/practice')
  assert.equal(sample.browserChromeExcluded,true)
  assert.equal(sample.referenceImageNotCommitted,true)
  assert.equal(sample.requiredTileCount,6)
  assert.equal(sample.requiredOfferCoverCount,6)
  assert.equal(sample.requiredNavCount,5)
  assert.ok(sample.landmarksCssPx.heroY.value>sample.landmarksCssPx.gridY.value)
  assert.ok(sample.landmarksCssPx.offersY.value>sample.landmarksCssPx.heroY.value)
})
