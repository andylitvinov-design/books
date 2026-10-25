import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sourceModule,jsx,nodes,text} from './current-source-render.mjs'
import * as videoModel from '../../lib/site-videos/model.js'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'
import {expressFixture} from './personal-express-parent-fixture.mjs'
const read = path => readFileSync(new URL('../../'+path, import.meta.url), 'utf8')
const css = {default:new Proxy({}, {get:(_,name)=>String(name)})}
const icons=Object.fromEntries('ArrowLeft ArrowRight CheckCircle2 ChevronDown ExternalLink ShieldCheck Sparkles MessageCircle X'.split(' ').map(name=>[name,'icon-'+name]))
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
  if((Object.hasOwn(p,'data-diagnosis-order-form')&&p['data-open']==='false')||p.hidden||p['aria-hidden']===true||p['aria-hidden']==='true'||p.style?.display==='none'||p.style?.visibility==='hidden')return []
  return [tree,...visible(p.children)]
}
const titles={
  en:['Free situation diagnosis','Free energy & wellbeing review — Wu Xing (Five Elements)','Personal consultation'],
  ru:['Бесплатная диагностика ситуации','Диагностика энергии и здоровья по У-Син (Пять стихий)','Личная консультация'],
  es:['Diagnóstico gratuito de tu situación','Revisión de energía y bienestar Wu Xing (Cinco Elementos)','Consulta personal'],
}
// Execute the actual parent hooks and effects, including cleanup, against a local
// document boundary. This is not DOM/focus/layout verification or a transport stub.
export function assertCurrentDiagnosisOffers({locale='en',source=read('components/free-diagnosis-offers.tsx'),children,intro,compact=false}={}) {
  let slots=[],index=0,pending=[],tree
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]))
  const listeners=new Set(),body={style:{overflow:'auto'}}
  const Chooser=()=>{throw Error('Actual chooser executes in diagnosis-parent-lifecycle, not this composition contract')}
  const hooks={
    useState(initial){const i=index++;slots[i]??={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value}]},
    useRef(initial){return slots[index++]??={current:initial}},
    useCallback(value,deps){const i=index++;if(!same(slots[i]?.deps,deps))slots[i]={value,deps};return slots[i].value},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  class Element {focus(){}}
  const document={body,activeElement:new Element(),addEventListener(name,fn){assert.equal(name,'keydown');listeners.add(fn)},removeEventListener(name,fn){assert.equal(name,'keydown');assert.ok(listeners.delete(fn),'Actual effect cleans up its own handler')}}
  const {FreeDiagnosisOffers}=sourceModule(source,'components/free-diagnosis-offers.tsx',{
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'lucide-react':icons,react:hooks,
    'next/navigation':{usePathname:()=>'/'+locale+'/services/free-situation-review'},
    '@/components/contact-channel-chooser':{ContactChannelChooser:Chooser},
    '@/lib/whatsapp-enquiry':whatsapp,'./free-diagnosis-offers.module.css':css,
  },{document,HTMLElement:Element})
  const render=()=>{index=0;pending=[];tree=FreeDiagnosisOffers({locale,children,intro,compact});pending.forEach(fn=>fn());return tree}
  const initial=render(),free={en:'FREE',ru:'БЕСПЛАТНО',es:'GRATIS'}[locale]
  const paid=locale==='ru'?'30 МИН · €50':'30 MIN · €50'
  const labels={en:['How it works','Request','Close form'],ru:['Как проходит','Заказать','Закрыть форму'],es:['Cómo funciona','Solicitar','Cerrar formulario']}[locale]
  const forms=()=>nodes(tree).filter(node=>Object.hasOwn(node.props,'data-diagnosis-order-form'))
  const sheetChild=()=>nodes(forms()[0]).filter(node=>node.type===Chooser)
  const inline=()=>visible(tree).filter(node=>Object.hasOwn(node.props,'data-diagnosis-placement'))
  assert.match(read('components/free-diagnosis-offers.module.css'),/\.formWrap\[data-open="false"\]\s*\{\s*display\s*:\s*none\s*\}/,'Closed-sheet visibility reflects actual CSS')
  assert.equal(tree.props.lang,locale,'Offers preserve selected locale')
  assert.equal(nodes(tree).filter(n=>n.props.id==='free-diagnosis-options').length,1,'Hub selector has one real heading anchor')
  assert.equal(tree.props['data-free-diagnosis-layout'],compact?'compact':'full','Explicit canonical compact layout prop')
  assert.equal(forms().length,1,'Exactly one selected-offer request sheet')
  assert.equal(forms()[0].props.id,'free-diagnosis-request-dialog','Request sheet keeps its real unique anchor')
  assert.equal(nodes(tree).filter(node=>node.props.id==='request-free-review').length,1,'No duplicate request anchor')
  assert.equal(forms()[0].props['data-open'],'false','Request sheet is initially closed')
  assert.equal(visible(tree).includes(forms()[0]),false,'Closed sheet is not a third visible inline form')
  assert.equal(text(nodes(forms()[0]).find(node=>node.type==='h3')),titles[locale][0],'Default is free written review, not paid session')
  const checkInline=()=>{
    assert.deepEqual(inline().map(node=>node.props['data-diagnosis-placement']),['top','bottom'],'Exactly two visible inline request placements')
    inline().forEach((node,i)=>{
      const actions=visible(node).filter(child=>child.type==='button')
      assert.equal(actions.length,1,'Each inline placement has one actual request action')
      assert.equal(actions[0].props.id,'free-diagnosis-'+(i?'bottom':'top'),'Inline request actions have distinct stable targets')
      assert.equal(actions[0].props.type,'button','Inline request is not a retired staging submit')
      assert.equal(actions[0].props['aria-haspopup'],'dialog','Inline request declares the actual dialog')
      assert.equal(visible(node).filter(child=>child.type===Chooser||child.type==='input').length,0,'Inline placement does not silently restore retired phone forms')
    })
  };checkInline()
  for(const [offerIndex,id] of diagnosisIds.entries()){
    const shown=visible(tree),cards=shown.filter(node=>Object.hasOwn(node.props,'data-diagnosis-offer'))
    assert.deepEqual(cards.map(node=>node.props['data-diagnosis-offer']),diagnosisIds,'Exactly three visible intended offers in order')
    assert.ok(shown.indexOf(inline()[0])<shown.indexOf(cards[0])&&shown.indexOf(inline()[1])>shown.indexOf(cards.at(-1)),'Inline requests surround the actual three offers')
    cards.forEach((card,i)=>{
      const content=visible(card)
      assert.equal(text(content.find(node=>node.type==='h3')),titles[locale][i],'Distinct truthful localized offer title')
      assert.equal(text(content.find(node=>node.type==='strong')),i===2?paid:free,'Free versus exact 30-minute €50 price remains scoped')
      const money=text(card).match(/€\s*\d+|\d+\s*€/g)||[]
      assert.ok(money.every(value=>i===2&&value==='€50'),'No paid price leaks into free cards or extra paid prices')
      assert.equal(content.filter(node=>node.type==='details').length,compact?1:0,'Compact layout keeps optional detailed explanation')
      if(compact)assert.equal(content.find(node=>node.type==='details').props.open,undefined,'Compact explanation starts folded')
      assert.ok(text(content.find(node=>node.props.className==='detail')).length>50,'Each offer retains its visible explanation')
      assert.equal(text(content.find(node=>node.type===(compact?'summary':'h4'))),labels[0],'Process label is localized')
      assert.equal(content.filter(node=>node.type==='li').length,3,'Each offer exposes its actual three process steps')
      const orders=content.filter(node=>Object.hasOwn(node.props,'data-diagnosis-order'))
      assert.equal(orders.length,1,'Every offer has one visible Request action')
      assert.equal(orders[0].type,'button');assert.equal(orders[0].props.type,'button');assert.equal(orders[0].props.href,undefined)
      assert.equal(text(orders[0]),labels[1],'Request localized')
      assert.equal(orders[0].props['data-diagnosis-order'],diagnosisIds[i])
      assert.equal(content.filter(node=>node.type===Chooser).length,0,'No duplicate form inside offer card')
    })
    assert.equal(text(shown.find(node=>node.props.className==='safety')),safety[locale],'Visible symbolic/non-medical and separate payment limitations')
    assert.doesNotMatch(text(tree),/€100|guaranteed cure|medical diagnosis provided/i)
    shown.find(node=>node.props['data-diagnosis-order']===id).props.onClick();render()
    const sheet=forms()[0],child=sheetChild()
    assert.equal(sheet.props['data-open'],'true','Request opens its actual selected-offer sheet')
    assert.ok(visible(tree).includes(sheet),'Selected request sheet is visible')
    assert.equal(sheet.props.role,'dialog');assert.equal(sheet.props['aria-modal'],true)
    assert.equal(text(visible(sheet).find(node=>node.type==='h3')),titles[locale][offerIndex],'Request selects matching offer')
    assert.equal(child.length,1,'One actual chooser in selected sheet')
    assert.ok(visible(sheet).includes(child[0]),'Actual selected chooser is visible')
    const p=child[0].props
    assert.equal(p.locale,locale,'Downstream enquiry receives selected locale')
    assert.equal(p.compactPhone,true,'Selected chooser keeps current phone-only mode')
    assert.equal(p.stayAfterSave,true,'Selected chooser keeps an in-place verified receipt')
    assert.equal(p.resetKey,id,'Chooser reset key follows the selected offer')
    const draft=new URL(p.whatsappUrl).searchParams.get('text')
    assert.ok(draft.includes(titles[locale][offerIndex]),'Downstream enquiry keeps selected service')
    assert.ok(draft.includes('https://holistichouse.vercel.app/'+locale+'/services/free-situation-review'),'Draft keeps current localized source')
    assert.ok(draft.includes(offerIndex===2?paid:free),'Draft keeps selected option price')
    assert.ok(p.publicTopic.endsWith(' · '+(offerIndex===2?paid:free)),'CRM public topic retains selected price')
    assert.equal(text(visible(sheet).find(node=>node.props.className==='modalSafety')),safety[locale],'Sheet shows complete actual limitations')
    assert.equal(body.style.overflow,'hidden');assert.equal(listeners.size,1,'Open effect registers exactly one handler')
    const close=visible(sheet).find(node=>node.type==='button'&&node.props['aria-label']===labels[2])
    assert.ok(close,'Actual localized close control exists');close.props.onClick();render()
    assert.equal(forms()[0].props['data-open'],'false','Close hides actual request sheet')
    assert.equal(visible(forms()[0]).length,0,'Closed sheet exposes no active form')
    assert.equal(body.style.overflow,'auto');assert.equal(listeners.size,0,'Close executes effect cleanup')
    visible(tree).find(node=>node.props['data-diagnosis-order']===id).props.onClick();render()
    for(const listener of listeners)listener({key:'Escape'});render()
    assert.equal(forms()[0].props['data-open'],'false','Escape closes the actual request sheet')
    assert.equal(body.style.overflow,'auto');assert.equal(listeners.size,0);checkInline()
  }
  for(const placement of inline()){
    visible(placement).find(node=>node.type==='button').props.onClick();render()
    assert.equal(text(nodes(forms()[0]).find(node=>node.type==='h3')),titles[locale][0],'Inline request selects the free situation offer')
    for(const listener of listeners)listener({key:'Escape'});render()
  }
  if(intro)for(const child of nodes(intro))assert.ok(nodes(initial).includes(child),'Offers preserve supplied intro')
  if(children)for(const child of nodes(children))assert.ok(nodes(initial).includes(child),'Offers preserve actual landing children between entries')
  return initial
}
export function assertCurrentFreeEntry({locale='en',source=read('components/free-entry-landing.tsx'),expressSource=read('components/personal-express-enquiry.tsx')}={}) {
  const videos=sourceModule(read('data/service-video-library.ts'),'data/service-video-library.ts',{'@/lib/site-videos/model':videoModel})
  const Express=()=>{throw Error('Actual PersonalExpressEnquiry must execute in the nested page fixture below')}
  const imported={
    'react/jsx-runtime':jsx,'next/image':{default:'img'},'next/link':{default:'a'},'lucide-react':icons,
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'compact-capture'},
    '@/components/personal-express-enquiry':{PersonalExpressEnquiry:Express},
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
    const capture=rendered.filter(node=>node.type==='compact-capture'),express=rendered.filter(node=>node.type===Express)
    assert.equal(capture.length,kind==='dao'?1:0,'Only DAO owns the independent compact capture')
    assert.equal(express.length,kind==='situation'?1:0,'Only situation mounts one visible personal express parent')
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
      assert.equal(express[0].props.locale,locale,'Express parent keeps selected locale')
      const f=expressFixture({locale,pageSource:source,parentSource:expressSource})
      const video=f.find('video-leaf');assert.equal(video.props.locale,locale);assert.equal(video.props.compact,true,'Current video compact prop retained');assert.equal(video.props.minimal,true,'Current video minimal prop retained');assert.equal(video.props.internalOnly,true,'Current video internal-only intent retained')
      const visibleNodes=f.nodes().filter(n=>!n.hidden),direct=visibleNodes.filter(n=>n.type==='a'&&n.props['data-source']==='coaching-questionnaire')
      assert.equal(direct.length,1,'Actual private questionnaire route remains visible')
      assert.equal(direct[0].props.href,'/'+locale+'/coaching/intake','Actual private questionnaire keeps localized route')
      assert.equal(f.find('section',p=>Object.hasOwn(p,'data-personal-express-enquiry')).props.lang,locale)
      assert.ok(visibleNodes.some(n=>n.type==='a'&&n.props.href==='#request-free-review'),'Situation hero reaches actual inline request')
      assert.deepEqual(visibleNodes.filter(n=>n.type==='section'&&['what-you-get','how-i-review','how-it-works','request-free-review'].includes(n.props.id)).map(n=>n.props.id),['what-you-get','how-i-review','how-it-works','request-free-review'],'Actual parent preserves intro before inline capture')
      assert.equal(f.find('private-intake-leaf').props.locale,locale,'Actual parent preserves optional private children')
      f.reveal();f.select('energy');assert.equal(f.nodes().filter(n=>n.type==='private-intake-leaf').length,0,'Energy focus omits situation-only private children');f.select('situation');assert.equal(f.find('private-intake-leaf').props.locale,locale);f.unmount()
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
