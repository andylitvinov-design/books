import { sourceFixture, icons, css, textContent } from './helpers/current-navigation-fixture.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { assertOporaGuestFirstWeek } from '../scripts/helpers/opora-guest-first-week-verifier.mjs'

// Synthetic browser surface, not imported production copy or browser acceptance.
const fixtures = {
  en: ['What will you learn in week one?', "I'm interested — sign in to enrol", 'Your first course is free. No automatic enrolment: your choices and progress are saved privately only after sign-in and confirmation.', 'Read the full programme'],
  ru: ['Что вас ждёт в первую неделю?', 'Мне интересно — войти для записи', 'Первый курс бесплатно. Никакой автоматической записи: личные данные и прогресс сохраняются только после входа и подтверждения.', 'Подробнее о программе'],
}
function surface(locale, mutation = '') {
  const [title, start, privacy, explore] = fixtures[locale]
  const nodes = {
    landing: {visible:true},
    preview: {visible:true, attrs:{'data-opora-week-one-count':mutation === 'count-attribute' ? '14' : '7'}},
    heading: {visible:true, role:'heading', name:mutation === 'locale' ? 'Wrong language' : title, level:1},
    start: {visible:true, enabled:mutation !== 'disabled', role:'button', name:start, attrs:{'data-opora-week-one-accept':'true','data-course-google-signin':''}},
    privacy: {visible:mutation !== 'privacy', name:privacy},
    explore: {visible:true, role:'link', name:explore, attrs:{href:mutation === 'link' ? '/en/app' : '/'+locale+'/courses/antistress'}},
  }
  if(mutation === 'auth-marker') delete nodes.start.attrs['data-course-google-signin']
  if(mutation === 'accept-marker') delete nodes.start.attrs['data-opora-week-one-accept']
  const days = Array.from({length:mutation === 'day-count' ? 6 : mutation === 'extra-day' ? 8 : 7},(_,i)=>({visible:true,day:mutation === 'duplicate-day' && i === 6 ? 6 : i+1}))
  nodes.landing.selector = '[data-opora-guest-landing]'
  nodes.preview.selector = '[data-opora-first-week-intro]'
  nodes.preview.children = [nodes.heading,nodes.start,nodes.privacy,nodes.explore,...days]
  nodes.landing.children = mutation === 'missing-preview' ? [] : [nodes.preview]
  if(mutation === 'outside-heading') {
    nodes.preview.children = nodes.preview.children.filter(node=>node !== nodes.heading)
    nodes.landing.children.push(nodes.heading)
  }
  function descendants(items) {
    return items.flatMap(node=>(node.children || []).flatMap(child=>[child,...descendants([child])]))
  }
  function locator(items) {
    return {
      items,
      locator(selector) {
        const day = selector.match(/^\[data-opora-preview-day="(\d+)"\]$/)
        return locator(descendants(items).filter(node=>{
          if(day) return node.day === Number(day[1])
          if(selector === '[data-opora-preview-day]') return Number.isInteger(node.day)
          if(selector === '[data-opora-fast-consent]') return mutation === 'fast-consent' && node === nodes.start
          return node.selector === selector
        }))
      },
      getByRole(role, options) { return locator(descendants(items).filter(n=>n.role === role && (typeof options.name?.test === 'function' ? options.name.test(n.name) : n.name === options.name) && (!options.level || n.level === options.level))) },
      getByText(name) { return locator(descendants(items).filter(n=>n.name === name)) },
    }
  }
  const page = locator([{children:[nodes.landing]}])
  const expect = target => ({
    async toHaveCount(count) {assert.equal(target.items.length,count)},
    async toBeVisible() {assert.equal(target.items.length,1);assert.equal(target.items[0].visible,true)},
    async toBeEnabled() {assert.equal(target.items.length,1);assert.equal(target.items[0].enabled,true)},
    async toHaveAttribute(name,value) {assert.equal(target.items.length,1);assert.equal(target.items[0].attrs?.[name],value)},
  })
  // No click/fill/fetch/request APIs exist: accidental auth/write actions fail.
  return {page, expect}
}
for(const locale of ['en','ru']) {
  test(locale+' approved compact guest preview',async()=>{
    const {page,expect}=surface(locale)
    await assertOporaGuestFirstWeek(page,expect,locale)
  })
  for(const mutation of ['count-attribute','locale','disabled','privacy','link','auth-marker','accept-marker','day-count','extra-day','duplicate-day','missing-preview','outside-heading','fast-consent']) {
    test(locale+' rejects '+mutation,async()=>{
      const {page,expect}=surface(locale,mutation)
      await assert.rejects(()=>assertOporaGuestFirstWeek(page,expect,locale),assert.AssertionError)
    })
  }
}
test('unsupported locale is rejected',async()=>{
  const {page,expect}=surface('en')
  await assert.rejects(()=>assertOporaGuestFirstWeek(page,expect,'fr'),/Unsupported/)
})
for(const overflow of [false,true]) test('actual App verifier block '+(overflow ? 'rejects mobile overflow' : 'runs both locales and retains mobile/evidence journey'),async()=>{
  const source=readFileSync('scripts/verify-app-r1.mjs','utf8')
  const end=source.indexOf("\n const response=await page.goto(origin+'/en/app');")
  const start=source.lastIndexOf('\n // ',end)
  assert.ok(start>=0 && end>start)
  const visits=[],widths=[],screenshots=[],passes=[]
  let active
  const page={
    async goto(url) {const locale=url.split('/')[3];assert.ok(fixtures[locale]);visits.push(url);active=surface(locale)},
    locator(...args) {return active.page.locator(...args)},
    async setViewportSize(size) {widths.push(size.width);assert.equal(size.height,844)},
    async evaluate(fn) {return runInNewContext('('+fn.toString()+')()', {document:{documentElement:{scrollWidth:overflow ? 322 : 320}},innerWidth:320})},
  }
  const execute=()=>runInNewContext('(async()=>{'+source.slice(start,end)+'})()',{ 
    page,expect:target=>active.expect(target),assert,assertOporaGuestFirstWeek,
    origin:'http://127.0.0.1:3100',output:'synthetic',
    screenshotEvidence:async(_page,options)=>screenshots.push(options.path),passed:message=>passes.push(message),
  })
  if(overflow) {await assert.rejects(execute,assert.AssertionError);return}
  await execute()
  assert.deepEqual(visits,['http://127.0.0.1:3100/en/app/course?program=stress','http://127.0.0.1:3100/ru/app/course?program=stress'])
  assert.deepEqual(widths,[320,390,320,390,390])
  assert.deepEqual(screenshots,['synthetic/course-public-en.png','synthetic/course-public-ru.png'])
  assert.equal(passes.length,1)
})

