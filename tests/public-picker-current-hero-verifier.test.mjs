import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const picker=read('components/app/simple-test-picker.jsx')
for(const file of ['scripts/verify-app-r1.mjs','scripts/verify-es-public-site.mjs']){
 test(file+' verifies the current localized hero and real topic navigation without obsolete promo selectors',async()=>{
  const source=read(file)
  const start=source.indexOf('async function assertPublicPickerEntrance(')
  assert.ok(start>=0)
  const fragment=source.slice(start,source.indexOf('\n}',start)+2)
  assert.doesNotMatch(fragment,/data-client-tests-promo|Understand yourself and your life better|Лучше понять себя и свою жизнь/)
  for(const [locale,region,headline,topics,first] of [
   ['en','Choose your tests','Understand yourself. Find your next step.','Topics','What would you like to explore?'],
   ['ru','Подберите свои тесты','Лучше поймите себя. Найдите следующий шаг.','Темы','Что вы хотите исследовать?'],
  ]){
   assert.ok(picker.includes("heroHeadline:'"+headline+"'"))
   assert.ok(picker.includes("heroTabTopics:'"+topics+"'"))
   assert.match(picker,/<a href="#hh-simple-topic-title" aria-current="page">\{c\.heroTabTopics\}<\/a>/)
   const seen=[]
   const locator=path=>({path,locator:selector=>locator([...path,['selector',selector]]),getByRole:(role,options)=>locator([...path,['role',role,options]])})
   const expect=target=>({toBeVisible:async()=>seen.push(['visible',target.path]),toHaveAttribute:async(name,value)=>seen.push(['attribute',target.path,name,value])})
   const verify=new Function('expect',fragment+';return assertPublicPickerEntrance')(expect)
   await verify(locator([]),locale)
   const root=[['selector','[data-prelogin-test-picker]']]
   const hero=[...root,['selector','[data-client-tests-hero]']]
   const link=[...hero,['role','navigation',undefined],['role','link',{name:topics,exact:true}]]
   assert.deepEqual(seen,[
    ['attribute',root,'aria-label',region],
    ['visible',[...hero,['role','heading',{name:headline,level:1,exact:true}]]],
    ['visible',link],
    ['attribute',link,'href','#hh-simple-topic-title'],
    ['attribute',link,'aria-current','page'],
    ['attribute',[...root,['role','heading',{name:first,level:2,exact:true}]],'id','hh-simple-topic-title'],
   ])
  }
 })
}
