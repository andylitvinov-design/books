// Offline synthetic render of the actual public entrypoints and their mounted
// discovery components. Unrelated widgets are inert markers; no browser, account,
// transport or real repository is used. Visibility is bounded to rendered
// hidden/inert/aria-hidden and inline display/visibility, including ancestors.
// Stylesheet cascade, pixels, hit targets and browser discoverability are not QAed.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sourceModule,jsx,denied} from './current-source-render.mjs'
import {LOCAL_ACQUISITION} from '../../data/local-acquisition.js'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
export const currentHomeSource=read
const css={default:new Proxy({}, {get:(_,name)=>String(name)})}
const icons=Object.fromEntries('ArrowRight ChevronDown ShieldCheck Target ChevronLeft ChevronRight ClipboardCheck'.split(' ').map(name=>[name,'icon-'+name]))
const basic={'react/jsx-runtime':jsx,'next/link':{default:'a'},'next/image':{default:'img'},'lucide-react':icons,
  '@/components/static-portrait':{StaticPortrait:'portrait'}}
function hooks(){
  const state=[];let cursor=0
  return {reset:()=>{cursor=0},react:{
    useState:initial=>{const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial
      return [state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value}]},
    useRef:value=>({current:value}),useEffect:()=>{},
  }}
}
function render(tree){
  if(Array.isArray(tree))return tree.map(render)
  if(!tree||typeof tree!=='object'||!('type' in tree))return tree
  if(typeof tree.type==='function')return render(tree.type(tree.props))
  return {...tree,props:{...tree.props,children:render(tree.props.children)}}
}
function concealed(tree,decorative=false){return Boolean(tree.props.hidden||tree.props.inert||(!decorative&&(tree.props['aria-hidden']===true||tree.props['aria-hidden']==='true'))
  ||tree.props.style?.display==='none'||['hidden','collapse'].includes(tree.props.style?.visibility))}
function exposedChildren(tree){return tree.type==='details'&&!tree.props.open
  ? [tree.props.children].flat(Infinity).filter(child=>child?.type==='summary') : tree.props.children}
