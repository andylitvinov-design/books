import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../components/growth-studio-connections.jsx',import.meta.url),'utf8')
const styles=readFileSync(new URL('../components/growth-studio.module.css',import.meta.url),'utf8')
const actions=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')

test('getting-started panel links exactly to real verified provider setup pages',()=>{
  for(const link of [
    'https://t.me/BotFather',
    'https://vercel.com/super10/codex-public-book-library/settings/environment-variables',
    '/admin/youtube-upload',
    'https://app.metricool.com/',
    'https://business.facebook.com/',
    'https://github.com/andylitvinov-design/books/blob/codex/public-book-library/docs/growth-studio/OWNER_CONNECTION_SETUP_2026-10-20.md',
  ])assert.ok(ui.includes(link),link)
  assert.doesNotMatch(ui,/app\.hypd\.ai\/sources\?manage=(?:google-ads|meta|search-console)/)
  assert.match(ui,/t\.setupTelegram/)
  assert.match(ui,/t\.setupStorage/)
  assert.match(ui,/t\.setupYouTube/)
  assert.match(ui,/t\.setupOthers/)
})
test('owner-only Telegram credential keys are explained, not read from client or user-submitted',()=>{
  for(const key of ['HH_GROWTH_TELEGRAM_ENABLED','HH_GROWTH_TELEGRAM_BOT_TOKEN','HH_GROWTH_TELEGRAM_CHAT_ID'])
    assert.ok(ui.includes(key))
  assert.doesNotMatch(ui,/process\.env|fetch\(\s*['"]https:\/\/api\.telegram|bot\d{8,}:[A-Za-z0-9_-]+/)
  assert.match(ui,/t\.setupNoSecrets/)
  assert.match(ui,/telegram\.ready/)
  assert.match(ui,/checkGrowthTelegramPublisherAction\(\)/)
  assert.match(actions,/requireAdminRequest\(\)/)
  assert.match(actions,/verifyTelegramPostingPermissions\(\)/)
})
test('manual guide cannot be mistaken for actual network OAuth success',()=>{
  assert.match(ui,/t\.bridgeNote/)
  assert.match(ui,/t\.manualOnly/)
  assert.match(ui,/t\.external/)
  assert.match(ui,/t\.connection/)
  assert.match(ui,/t\.noTests/)
  assert.match(ui,/onClick=\{verify\}/)
  assert.match(ui,/onClick=\{verifyStorage\}/)
  assert.doesNotMatch(ui,/sendTelegramPost\(|publishGrowthTelegramNowAction\(/)
})
test('mobile setup is compact, accessible and does not expand private network scope',()=>{
  assert.match(styles,/\.growthSetupSteps/)
  assert.match(styles,/@media\(max-width:750px\)/)
  assert.match(ui,/rel="noopener noreferrer"/)
  assert.match(ui,/t\.setupTelegramKeys/)
  assert.match(ui,/className=\{styles\.growthSetupEnv\}/)
  assert.doesNotMatch(ui,/PRESCRIPTIONS_ADMIN_TOKEN|PRESCRIPTIONS_KV_REST_API_TOKEN/)
})