function actualInvite(locale, replacement) {
  let source=readFileSync('components/app/opora-first-week-invite.jsx','utf8')
  if(replacement) {assert.ok(source.includes(replacement[0]));source=source.replace(...replacement)}
  const fixture=sourceFixture()
  let accepted=0
  const component=fixture.load(source,'opora-first-week-invite.jsx',{
    'next/image':{default:'img'},'next/link':{default:'a'},
    'lucide-react':icons('ArrowRight LockKeyhole'),
    '@/lib/inner-growth/anti-stress-blueprint':{antiStressBlueprint:lang=>{
      assert.equal(lang,locale)
      return {days:Array.from({length:14},(_,i)=>({day:i+1,title:'Synthetic lesson '+(i+1)}))}
    }},
    './opora-first-week-invite.module.css':css,
  },{exports:['default']}).default
  const tree=component({locale,signedOut:true,onAccept:()=>accepted++})
  const children=node=>[node?.props?.children].flat(Infinity).filter(n=>n && typeof n==='object')
  const descendants=node=>children(node).flatMap(n=>[n,...descendants(n)])
  const root={type:'div',props:{'data-opora-guest-landing':true,children:tree}}
  function locate(items) {
    return {items,locator(selector) {
      const match=selector.match(/^\[([^=\]]+)(?:="([^"\]]*)")?\]$/);assert.ok(match,selector)
      return locate(items.flatMap(descendants).filter(n=>Object.hasOwn(n.props,match[1]) && n.props[match[1]]!==undefined && (match[2]===undefined || String(n.props[match[1]])===match[2])))
    },getByRole(role,options) {
      const tag={heading:'h'+options.level,button:'button',link:'a'}[role]
      return locate(items.flatMap(descendants).filter(n=>n.type===tag && textContent(n)===options.name))
    },getByText(text) {return locate(items.flatMap(descendants).filter(n=>n.type==='p' && textContent(n)===text))}}
  }
  const page=locate([{props:{children:root}}])
  const expect=target=>({
    async toHaveCount(n){assert.equal(target.items.length,n)},
    async toBeVisible(){assert.equal(target.items.length,1)},
    async toBeEnabled(){assert.equal(target.items.length,1);assert.ok(!target.items[0].props.disabled)},
    async toHaveAttribute(name,value){assert.equal(target.items.length,1);assert.equal(String(target.items[0].props[name]),value)},
  })
  return {page,expect,verifyNoAction(){assert.equal(accepted,0);fixture.assertNoExternalOperations()}}
}
for(const locale of ['en','ru']) {
  test(locale+' actual approved JSX satisfies guest verifier without auth/write',async()=>{
    const fixture=actualInvite(locale)
    await assertOporaGuestFirstWeek(fixture.page,fixture.expect,locale)
    fixture.verifyNoAction()
  })
  for(const [name,replacement] of [
    ['preview marker',['data-opora-first-week-intro','data-retired-preview']],
    ['eight days',['.slice(0, 7)','.slice(0, 8)']],
    ['guest marker',["signedOut ? '' : undefined","signedOut ? undefined : ''"]],
    ['signed-in consent',["signedOut ? undefined : ''","signedOut ? '' : undefined"]],
    ['programme link',['/${lang}/courses/antistress','/${lang}/app']],
  ]) test(locale+' rejects actual JSX mutation: '+name,async()=>{
    const fixture=actualInvite(locale,replacement)
    await assert.rejects(()=>assertOporaGuestFirstWeek(fixture.page,fixture.expect,locale),assert.AssertionError)
    fixture.verifyNoAction()
  })
}
test('actual App guest branch supplies compact signed-out invitation and explicit signin callback',()=>{
  const workspace=readFileSync('components/app/app-workspace.jsx','utf8')
  const guest=readFileSync('components/app/course-guest-landing.jsx','utf8')
  assert.match(workspace,/<CourseGuestLanding locale=\{locale\} onStart=\{signin\} busy=\{busy\} stressSignup=\{stressSignup\} compact/)
  assert.match(guest,/if \(compact && stressSignup\) return <div data-opora-guest-landing data-course-guest-invite>/)
  assert.match(guest,/<OporaFirstWeekInvite locale=\{locale\} signedOut onAccept=\{onStart\}/)
})
