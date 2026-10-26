import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {jsx,sourceModule,nodes,denied,returnedSource,opening,attributeText,expression} from './current-source-render.mjs'
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const css={default:new Proxy({}, {get:(_,name)=>String(name)})}
const icons=Object.fromEntries('ArrowLeft ArrowRight ChevronDown PlayCircle'.split(' ').map(name=>[name,'icon-'+name]))
const basic={'react/jsx-runtime':jsx,'next/link':{default:'a'},'lucide-react':icons}
export async function assertCurrentServicesCatalog({locale='en',overrides={},practiceSource=read('components/app/practice-workspace.jsx')}={}){
  const load=(path,modules={},globals={})=>sourceModule(overrides[path]??read(path),path,{...basic,...modules},globals)
  const path='/' + locale + '/services/catalog'
  const routes={notFound:denied,redirect:destination=>{throw {syntheticRedirect:true,destination}}}
  const pageImports={
    'next/navigation':routes,'@/components/public-site-header':{PublicSiteHeader:'header'},
    '@/components/services-conversion-hero':{ServicesConversionHero:'hero'},
    '@/components/services-explorer-state':{ServicesExplorerProvider:'provider'},
    '@/components/services-studio-offers':{ServicesStudioOffers:'offers'},
    '@/components/services-studio-extras':{ServicesIntroMedia:'intro',ServicesMethodVideos:'methods',ServicesDirectoryInvitation:'directory-invite'},
    '@/components/personal-testimonials':{PersonalTestimonials:'testimonials'},
    '@/components/public-consultation-cta':{PublicConsultationCta:'consultation'},
    '@/components/compact-lead-capture':{CompactLeadCapture:'capture'},
    '@/lib/commerce/wise-payments':{wisePaymentsEnabled:()=>false},
    '@/lib/commerce/paypal-personal':{personalPayPalEnabled:()=>false},
    '@/data/remedies':{getHomeopathyLocaleParams:denied,isSupportedLocale:value=>['en','ru'].includes(value)},
    '@/data/site-metadata':{metadataBaseFor:denied},'@/lib/spanish-metadata':{spanishMetadata:()=>({})},
  }
  const page=load(locale==='es'?'app/es/services/page.tsx':'app/[locale]/services/page.tsx',pageImports)
  await assert.rejects(Promise.resolve().then(()=>page.default({params:Promise.resolve({locale}),searchParams:Promise.resolve({catalog:'1'})})),
    value=>value?.syntheticRedirect===true&&value.destination===path+'#service-listings','Legacy catalogue links retain exact locale and listings anchor')
  const plain=await page.default({params:Promise.resolve({locale}),searchParams:Promise.resolve({})})
  for(const type of ['intro','methods','directory-invite','testimonials']){
    const found=nodes(plain).filter(node=>node.type===type)
    assert.equal(found.length,1,'Public services keeps '+type+' composition')
    assert.equal(found[0].props.locale,locale)
  }
  const extras=load('components/services-studio-extras.tsx',{
    '@/components/page-video':{PageVideo:'page-video'},'@/components/services-about-entry':{ServicesAboutEntry:'about'},
    '@/components/service-video-showcase':{ServiceVideoShowcase:'showcase'},'./services-studio-extras.module.css':css,
  })
  const invitation=extras.ServicesDirectoryInvitation({locale})
  assert.ok(nodes(invitation).some(node=>node.type==='a'&&node.props.href===path),'Visible invitation reaches the dedicated catalogue')
  const intro=nodes(extras.ServicesIntroMedia({locale})),methods=extras.ServicesMethodVideos({locale}),methodNodes=nodes(methods)
  assert.equal(methods.type,'details');assert.equal(methods.props.id,'method-videos')
  if(locale==='es'){
    assert.deepEqual(intro.filter(node=>node.type==='showcase').map(node=>node.props.topic),['overview'])
    assert.deepEqual(methodNodes.filter(node=>node.type==='showcase').map(node=>node.props.topic),['hypnotherapy','constellations'])
  }else{
    assert.deepEqual(intro.filter(node=>node.type==='page-video').map(node=>node.props.slot),['services-intro'])
    assert.deepEqual(methodNodes.filter(node=>node.type==='page-video').map(node=>node.props.slot),['method-hypnotherapy','method-constellations','service-business','service-alchemy','service-archetypal','consultation'])
  }
  const route=load(locale==='es'?'app/es/services/catalog/page.tsx':'app/[locale]/services/catalog/page.tsx',{
    ...pageImports,'@/components/services-directory-page':{ServicesDirectoryPage:'directory'},
  })
  const mounted=await route.default({params:Promise.resolve({locale})})
  assert.equal(mounted.type,'directory');assert.equal(mounted.props.locale,locale)
  const config=Object.freeze({sourceContract:true}),services=Object.freeze([{id:'synthetic-public-service',title:'Fictional public service'}]);let reads=0
  const directory=load('components/services-directory-page.tsx',{
    '@/components/public-site-header':{PublicSiteHeader:'header'},'@/components/services-smart-discovery':{ServicesSmartDiscovery:'discovery'},
    '@/components/master-network-explorer':{MarketplaceServiceFinder:'finder'},
    '@/data/core-service-offers':load('data/core-service-offers.ts'),
    '@/lib/app/config':{getAppConfig:()=>config},
    '@/lib/practitioners/repository':{createPractitionerRepository:value=>{assert.equal(value,config);return {listPublicServices:async language=>{assert.equal(language,locale);reads++;return services}}}},
    './services-directory-page.module.css':css,
  },{process:{env:{}}})
  const result=await directory.ServicesDirectoryPage({locale})
  assert.equal(reads,1,'Exactly one synthetic public-service read, no private repository')
  const listings=nodes(result).filter(node=>node.props.id==='service-listings')
  assert.equal(listings.length,1,'Legacy anchor remains in the actual catalogue')
  assert.equal(listings[0].type,'section','Listings are no longer behind the retired collapsed details')
  const finder=nodes(listings[0]).filter(node=>node.type==='finder')
  assert.equal(finder.length,1);assert.equal(finder[0].props.services,services);assert.equal(finder[0].props.locale,locale)
  const {file,nodes:practiceNodes}=returnedSource(practiceSource,'PracticeWorkspace')
  const links=practiceNodes.filter(node=>opening(node)?.tagName.getText(file)==='Link'&&attributeText(node,'className',file)==='hh-practice-marketplace-all')
  assert.equal(links.length,1,'Actual practice footer keeps one public catalogue link')
  const link=expression(links[0],file,{locale,Link:'a',ArrowRight:'icon-right',ChevronRight:'icon-chevron',marketplaceCopy:{all:'All'},ru:locale==='ru'})
  assert.equal(link.props.href,'/'+locale+'/services?catalog=1#service-listings','Practice preserves the supported legacy catalogue URL')
}
export const currentCatalogSource=read
