import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sourceModule,jsx,nodes,text} from './current-source-render.mjs'
import * as videoModel from '../../lib/site-videos/model.js'
const read = path => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const css = {default:new Proxy({}, {get:(_,name)=>String(name)})}
const icons=Object.fromEntries('ArrowLeft ArrowRight CheckCircle2 ChevronDown ExternalLink ShieldCheck Sparkles'.split(' ').map(name=>[name,'icon-'+name]))
export const currentFreeEntrySource = read
export const diagnosisIds = ['situation-written-free','wu-xing-free','personal-session-30-eur50']
const safety = {
  en:'Wu Xing is a traditional symbolic Five Elements framework for reflection, not a medical diagnosis or treatment. A request is not a booking; the €50 personal session is arranged and paid for separately.',
  ru:'У-Син (Пять стихий) — традиционная символическая модель для самоисследования, а не медицинская диагностика или лечение. Запрос не подтверждает запись; консультация за €50 согласовывается и оплачивается отдельно.',
  es:'Wu Xing (Cinco Elementos) es un marco simbólico tradicional de reflexión, no un diagnóstico o tratamiento médico. La sesión de €50 requiere una confirmación y un pago por separado.',
}
const visible = tree => {
  if(Array.isArray(tree))return tree.flatMap(visible)
  if(!tree||typeof tree!=='object'||!('type' in tree))return []
  const p=tree.props
  if(p.hidden||p['aria-hidden']===true||p['aria-hidden']==='true'||p.style?.display==='none'||p.style?.visibility==='hidden')return []
  return [tree,...visible(p.children)]
}
const titles={
  en:['Free situation diagnosis','Free energy & wellbeing review — Wu Xing (Five Elements)','Personal consultation'],
  ru:['Бесплатная диагностика ситуации','Диагностика энергии и здоровья по У-Син (Пять стихий)','Личная консультация'],
  es:['Diagnóstico gratuito de tu situación','Revisión de energía y bienestar Wu Xing (Cinco Elementos)','Consulta personal'],
}
export function assertCurrentDiagnosisOffers({locale='en',source=read('components/free-diagnosis-offers.tsx')}={}) {
  let selected
  const Start=()=>{throw Error('Start boundary must be executed by diagnostic-flow test')}
  const Capture=()=>{throw Error('Capture boundary must be executed by enquiry runtime test')}
  const {FreeDiagnosisOffers}=sourceModule(source,'components/free-diagnosis-offers.tsx',{
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'next/link':{default:'a'},'lucide-react':icons,
    react:{useState:initial=>[selected??=initial,value=>{selected=value}]},
    '@/components/compact-lead-capture':{CompactLeadCapture:Capture},
    '@/components/free-diagnostic-start':{FreeDiagnosticStart:Start},'./free-diagnosis-offers.module.css':css,
  })
  const render=()=>FreeDiagnosisOffers({locale})
  const initial=render()
  assert.equal(selected,diagnosisIds[0],'Default is free written review, not paid session')
  const free=['FREE','БЕСПЛАТНО','GRATIS'][['en','ru','es'].indexOf(locale)]
  const paid=locale==='ru'?'30 МИН · €50':'30 MIN · €50'
  const labels={en:['Details','Request'],ru:['Детали','Заказать'],es:['Detalles','Solicitar']}[locale]
  for(const id of diagnosisIds){
    const tree=render(),shown=visible(tree),all=nodes(tree)
    assert.equal(tree.props.lang,locale,'Offers preserve selected locale')
    assert.equal(tree.props.id,'free-diagnosis-options','Hero resolves the actual selector')
    const cards=shown.filter(node=>Object.hasOwn(node.props,'data-diagnosis-offer'))
    assert.deepEqual(cards.map(node=>node.props['data-diagnosis-offer']),diagnosisIds,'Exactly three visible intended offers in order')
    const form=shown.filter(node=>Object.hasOwn(node.props,'data-diagnosis-order-form'))
    assert.equal(form.length,1,'One visible separate order form below cards')
    assert.equal(form[0].props.id,'request-free-review','Order anchors resolve a single form')
    assert.equal(all.filter(node=>node.props.id==='request-free-review').length,1,'No duplicate order anchor')
    assert.ok(shown.indexOf(form[0])>shown.indexOf(cards.at(-1)),'Order form follows all three cards')
    cards.forEach((card,index)=>{
      const content=visible(card),details=content.filter(node=>node.type==='details')
      assert.equal(details.length,1,'Each offer has one Details disclosure')
      assert.equal(details[0].props.open,undefined,'Offer details initially closed')
      assert.equal(text(nodes(details[0]).find(node=>node.type==='summary')),labels[0],'Details localized')
      assert.equal(text(content.find(node=>node.type==='h3')),titles[locale][index],'Distinct truthful localized offer title')
      assert.equal(text(content.find(node=>node.type==='strong')),index===2?paid:free,'Free versus exact 30-minute €50 price remains scoped')
      const money=text(card).match(/€\s*\d+|\d+\s*€/g)||[]
      assert.ok(money.every(value=>index===2&&value==='€50'),'No paid price leaks into free cards or extra paid prices')
      const orders=content.filter(node=>Object.hasOwn(node.props,'data-diagnosis-order'))
      assert.equal(orders.length,1,'Every offer has its own Order action')
      assert.equal(orders[0].props.href,'#request-free-review','Every Order reaches the separate form')
      assert.equal(text(orders[0]),labels[1],'Order localized')
      assert.equal(orders[0].props['data-diagnosis-order'],diagnosisIds[index])
      const more=nodes(details[0]).filter(node=>node.type==='a')
      const routes=['/coaching/intake?topic=personal','/services/dao-health-profile',null]
      assert.deepEqual(more.map(node=>node.props.href),routes[index]?['/'+locale+routes[index]]:[],'Details preserves actual localized route')
      assert.equal(content.filter(node=>node.type===Start||node.type===Capture).length,0,'No duplicate form inside offer card')
    })
    assert.equal(text(shown.find(node=>node.props.className==='safety')),safety[locale],'Visible symbolic/non-medical and separate payment limitations')
    assert.doesNotMatch(text(tree),/€100|guaranteed cure|medical diagnosis provided/i)
    const action=shown.find(node=>node.props['data-diagnosis-order']===id)
    action.props.onClick()
    const next=render(),nextNodes=visible(next)
    assert.equal(nextNodes.filter(node=>node.props['data-diagnosis-selected']==='true').length,1,'One actual selection')
    assert.equal(nextNodes.find(node=>node.props['data-diagnosis-selected']==='true').props['data-diagnosis-offer'],id,'Order selects matching offer')
    const start=nextNodes.filter(node=>node.type===Start),capture=nextNodes.filter(node=>node.type===Capture)
    assert.equal(start.length,id===diagnosisIds[0]?1:0,'Written review uses real pre-intake, not direct CRM capture')
    assert.equal(capture.length,id===diagnosisIds[0]?0:1,'Wu Xing and paid session use actual CompactLeadCapture')
    const child=start[0]||capture[0]
    assert.equal(child.props.locale,locale,'Downstream enquiry receives selected locale')
    if(capture.length){
      const p=child.props
      assert.equal(p.serviceTitle,titles[locale][diagnosisIds.indexOf(id)],'Downstream enquiry keeps selected service')
      assert.equal(p.selectedFormatValue,id,'Controlled capture selection matches clicked card')
      assert.deepEqual(Array.from(p.formatOptions,option=>[option.value,option.label]),diagnosisIds.slice(1).map((value,index)=>[value,titles[locale][index+1]+' · '+(index?paid:free)]),'Only actual Wu Xing/free and 30min/€50 formats')
      assert.equal(p.disclaimer,safety[locale],'Capture receives complete actual limitations')
      assert.ok(p.title&&p.lead&&p.formatLabel,'Downstream form explanation and label remain present')
      p.onFormatChange(diagnosisIds[1]);assert.equal(selected,diagnosisIds[1],'Controlled format change stays wired')
    }
  }
  return initial
}
export function assertCurrentFreeEntry({locale='en',source=read('components/free-entry-landing.tsx'),offersSource=read('components/free-diagnosis-offers.tsx')}={}) {
  const videos=sourceModule(read('data/service-video-library.ts'),'data/service-video-library.ts',{'@/lib/site-videos/model':videoModel})
  const Offers=()=>{throw Error('Offers must be explicitly evaluated, not silently stubbed')}
  const imported={
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'next/link':{default:'a'},'lucide-react':icons,
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'compact-capture'},
    '@/components/free-diagnosis-offers':{FreeDiagnosisOffers:Offers},
    '@/components/free-situation-review-form':{FreeSituationReviewForm:'optional-review'},
    '@/components/site-video-player':{SiteVideoPlayer:'video'},
    '@/data/service-video-library':videos,'@/lib/site-videos/model':videoModel,
    '@/components/personal-testimonials':{PersonalTestimonials:'testimonials'},'./free-entry-landing.module.css':css,
  }
  const {FreeEntryLanding}=sourceModule(source,'components/free-entry-landing.tsx',imported)
  for(const kind of ['dao','situation']){
    const tree=FreeEntryLanding({locale,kind}),rendered=visible(tree)
    assert.equal(tree.type,'main');assert.equal(tree.props.lang,locale)
    assert.equal(tree.props['data-free-entry-landing'],kind)
    const capture=rendered.filter(node=>node.type==='compact-capture'),offers=rendered.filter(node=>node.type===Offers)
    assert.equal(capture.length,kind==='dao'?1:0,'Only DAO owns the independent compact capture')
    assert.equal(offers.length,kind==='situation'?1:0,'Only situation mounts one visible three-offer selector')
    if(kind==='dao'){
      assert.equal(capture[0].props.locale,locale,'Capture keeps selected locale')
      assert.equal(capture[0].props.id,'request-free-wu-xing','Capture keeps service-specific target')
      assert.equal(capture[0].props.serviceTitle,'Free symbolic Wu Xing Resource Profile','Capture keeps distinct truthful service identity')
      assert.ok(capture[0].props.title&&capture[0].props.lead,'Localized explanation remains present')
      assert.equal(typeof capture[0].props.disclaimer,'string','Capture must receive the actual limitations')
      const limitation = {
        en:'These self-reflection approaches are educational and symbolic. They do not diagnose or treat health conditions and do not replace qualified medical or mental-health care.',
        ru:'Эти методики предназначены для самоисследования и символической рефлексии. Они не диагностируют и не лечат заболевания и не заменяют медицинскую или психиатрическую помощь.',
        es:'Estas prácticas simbólicas y de autoobservación son educativas. No diagnostican ni tratan enfermedades y no sustituyen la atención médica o psicológica profesional.',
      }
      assert.equal(capture[0].props.disclaimer,limitation[locale],'Preserve the full non-diagnosis/non-treatment/non-replacement limitation')
      assert.doesNotMatch(text(tree)+' '+capture[0].props.disclaimer,/€50|€100|guaranteed cure|medical diagnosis provided/i)
    }else{
      assert.equal(offers[0].props.locale,locale,'Offers keep selected locale')
      assertCurrentDiagnosisOffers({locale,source:offersSource})
      assert.ok(rendered.some(node=>node.type==='a'&&node.props.href==='#free-diagnosis-options'),'Situation hero reaches actual selector')
    }
    const review=rendered.filter(node=>node.type==='optional-review')
    assert.equal(review.length,kind==='situation'?1:0,'DAO never inherits the optional drawing questionnaire')
    if(kind==='situation'){
      const disclosure=rendered.filter(node=>node.type==='details'&&Object.hasOwn(node.props,'data-optional-written-review'))
      assert.equal(disclosure.length,1,'Written review remains a separate optional disclosure')
      assert.equal(disclosure[0].props.open,undefined,'Long questionnaire is initially closed')
      assert.ok(nodes(disclosure[0]).includes(review[0]));assert.equal(review[0].props.locale,locale)
    }
  }
}
