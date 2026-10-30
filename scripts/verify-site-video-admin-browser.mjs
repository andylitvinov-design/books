
/**
 * Real admin-page browser E2E with synthetic, loopback-only Google/Supabase
 * identity, an isolated migrated Postgres and ephemeral Redis. It exercises
 * the real practitioner/open API and v2 admin cookie issuance; NEVER forges
 * the retired v1 static admin cookie or bypasses requireAdminRequest.
 */
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn, execFile } from 'node:child_process'
import { once } from 'node:events'
import { createServer as httpServer } from 'node:http'
import { createServer as httpsServer } from 'node:https'
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { chromium, expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import pg from 'pg'
import { SITE_VIDEO_SLOTS } from '../lib/site-videos/model.js'
import { RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'

const origin = 'http://127.0.0.1:3100'
const evidence = '/tmp/site-video-admin-evidence'
const namespace = 'holistic-house:site-videos:v1'
const testToken = 'synthetic-video-browser-test-only'
const userId = '10000000-0000-4000-8000-000000000001'
const sessionId = '20000000-0000-4000-8000-000000000001'
const ownerEmail = 'andy.litvinov@gmail.com'
const user = { id:userId, aud:'authenticated', email:ownerEmail,
  user_metadata:{full_name:'Synthetic browser owner'}, app_metadata:{provider:'google'},
  created_at:'2026-10-01T00:00:00Z', last_sign_in_at:new Date().toISOString() }
const claims = { sub:userId, session_id:sessionId, aud:'authenticated', role:'authenticated', exp:Math.floor(Date.now()/1000)+3600 }
const jwt = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url') + '.' +
  Buffer.from(JSON.stringify(claims)).toString('base64url') + '.' + Buffer.from('synthetic-ci-signature').toString('base64url')
const supabaseUrl = 'http://127.0.0.1:54321'
const publishableKey = 'sb_publishable_synthetic_012345678901234567890'
const exec = promisify(execFile)
const results=[]
const pageErrors=[]
function pass(label){results.push(label);console.log('PASS: '+label)}
function pause(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
let provider, storeServer, app, browser
mkdirSync(evidence,{recursive:true})
assert.equal(process.env.CI,'true')
assert.equal(process.env.HH_APP_TEST_RUNTIME,'isolated')
assert.ok(!process.env.VERCEL, 'Never run synthetic authentication in Vercel')
assert.equal(process.env.HH_APP_SUPABASE_URL,supabaseUrl)
assert.equal(process.env.HH_APP_SUPABASE_PUBLISHABLE_KEY,publishableKey)
assert.equal(new URL(process.env.HH_APP_DATABASE_URL||'').hostname,'127.0.0.1')
assert.equal(new URL(process.env.HH_TEST_ADMIN_DATABASE_URL||'').hostname,'127.0.0.1')

async function authenticateOwner(context){
  const cookies = new Map()
  const client = createServerClient(supabaseUrl,publishableKey,{
    auth:{ experimental:{appendPkceFlowIdToRedirects:true} },
    cookieOptions:{ name:'hh-app-auth', httpOnly:true,secure:false,sameSite:'lax',path:'/' },
    cookies:{
      encode:'tokens-only',
      getAll(){return [...cookies].map(([name,value])=>({name,value}))},
      setAll(items){for(const {name,value} of items) cookies.set(name,value)},
    },
  })
  const {error} = await client.auth.setSession({ access_token:jwt, refresh_token:'synthetic-local-refresher' })
  assert.equal(error,null,'Authenticated provider must validate the synthetic owner before storing SDK cookie')
  assert.ok([...cookies.keys()].some(name=>/^hh-app-auth(?:\.\d+)?$/.test(name)),'Real Supabase SSR cookie not persisted')
  await context.addCookies([...cookies].map(([name,value])=>({name,value,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax',secure:false})))
  const denied = await context.request.get(origin+'/admin/videos',{maxRedirects:0})
  assert.ok([303,307,308].includes(denied.status()),'SDK-only cookie must not bypass the practitioner bridge')
  const opened = await context.request.post(origin+'/api/app/practitioner/open',{
    data:{destination:'videos'},headers:{Origin:origin},timeout:30000,
  })
  assert.equal(opened.status(),200,'Verified owner API must issue a real scoped admin session')
  assert.equal((await opened.json()).redirectUrl,'/admin/videos')
  const granted = await context.cookies(origin+'/admin/videos')
  assert.ok(granted.some(cookie=>cookie.name==='prescriptions_admin'&&/^v2\.[A-Za-z0-9_-]{43}$/.test(cookie.value)),
    'Owner bridge must mint a valid new v2 admin cookie, never a static legacy token')
  pass('Real owner Google-style synthetic identity, persisted session and protected v2 admin bridge');
}

async function navigate(target){
  const options={waitUntil:'domcontentloaded',timeout:60000}
  let response=await page.goto(new URL(target,origin).href,options)
  if(!response)response=await page.reload(options)
  assert.ok(response,'No response for '+target)
  assert.equal(response.status(),200,target)
  await expect(page.locator('main').first()).toBeVisible()
}
let page
try{
  const db = new pg.Client({connectionString:process.env.HH_TEST_ADMIN_DATABASE_URL})
  await db.connect()
  try{
    const changed=await db.query('update auth.users set email=$1 where id=$2 returning id',[ownerEmail,userId])
    assert.equal(changed.rowCount,1,'Isolated app-db-setup did not seed the expected owner test actor')
    // The real app request adapter rejects even a signed-in provider identity
    // when no current app.account exists. Seed the *synthetic* owner only in
    // this freshly migrated loopback CI database; never fake accountLock.
    const inserted=await db.query(
      "insert into app.accounts(id,display_name,onboarding_state,status) values($1,$2,'active','active') on conflict(id) do nothing returning id",
      [userId,'Synthetic CI Owner'])
    assert.equal(inserted.rowCount,1,'Expected an empty, disposable local owner account fixture')
  }finally{await db.end()}

  provider = httpServer((request,response)=>{
    const path=new URL(request.url||'/',supabaseUrl).pathname
    if(request.method==='GET'&&path==='/auth/v1/user'&&
      request.headers.authorization==='Bearer '+jwt){
      response.writeHead(200,{'Content-Type':'application/json'})
      response.end(JSON.stringify(user));return
    }
    response.writeHead(401,{'Content-Type':'application/json'})
    response.end(JSON.stringify({code:'unauthorized',message:'Unapproved isolated auth request'}))
  })
  provider.listen(54321,'127.0.0.1')
  await once(provider,'listening')

  storeServer=httpsServer({
    key:readFileSync('/tmp/video-test-key.pem'),cert:readFileSync('/tmp/video-test-cert.pem')
  },async(request,response)=>{
    try{
      assert.equal(request.method,'POST')
      assert.equal(request.headers.authorization,'Bearer '+testToken)
      let raw=''
      for await(const chunk of request){raw+=chunk;assert.ok(raw.length<500000)}
      const cmd=JSON.parse(raw)
      assert.ok(Array.isArray(cmd)&&typeof cmd[0]==='string')
      const key=cmd[cmd[0]==='EVAL'?3:1]
      const site=key===namespace&&['HGET','HGETALL','EVAL'].includes(cmd[0])
      const session=/^prescription:session:[a-f0-9]{64}$/.test(key||'')&&['SET','GET','DEL'].includes(cmd[0])
      assert.ok(site||session,'Isolated test Redis command outside video or admin-session namespace')
      const {stdout}=await exec('redis-cli',['-h','127.0.0.1','-p','6379','--json',...cmd.map(String)],{maxBuffer:4*1024*1024})
      response.writeHead(200,{'Content-Type':'application/json'})
      response.end(JSON.stringify({result:JSON.parse(stdout)}))
    }catch(error){
      console.error('Isolated browser Redis contract error:',error.message)
      response.writeHead(400,{'Content-Type':'application/json'})
      response.end(JSON.stringify({error:'Invalid isolated test command'}))
    }
  })
  storeServer.listen(443,'127.0.0.1')
  await once(storeServer,'listening')

  const log=createWriteStream(evidence+'/admin-dev.log')
  app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3100','-H','127.0.0.1'],{
    env:{...process.env,NODE_ENV:'development',
      PRESCRIPTIONS_ADMIN_TOKEN:testToken,PRESCRIPTIONS_ADMIN_PIN:'',
      PRESCRIPTIONS_KV_REST_API_URL:'https://127.0.0.1',
      PRESCRIPTIONS_KV_REST_API_TOKEN:testToken,
      PRESCRIPTIONS_DATA_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64'),
      HH_APP_SUPABASE_URL:supabaseUrl,
      HH_APP_SUPABASE_PUBLISHABLE_KEY:publishableKey,
      HH_APP_ALLOWED_ORIGINS:origin,
      HH_APP_TEST_RUNTIME:'isolated',
      HH_APP_ENABLED:'true',
      HH_APP_PRODUCTION_APPROVED:'false',
    },
    stdio:['ignore','pipe','pipe'],
  })
  app.stdout.pipe(log);app.stderr.pipe(log)
  let started=false
  for(let attempt=0;attempt<120;attempt++){
    try{const response=await fetch(origin+'/en/about');if(response.ok){started=true;break}}
    catch{}
    if(app.exitCode!==null)break
    await pause(1000)
  }
  assert.ok(started,'Next dev server did not start in isolated mode; never use production database or secrets')
  browser=await chromium.launch({headless:true})
  const publicContext=await browser.newContext({viewport:{width:1365,height:1000},serviceWorkers:'block'})
  page=await publicContext.newPage()
  page.on('pageerror',error=>pageErrors.push('public: '+String(error.stack || error.message).slice(0,1600)))
    const adminContext = await browser.newContext({ viewport: { width: 1365, height: 1000 }, serviceWorkers: 'block' })
    await authenticateOwner(adminContext)
    const editor = await adminContext.newPage()
    editor.on('pageerror', error => pageErrors.push('owner editor: '+String(error.stack || error.message).slice(0,1600)))
    async function openEditor(target = editor) {
      await target.goto(`${origin}/admin/videos`)
      // Prove that the editor has hydrated before exercising the separately
      // hydrated header's EN/RU event; an SSR-only click is not an E2E action.
      const videoLanguage = target.locator('.site-video-language-picker button')
      await videoLanguage.nth(1).click()
      await expect(videoLanguage.nth(1)).toHaveAttribute('aria-pressed', 'true')
      await videoLanguage.nth(0).click()
      await expect(videoLanguage.nth(0)).toHaveAttribute('aria-pressed', 'true')
      const ru = target.locator('.prescription-admin-header button[lang="ru"]')
      const en = target.locator('.prescription-admin-header button[lang="en"]')
      await ru.click()
      await expect(target.locator('.site-video-manager')).toHaveAttribute('lang', 'ru')
      await en.click()
      await expect(target.locator('.site-video-manager')).toHaveAttribute('lang', 'en')
      await expect(en).toHaveAttribute('aria-pressed', 'true')
      // All 16 canonical site-video slots are selectable in the same editor.
      await expect(target.locator('.site-video-placement-list button')).toHaveCount(16)
      assert.equal(await target.getByText('Video storage is currently unavailable.', { exact: false }).count(), 0)
    }
    async function choose(slot, locale = 'en', target = editor) {
      await target.locator('.site-video-language-picker button').nth(locale === 'en' ? 0 : 1).click()
      await target.locator('.site-video-placement-list button').filter({ hasText: slot.label.en }).click()
      if (slot.entityType) await target.locator('.site-video-field select').first().selectOption({ index: 1 })
    }
    async function fill(title, target = editor) {
      await target.locator('input[name="youtubeUrl"]').fill('https://youtu.be/OkLEN8Zb-sY?si=test-tracker')
      await target.locator('input[name="title"]').fill(title)
    }
    async function save(intent, target = editor) {
      if (intent === 'publish') {
        await target.locator('input[name="reviewed"]').check()
        await target.locator('.site-video-admin-button--primary').click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video published to the selected page.')
      } else if (intent === 'draft') {
        await target.getByRole('button', { name: 'Save draft', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Draft saved.')
      } else {
        await target.getByRole('button', { name: 'Hide from website', exact: true }).click()
        await expect(target.locator('[aria-live="polite"]')).toContainText('Video hidden from the website.')
      }
    }
    await openEditor()
    await fill('QA unpublished private-to-editor title')
    await save('draft')
    await openEditor()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA unpublished private-to-editor title')
    await navigate('/?lang=en')
    assert.ok(!(await page.content()).includes('QA unpublished private-to-editor title'))
    pass('Draft persists across reload and stays out of public output')
    await editor.locator('input[name="youtubeUrl"]').fill('https://drive.google.com/file/d/invalid-playback/view')
    await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
    pass('Drive playback URL rejected')
    for (const locale of ['en', 'ru']) {
      const publicSlots = SITE_VIDEO_SLOTS.filter(slot => locale === 'en' || !slot.id.startsWith('method-'))
      for (const slot of publicSlots) {
        console.log(`CHECK: publish ${slot.id}:${locale}`)
        await choose(slot, locale)
        const title = `QA ${slot.id} ${locale}`
        await fill(title)
        await expect(editor.locator('.site-video-admin-button--primary')).toBeDisabled()
        await save('publish')
        const destination = await editor.locator('.site-video-editor-heading > a').getAttribute('href')
        await navigate(destination)
        if (slot.id === 'home-intro') {
          // The public Home design intentionally suppresses the archived
          // intro even when its admin record is validly published. Keep the
          // real publish server action above, and assert no public leakage.
          await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
          assert.ok(!(await page.content()).includes(title),
            'Retired Home intro must not leak a published admin title: '+locale)
          await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
          continue
        }
        if (slot.id === 'thank-you') {
          // The thank-you page deliberately hides every video before a valid
          // tab-local enquiry receipt. Seed only an isolated synthetic browser
          // receipt; no real lead, payment, private account or session is touched.
          assert.equal(await page.locator('.site-video-player').filter({ hasText: title }).count(), 0)
          await page.evaluate(key => {
            window.sessionStorage.setItem(key, JSON.stringify({
              referenceCode: 'HH-0123456789AB', createdAt: Date.now(),
            }))
          }, RECEIPT_SESSION_KEY)
          await page.reload({ waitUntil: 'domcontentloaded' })
        }
        await expect(page.locator('.site-video-player').filter({ hasText: title })).toHaveCount(1)
      }
      pass(`All ${publicSlots.length} ${locale.toUpperCase()} owner-managed placements publish via real actions; retired Home intro cannot leak`)
    }
    await choose(SITE_VIDEO_SLOTS[0])
    await editor.screenshot({ path: `${evidence}/editor-desktop.png`, fullPage: true })
    await editor.setViewportSize({ width: 390, height: 844 })
    assert.ok(await editor.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await editor.screenshot({ path: `${evidence}/editor-mobile.png`, fullPage: true })
    pass('Authenticated mobile editor has no overflow')
    await editor.setViewportSize({ width: 1365, height: 1000 })
    await fill('QA newer draft preserves publication')
    await save('draft')
    await navigate('/?lang=en')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    assert.ok(!(await page.content()).includes('QA newer draft preserves publication'))
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    pass('Draft changes preserve published snapshot; EN/RU are isolated')
    const second = await adminContext.newPage()
    await openEditor(second)
    await fill('QA editor A accepted')
    await save('publish')
    await fill('QA editor B retained edits', second)
    await second.getByRole('button', { name: 'Save draft', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('changed in another window')
    await second.getByRole('button', { name: 'Refresh list and keep edits', exact: true }).click()
    await expect(second.locator('[aria-live="polite"]')).toContainText('List refreshed.')
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    await expect(second.locator('input[name="reviewed"]')).not.toBeChecked()
    await save('publish', second)
    await navigate('/?lang=en')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    pass('Concurrent edit rejected; refresh keeps edits and resets review; republish works')
    assert.equal(await page.locator('iframe').count(), 0)
    // Owner withdrew approval: even a newly published archived home intro cannot
    // leak back onto the public homepage. Testimonial videos remain independent.
    await expect(page.locator('[data-personal-testimonials="home"]')).toHaveCount(1)
    pass('Archived unpublished-quality home introduction cannot reappear in public')
    await save('hide', second)
    await navigate('/?lang=en')
    // Hiding a managed intro should leave independently published testimonials intact.
    assert.equal(await page.locator('[data-video-slot="home-intro"] .site-video-player').count(), 0)
    await navigate('/?lang=ru')
    await expect(page.locator('[data-video-slot="home-intro"]')).toHaveCount(0)
    await openEditor(second)
    await expect(second.locator('input[name="title"]')).toHaveValue('QA editor B retained edits')
    pass('Hide persists, retains draft and leaves other language unchanged')
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('.site-video-placement-list button')).toHaveCount(2)
    await expect(editor.locator('.site-video-editor-heading > a')).toHaveAttribute('href', '/es/about')
    await fill('QA Spanish About independent publication')
    await save('publish')
    await navigate('/es/about')
    await expect(page.getByText('QA Spanish About independent publication', { exact: true })).toHaveCount(1)
    await save('hide')
    await navigate('/es/about')
    await expect(page.locator('[data-video-slot="about-intro"]')).toHaveCount(0)
    await navigate('/en/about')
    await expect(page.getByText('QA about-intro en', { exact: true })).toHaveCount(1)
    await navigate('/ru/about')
    await expect(page.getByText('QA about-intro ru', { exact: true })).toHaveCount(1)
    await openEditor()
    await editor.locator('.site-video-language-picker button').filter({ hasText: 'Spanish' }).click()
    await expect(editor.locator('input[name="title"]')).toHaveValue('QA Spanish About independent publication')
    pass('Spanish About publish/hide/reload via real actions preserves EN/RU and never falls back to English')
    await adminContext.close()

  assert.deepEqual(pageErrors,[],'Unexpected JavaScript errors in authentic owner/private editor browser')
  pass('No browser JavaScript errors in public and private editor')
  writeFileSync(evidence+'/results.json',JSON.stringify({mode:'isolated Postgres+Supabase+Redis verified owner',passed:results},null,2))
  console.log('VERIFIED: '+results.length+' synthetic signed-in owner and publication scenario groups')
}catch(error){
  try{console.error('Isolated admin dev log tail:',readFileSync(evidence+'/admin-dev.log','utf8').slice(-6000))}catch{}
  throw error
}finally{
  if(browser)await browser.close()
  if(app)app.kill('SIGTERM')
  if(storeServer)storeServer.close()
  if(provider)provider.close()
}