function exposedText(tree){
  if(Array.isArray(tree))return tree.map(exposedText).join('')
  if(tree==null||typeof tree==='boolean')return ''
  if(typeof tree!=='object')return String(tree)
  return concealed(tree)?'':exposedText(exposedChildren(tree))
}
function renderedNodes(tree,decorative=false){
  if(Array.isArray(tree))return tree.flatMap(child=>renderedNodes(child,decorative))
  if(!tree||typeof tree!=='object'||!('type' in tree))return []
  if(concealed(tree,decorative))return []
  return [tree,...renderedNodes(exposedChildren(tree),decorative)]
}
const visibleNodes=tree=>renderedNodes(tree)
// Card photographs are intentionally aria-hidden decorative images. That is not
// visual concealment; hidden/inert, inline display/visibility and closed-details
// ancestors still disqualify their actual rendered path. No pixels/CSS are tested.
const photoNodes=tree=>renderedNodes(tree,true)
const one=(items,message)=>{assert.equal(items.length,1,message);return items[0]}
const find=(tree,key,value)=>visibleNodes(tree).filter(node=>Object.hasOwn(node.props,key)&&(value===undefined||node.props[key]===value))
const routes={energy:'/explore/energy',love:'/explore/love',business:'/explore/business',temple:'/temple-support',services:'/services',courses:'/academy'}
const topicLabels={
  en:{energy:'Energy',love:'Love & relationships',business:'Business & career',temple:'Temple Support',services:'All services',courses:'All courses'},
  ru:{energy:'Энергия',love:'Любовь и отношения',business:'Бизнес и карьера',temple:'Temple Support',services:'Все услуги',courses:'Все курсы'},
  es:{energy:'Energía',love:'Amor y relaciones',business:'Negocios y carrera',temple:'Temple Support',services:'Todos los servicios',courses:'Todos los cursos'},
}
const carouselLabels={
  en:{services:'Energy',academy:'Love',business:'Business',tests:'Tests',ideas:'Ideas',cabinet:'Cabinet'},
  ru:{services:'Энергия',academy:'Любовь',business:'Бизнес',tests:'Тесты',ideas:'Идеи',cabinet:'Кабинет'},
  es:{services:'Energía',academy:'Amor',business:'Negocios',tests:'Pruebas',ideas:'Ideas',cabinet:'Mi espacio'},
}
const originalTitles={
  en:{situation:'Free Situation Review',dao:'Free Wu Xing Resource Profile',alchemy:'Alchemy of the Soul · Psycho-homeopathy',hypnotherapy:'Guided Imagery Hypnotherapy'},
  ru:{situation:'Диагностика ситуации',dao:'Бесплатный профиль ресурсов У-Син',alchemy:'Алхимия души · Психогомеопатия',hypnotherapy:'Курс гипнотерапии'},
  es:{situation:'Revisión gratuita de tu situación',dao:'Perfil gratuito de recursos Wu Xing',alchemy:'Alquimia del Alma · Psicohomeopatía',hypnotherapy:'Hipnoterapia con imágenes guiadas'},
}
const offers={reiki:'/academy/principles-of-energywork/learn',opora:'/courses/antistress',academy:'/academy',profile:'/personality-profiles',review:'/services/free-situation-review',businessConstellations:'/services/business-consulting',constellations:'/services/systemic-constellations',aiCoaching:'/coaching',therapist:'/services#consultation',alchemy:'/services/alchemy-of-soul',energy:'/services/remote-energy-support',pro:'/pro',service:'/practice?panel=services',course:'/practice?panel=materials&materialTab=courses'}
const modules=['courses','personality','situation','coaching','alchemy','energy','master']
const freeIds=['reiki','opora','profile','review','aiCoaching']
const notes={
  en:['The free express option is a written review, not a live appointment. A request does not confirm booking.','Self-tests support reflection; they are not medical diagnoses. Private results require sign-in.'],
  ru:['Экспресс-диагностика — письменный разбор, а не звонок. Заявка не является подтверждённой записью.','Тесты предназначены для самопознания, а не медицинской диагностики. Личные данные доступны после входа.'],
  es:['La opción exprés es una respuesta escrita, no una llamada. La solicitud no confirma una reserva.','Las pruebas son de autorreflexión, no diagnósticos médicos. Los datos privados requieren iniciar sesión.'],
}
export async function assertCurrentHomeDiscovery({locale='en',overrides={}}={}){
  const load=(path,imports={})=>sourceModule(overrides[path]??read(path),path,{...basic,...imports})
  const component=(path,name,imports={})=>{
    const runtime=hooks(),loaded=load(path,{react:runtime.react,...imports})
    return props=>{runtime.reset();return loaded[name](props)}
  }
  const carousel=component('components/home-section-carousel.tsx','HomeSectionCarousel',{'./services-conversion-hero.module.css':css})
  const topics=component('components/home-more-disclosure.tsx','HomeMoreDisclosure',{
    'next/dynamic':{default:()=> 'deferred-guide'},'./home-more-disclosure.module.css':css,
  })
  const featured=component('components/home-featured-workspace.tsx','HomeFeaturedWorkspace',{
    '@/components/home-personal-space':{useHomePersonalSpace:()=>({status:'guest',summary:null})},'./home-featured-workspace.module.css':css,
  })
  const composition={
    '@/components/home-section-carousel':{HomeSectionCarousel:carousel},
    '@/components/home-more-disclosure':{HomeMoreDisclosure:topics},
    '@/components/home-featured-workspace':{HomeFeaturedWorkspace:featured},
    '@/components/personal-testimonials':{PersonalTestimonials:'testimonials'},
    '@/components/public-site-header':{PublicSiteHeader:'public-header'},
    '@/components/public-consultation-cta':{PublicConsultationCta:'consultation'},
    '@/lib/spanish-metadata':{spanishMetadata:()=>({})},
  }
  const home=load('components/holistic-house-home.tsx',{...composition,
    '@/components/acquisition-event-link':{AcquisitionEventLink:'a'},
    '@/components/homepage-contact-cta':{HomepageContactCta:'home-contact'},
    '@/components/site-navigation':{SiteNavigation:'site-navigation'},'@/data/local-acquisition':{LOCAL_ACQUISITION},
  })
  const pageImports={...composition,'next/navigation':{redirect:denied,notFound:denied},react:{Suspense:'suspense'},
    '@/components/home-intro-video-section':{HomeIntroVideoSection:'intro-video'},
    '@/components/holistic-house-home':home,'@/lib/home-seo':{homeMetadataFor:denied}}
  const page=load(locale==='es'?'app/es/page.tsx':locale==='ru'?'app/[locale]/page.tsx':'app/page.tsx',pageImports)
  const getHome=async()=>render(await page.default({params:Promise.resolve({locale}),searchParams:Promise.resolve({})}))
  let tree=await getHome()
  assert.equal(tree.type,'main');assert.equal(tree.props.lang,locale)
  const all=visibleNodes(tree)
  assert.equal(find(tree,'data-core-service-id').length,0,'Home does not reintroduce the retired duplicate service-card grid')
  const hero=one(find(tree,'data-home-section-carousel'),'Actual home mounts one visible carousel')
  const topic=one(find(tree,'data-home-topic-filters'),'Actual home mounts one visible topic navigation')
  const workspace=one(find(tree,'data-home-featured-workspace'),'Actual home mounts one visible featured workspace')
  assert.ok(all.indexOf(hero)<all.indexOf(topic)&&all.indexOf(topic)<all.indexOf(workspace),'Topic navigation follows carousel and precedes featured workspace')
  for(const [key,suffix] of Object.entries(routes)){
    const link=one(find(topic,'data-home-topic-filter',key),'One visible '+key+' topic/catalogue link')
    assert.equal(link.type,'a');assert.equal(link.props.href,'/'+locale+suffix,'Exact localized '+key+' destination')
    assert.equal(link.props['aria-label']??exposedText(link).trim(),topicLabels[locale][key],'Topic/catalogue label identifies '+key+' in '+locale)
  }
  const navRoutes={services:'/explore/energy',academy:'/explore/love',business:'/explore/business',tests:'/client/tests',ideas:'/books',cabinet:locale==='es'?'/en/app':'/'+locale+'/app'}
  for(const [key,suffix] of Object.entries(navRoutes)){
    const link=one(find(hero,'data-home-nav-section',key),'Carousel keeps '+key+' discoverable')
    assert.equal(link.type,'a');assert.equal(link.props.href,key==='cabinet'?suffix:'/'+locale+suffix,'Carousel keeps exact '+key+' destination')
    assert.equal(exposedText(link).trim(),carouselLabels[locale][key],'Carousel displays the exact localized '+key+' navigation label')
  }
  const paid=one(find(hero,'data-home-first-screen-cta','paid'),'Visible paid consultation CTA')
  assert.equal(paid.props.href,'/'+locale+'/services#consultation');assert.ok(exposedText(paid).includes('€50'),'Paid consultation discloses the starting price')
  const testsDot=one(find(hero,'data-home-slide-dot','tests'),'Free-test slide remains selectable')
  assert.equal(testsDot.type,'button');assert.notEqual(testsDot.props.disabled,true);testsDot.props.onClick()
  tree=await getHome()
  const testsCta=one(find(tree,'data-home-slide-action','tests'),'Selecting the real tests dot shows its CTA')
  assert.equal(testsCta.props.href,'/'+locale+'/client/tests','Selectable free-test slide reaches tests')
  assert.ok(exposedText(testsCta).trim(),'Selectable tests CTA has an accessible label')
  const testsSlide=one(find(tree,'data-home-slide','tests'),'Actual free-test slide is visible')
  assert.ok(exposedText(testsSlide).includes({en:'FREE SELF-CHECKS',ru:'БЕСПЛАТНО',es:'GRATIS'}[locale]),'Free-test slide keeps its explicit localized free claim')
  assert.deepEqual(find(workspace,'data-home-module').map(node=>node.props['data-home-module']),modules,'All seven actual journey sections remain reachable')
  for(const id of modules){
    const section=one(find(workspace,'data-home-module',id),'Unique '+id+' journey section')
    assert.equal(section.props.id,'home-immersion-'+id)
    assert.equal(visibleNodes(workspace).filter(node=>node.type==='a'&&node.props.href==='#'+section.props.id).length,1,'Journey jump reaches '+id)
  }
  const cards=find(workspace,'data-home-offer-card')
  assert.deepEqual(cards.map(node=>node.props['data-home-offer-card']),Object.keys(offers),'Keep current offers, not retired duplicate homepage grids')
  assert.deepEqual(cards.filter(node=>node.props['data-home-offer-free']==='true').map(node=>node.props['data-home-offer-card']),freeIds,'Only the explicitly no-cost offers are marked free')
  for(const card of cards){
    const id=card.props['data-home-offer-card'],account=locale==='es'?'en':locale
    const badges=visibleNodes(card).filter(node=>node.props.className==='offerFreeBadge')
    assert.equal(badges.length,freeIds.includes(id)?1:0,'Featured free badge is visibly present only on no-cost offers')
    if(freeIds.includes(id))assert.equal(exposedText(badges[0]),{en:'FREE',ru:'БЕСПЛАТНО',es:'GRATIS'}[locale],'Featured no-cost badge keeps exact localized label')
    const action=one(find(card,'data-home-offer-primary',id),'Visible primary action for '+id)
    assert.equal(action.type,'a');assert.equal(action.props.href,(id==='service'||id==='course'?'/'+account+'/app':'/'+locale)+offers[id],'Featured offer preserves exact '+id+' destination')
    assert.ok(action.props['aria-label']?.trim(),'Featured action remains accessibly named')
    const photo=one(photoNodes(card).filter(node=>node.type==='img'),'Actual offer retains a render-exposed decorative photograph')
    assert.ok(photo.props.src.startsWith('/'),'Card uses a public image path')
  }
  assert.ok(exposedText(one(find(workspace,'data-home-offer-card','therapist'),'Paid therapist card')).includes(locale==='es'?'50 €':'€50'),'Paid featured session retains price disclosure')
  for(const note of notes[locale])assert.ok(exposedText(workspace).includes(note),'Actual home preserves written-review and non-medical self-test limitations')
  // Follow the real services link to the actual current page, provider, and cards.
  let explorerState
  const explorer=load('components/services-explorer-state.tsx',{react:{
    createContext:()=>({Provider:props=>{explorerState=props.value;return jsx.jsx('provider',props)}}),
    useContext:()=>explorerState,useState:initial=>[initial,denied],
  }})
  const studio=load('components/services-studio-offers.tsx',{
    '@/components/services-explorer-state':explorer,'@/components/contact-channel-chooser':{ContactChannelChooser:'chooser'},
    '@/data/core-service-offers':load('data/core-service-offers.ts'),'@/lib/whatsapp-enquiry':whatsapp,'./services-studio-offers.module.css':css,
  })
  // Execute the real CTA's pre-hydration serviceBooking branch. The cart itself
  // is outside this discovery contract; only its actual mount/props/order are
  // inspected here, not checkout behavior or browser/CSS visibility.
  const consultation=component('components/public-consultation-cta.tsx','PublicConsultationCta',{
    'next/navigation':{usePathname:()=>'/'+locale+'/services'},
    '@/components/contact-channel-chooser':{ContactChannelChooser:'chooser'},
    '@/lib/public-lead-capture':{classifyPublicLead:denied,trainingEnquiryUrl:denied},
    '@/components/consultation-choice-capture':{ConsultationChoiceCapture:denied},
    '@/components/commerce/consultation-cart-entry':{ConsultationCartEntry:'consultation-cart'},
  })
  const services=load(locale==='es'?'app/es/services/page.tsx':'app/[locale]/services/page.tsx',{
    ...composition,'next/navigation':{redirect:denied,notFound:denied},
    '@/components/public-consultation-cta':{PublicConsultationCta:consultation},
    '@/components/services-conversion-hero':{ServicesConversionHero:'services-hero'},
    '@/components/services-explorer-state':explorer,'@/components/services-studio-offers':studio,
    '@/components/services-studio-extras':{ServicesIntroMedia:'media',ServicesMethodVideos:'methods',ServicesDirectoryInvitation:'directory-invitation'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'capture'},
    '@/lib/commerce/wise-payments':{wisePaymentsEnabled:()=>false},'@/lib/commerce/paypal-personal':{personalPayPalEnabled:()=>false},
    '@/data/remedies':{getHomeopathyLocaleParams:denied,isSupportedLocale:value=>['en','ru'].includes(value)},'@/data/site-metadata':{metadataBaseFor:denied},
  })
  const serviceTree=render(await services.default({params:Promise.resolve({locale}),searchParams:Promise.resolve({})}))
  assert.equal(serviceTree.type,'main');assert.equal(serviceTree.props.lang,locale)
  for(const [id,slug,isFree] of [['situation','free-situation-review',true],['dao','dao-health-profile',true],['alchemy','alchemy-of-soul',false],['hypnotherapy','hypnotherapy-course',false]]){
    const card=one(find(serviceTree,'data-services-studio-card',id),'The services route exposes original '+id+' offer')
    const title=one(visibleNodes(card).filter(node=>node.type==='h3'),'Offer has a visible title')
    const link=one(visibleNodes(title).filter(node=>node.type==='a'),'Offer title links to its original landing')
    assert.equal(link.props.href,'/'+locale+'/services/'+slug,'Original '+id+' destination is preserved')
    assert.equal(link.props['aria-label']??exposedText(link).trim(),originalTitles[locale][id],'Original '+id+' offer keeps its identifiable localized title')
    const badges=visibleNodes(card).filter(node=>node.props.className==='freeBadge')
    assert.equal(badges.length,isFree?1:0,'Original '+id+' free/paid scope is honest')
    if(isFree)assert.equal(exposedText(badges[0]),{en:'FREE',ru:'БЕСПЛАТНО',es:'GRATIS'}[locale],'Original no-cost badge keeps exact localized label')
    if(!isFree)assert.ok(exposedText(card).includes('€50 / 30 min · €100 / 60 min'),'Original paid offer retains prices')
  }
  const invitation=one(visibleNodes(serviceTree).filter(node=>node.type==='directory-invitation'),'Real services page mounts the catalogue invitation')
  assert.equal(invitation.props.locale,locale)
  const serviceNodes=visibleNodes(serviceTree)
  const cart=one(serviceNodes.filter(node=>node.type==='consultation-cart'),'Services exposes one visible paid consultation selector before hydration')
  assert.equal(cart.props.id,'consultation','Paid consultation selector preserves its public anchor target')
  assert.equal(cart.props.locale,locale,'Paid consultation selector preserves the selected locale')
  const sequence=serviceNodes.filter(node=>['services-hero','consultation-cart','media','testimonials','methods','directory-invitation'].includes(node.type)
    ||Object.hasOwn(node.props,'data-services-studio-free')).map(node=>Object.hasOwn(node.props,'data-services-studio-free')?'offers':node.type)
  assert.deepEqual(sequence,locale==='es'
    ? ['services-hero','offers','media','testimonials','methods','consultation-cart','directory-invitation']
    : ['services-hero','consultation-cart','offers','media','testimonials','methods','directory-invitation'],
    'Paid consultation selector keeps the current locale-specific Services order')
  const extras=load('components/services-studio-extras.tsx',{
    '@/components/page-video':{PageVideo:'page-video'},'@/components/services-about-entry':{ServicesAboutEntry:'about'},
    '@/components/service-video-showcase':{ServiceVideoShowcase:'showcase'},'./services-studio-extras.module.css':css,
  })
  assert.equal(visibleNodes(render(extras.ServicesDirectoryInvitation(invitation.props))).filter(node=>node.type==='a'&&node.props.href==='/'+locale+'/services/catalog').length,1,'Home services path reaches the dedicated public catalogue')
}
