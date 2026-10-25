// Offline public-source contract. Hooks, navigation and query results are synthetic;
// no effects from the workspace, transport, account, browser or database are run.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {jsx,sourceModule,parse,descendants,nodes,text as rawText,denied,returnedSource,ts} from './current-source-render.mjs'
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
export const practiceMarketplaceSource=read
const WORKSPACE='components/app/practice-workspace.jsx'
const EXPRESS='components/app/practice-express-reports.jsx'
const DASHBOARD='components/app/my-services-dashboard.jsx'
const REPOSITORY='lib/practitioners/repository.js'
const CONTRACTS='lib/practitioners/contracts.js'
const QUOTA='lib/practitioners/service-quota.js'
const LINKS='lib/practitioners/public-service-links.js'
const FILTER='lib/practitioners/filter-owned-services.mjs'
const plain=value=>JSON.parse(JSON.stringify(value))
const byClass=(tree,name)=>nodes(tree).filter(node=>node.props.className?.split(' ').includes(name))
const one=(values,message)=>{assert.equal(values.length,1,message);return values[0]}
const paths=(tree,target,parents=[])=>{
  if(Array.isArray(tree))return tree.flatMap(child=>paths(child,target,parents))
  if(!tree||typeof tree!=='object'||!('type' in tree))return []
  return tree===target?[parents]:paths(tree.props.children,target,[...parents,tree])
}
// This checks explicit rendered flags/styles only. Native closed details are
// intentionally expandable; computed CSS, layout, pointer access and browser
// discoverability require separate browser acceptance, not this source fixture.
const present=value=>value!==undefined&&value!==null&&value!==false
const concealed=node=>present(node.props.hidden)||present(node.props.inert)||[true,'true'].includes(node.props['aria-hidden'])||
  String(node.props.style?.display).toLowerCase()==='none'||
  ['hidden','collapse'].includes(String(node.props.style?.visibility).toLowerCase())
function text(tree,expanded=new Set()){
  if(Array.isArray(tree))return tree.map(child=>text(child,expanded)).join('')
  if(tree==null||typeof tree==='boolean')return ''
  if(typeof tree!=='object')return String(tree)
  if(concealed(tree))return ''
  let children=tree.props.children
  if(tree.type==='details'&&!tree.props.open&&!expanded.has(tree))children=(Array.isArray(children)?children:[children]).filter(child=>child?.type==='summary')
  return text(children,expanded)
}
function visible(tree,target,label,expanded=new Set()){
  const path=[...one(paths(tree,target),'One actual path to '+label),target]
  for(let index=0;index<path.length;index++){
    const node=path[index]
    assert.ok(!concealed(node),'Bounded render visibility: '+label)
    if(node.type==='details'&&!node.props.open&&!expanded.has(node)&&index<path.length-1)
      assert.equal(path[index+1].type,'summary','Required content is not behind an unrelated closed disclosure: '+label)
  }
}
const copy={
  en:{title:'Be inspired by fellow practitioners',latest:'From our practitioner community',add:'Add your service — free',limit:'Service limit reached',hobby:'Hobby · Free',slots:'services',all:'Explore all',free:'Free',from:'From',view:'Explore service',practitioner:'Practitioner',empty:'No published examples yet. Your service could be among the first.',unavailable:'Service examples are temporarily unavailable.'},
  ru:{title:'Вдохновитесь услугами коллег',latest:'Мастера уже размещают',add:'Разместить свою услугу',limit:'Лимит услуг достигнут',hobby:'Hobby · бесплатно',slots:'услуг',all:'Все услуги',free:'Бесплатно',from:'от',view:'Подробнее',practitioner:'Практик',empty:'Опубликованных примеров пока нет. Ваша услуга может стать одной из первых.',unavailable:'Примеры услуг временно недоступны.'},
  es:{title:'Inspírate con otros profesionales',latest:'Servicios de la comunidad',add:'Publicar mi servicio',limit:'Límite de servicios alcanzado',hobby:'Hobby · gratis',slots:'servicios',all:'Ver todos',free:'Gratis',from:'desde',view:'Descubrir',practitioner:'Profesional',empty:'Todavía no hay servicios publicados. El tuyo podría ser uno de los primeros.',unavailable:'Los ejemplos no están disponibles por ahora.'},
}
function declaration(source,name){
  const file=parse(source)
  return one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'Exactly one actual '+name).getText(file)
}
function harness(load){
  let current
  const hooks={
    useEffect:fn=>current.effects.push(fn),useMemo:fn=>fn(),useRef:value=>({current:value}),
    useState:initial=>{
      const frame=current,key=frame.keys[frame.index++]
      assert.ok(key,'Every hook is bound to an actual component declaration')
      if(!Object.hasOwn(frame.values,key))frame.values[key]=typeof initial==='function'?initial():initial
      return [frame.values[key],value=>{frame.values[key]=typeof value==='function'?value(frame.values[key]):value}]
    },
  }
  const keys=(source,name)=>{
    const file=parse(source),owner=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),'Actual hook owner '+name)
    return descendants(owner.body).filter(node=>ts.isVariableDeclaration(node)&&ts.isArrayBindingPattern(node.name)&&ts.isCallExpression(node.initializer)&&node.initializer.expression.getText(file)==='useState').map(node=>node.name.elements[0].name.text)
  }
  const icons=Object.fromEntries('Plus FileText Film IdCard UsersRound Leaf ReceiptText BarChart3 ChevronRight ClipboardList Share2 CheckCircle2 CalendarDays Megaphone BookOpen Headphones ArrowLeft ArrowUpRight ChevronDown Search SlidersHorizontal Save Send ShieldCheck'.split(' ').map(name=>[name,'icon-'+name]))
  const basic={'react/jsx-runtime':jsx,'react':hooks,'next/link':{default:'a'},'next/image':{default:'img'},'lucide-react':icons}
  const quota=sourceModule(load(QUOTA),QUOTA),links=sourceModule(load(LINKS),LINKS)
  const navigation=[]
  const window={location:{href:'https://fixture.invalid/en/app/practice?keep=1'},history:{state:null,replaceState:(_state,_unused,href)=>{navigation.push(href);window.location.href=new URL(href,window.location.href).href}}}
  const imported=Object.fromEntries(['crm-manager','practitioner-client-profiles','practice-materials','practice-events','practice-service-statistics','practice-requests-overview','public-enquiry-contact','my-services-dashboard','simple-service-editor','remote-goal-photo','practice-photo-upload','practice-video-field'].map(name=>['./'+name,{default:name}]))
  // Execute the actual report child only with synthetic state and denied transport.
  // Its effects and API handlers are never invoked by this marketplace fixture.
  const express=sourceModule(load(EXPRESS),EXPRESS,{...basic,'./practice-express-reports.module.css':{default:new Proxy({}, {get:(_,name)=>String(name)})}})
  imported['./practice-express-reports']=express
  const aliasPath='components/app/practice-public-alias.jsx'
  imported['./practice-public-alias']=sourceModule(load(aliasPath),aliasPath,{...basic,
    '@/lib/practitioners/profile-alias-contract.mjs':sourceModule(load('lib/practitioners/profile-alias-contract.mjs'),'profile-alias-contract.ts',{'../assessments/contracts.js':sourceModule(load('lib/assessments/contracts.js'),'contracts.js')}),
    './practice-public-alias.module.css':{default:new Proxy({}, {get:(_,name)=>String(name)})},
  })
  const workspace=sourceModule(load(WORKSPACE)+'\nexport {ShowcaseCover, Services};',WORKSPACE,{...basic,...imported,'@/lib/practitioners/service-quota.js':quota,'@/lib/practitioners/public-service-links.js':links,'./practice-dashboard.css':{}},{URL,window})
  const dashboard=sourceModule(load(DASHBOARD),DASHBOARD,{...basic,'@/lib/practitioners/filter-owned-services.mjs':sourceModule(load(FILTER),FILTER+'.ts'),'./my-services-dashboard.module.css':{default:new Proxy({}, {get:(_,name)=>String(name)})}},{window:{confirm:denied}})
  const hookKeys=new Map([[workspace.default,keys(load(WORKSPACE),'PracticeWorkspace')],[workspace.ShowcaseCover,keys(load(WORKSPACE),'ShowcaseCover')],[workspace.Services,[]],[express.default,keys(load(EXPRESS),'PracticeExpressReports')],[dashboard.default,keys(load(DASHBOARD),'MyServicesDashboard')]])
  const render=(component,props,values={},effects=false)=>{
    current={keys:hookKeys.get(component),index:0,values,effects:[]}
    assert.ok(current.keys,'Only actual approved components are invoked')
    const result=component(props)
    assert.equal(current.index,current.keys.length,'Stable actual hook order')
    if(effects)current.effects.forEach(fn=>fn())
    return result
  }
  return {workspace,dashboard,express,quota,links,render,navigation,window}
}
function publicItem(slug,extra={}){
  return {slug,practitionerSlug:'fictional-'+slug,practitionerName:'Fictional public '+slug,imagePath:'/images/fictional-public-'+slug+'.webp',areaKey:'relationships',pricingMode:'free',confirmedPrice:null,currency:'',displayLocales:['en','ru','es'],titles:{en:'Public EN '+slug,ru:'Публичная RU '+slug,es:'Público ES '+slug},shortDescriptions:{en:'Summary EN '+slug,ru:'Описание RU '+slug,es:'Resumen ES '+slug},...extra}
}
function fixture(){
  return {practiceActivated:true,practitioner:{id:'fictional-self-id',slug:'fictional-self',status:'approved',revision:1,profile:{displayName:'Fictional self'},draftProfile:{displayName:'SYNTHETIC_PRIVATE_PROFILE'}},services:[{id:'fictional-owned',status:'draft',revision:1,localizedCopy:{en:{title:'SYNTHETIC_PRIVATE_SERVICE'}}}],requests:[{id:'fictional-request',status:'requested',message:'SYNTHETIC_PRIVATE_REQUEST'}],newServices:{submitted7d:98761,pendingNow:98762,published7d:98763,availableNow:98764,recent:[]}}
}
async function assertPublicProjection(load){
  const source=load(REPOSITORY),{file,returned}=returnedSource(source,'createPractitionerRepository')
  assert.ok(ts.isObjectLiteralExpression(returned.expression),'Public repository remains an actual returned object')
  const method=one(returned.expression.properties.filter(node=>ts.isMethodDeclaration(node)&&node.name.getText(file)==='getMarketplaceNewServices'),'Actual marketplace query method')
  const functions=['publicStatusSql','serviceStatusSql'].map(name=>declaration(source,name)).join('\n')
  const projected=publicItem('projected',{practitionerSlug:'fictional-practitioner',practitionerName:'Fictional public practitioner',imagePath:'/images/fictional-public.webp',pricingMode:'from',confirmedPrice:125,currency:'CAD'})
  const row={slug:projected.slug,practitioner_slug:projected.practitionerSlug,practitioner_name:projected.practitionerName,image_path:projected.imagePath,area_key:projected.areaKey,pricing_mode:projected.pricingMode,confirmed_price:'125',currency:'CAD',localized_copy:Object.fromEntries(['en','ru','es'].map(locale=>[locale,{title:projected.titles[locale],shortDescription:projected.shortDescriptions[locale]}])),discovery_metadata:{displayLocales:['en','ru','es'],privateExtra:'SYNTHETIC_PRIVATE_DISCOVERY'},draft_copy:{en:{title:'SYNTHETIC_PRIVATE_DRAFT'}},contact_ciphertext:'SYNTHETIC_PRIVATE_CIPHERTEXT',private_note:'SYNTHETIC_PRIVATE_NOTE'}
  const queries=[],config=Object.freeze({synthetic:true})
  const result=sourceModule(functions+'\n'+declaration(load(CONTRACTS),'serviceCopy')+'\nexport const repository={'+method.getText(file)+'};','marketplace-method.tsx',{}, {config,transaction:async(actual,actor,callback,options)=>{
    assert.equal(actual,config);assert.equal(actor,null);assert.deepEqual(plain(options),{server:true},'Public read is server scoped')
    return callback({query:async sql=>{queries.push(sql);return {rows:queries.length===1?[{submitted7d:'1',pendingNow:'2',published7d:'3',availableNow:'4'}]:[row]}}})
  }})
  const output=await result.repository.getMarketplaceNewServices()
  assert.equal(queries.length,2,'Exactly aggregate and public projection queries, not a private read')
  const sql=queries[1].replace(/\s+/g,' ').trim()
  const where="where s.status='published' and s.active and s.localized_copy<>'{}'::jsonb and s.status in('published','submitted','changes_requested') and p.active and p.public_profile<>'{}'::jsonb and p.status in('approved','submitted','changes_requested')"
  assert.ok(sql.includes(where+' order by'),'Public examples retain all published, active and reviewed-profile SQL gates')
  assert.match(sql,/^select s\.slug,s\.localized_copy,s\.discovery_metadata, s\.image_path,s\.area_key,s\.pricing_mode,s\.confirmed_price,s\.currency, p\.slug practitioner_slug,p\.public_profile->>'displayName' practitioner_name from /,'Query projects only public listing fields')
  assert.match(sql,/limit 12$/,'Public query remains bounded')
  assert.deepEqual(plain(output),{submitted7d:1,pendingNow:2,published7d:3,availableNow:4,recent:[projected]},'Exact public projection excludes draft, contact and unrelated metadata')
  assert.doesNotMatch(JSON.stringify(output),/SYNTHETIC_PRIVATE/,'No synthetic private sentinel reaches public output')
}
export async function assertCurrentPracticeMarketplace({overrides={}}={}){
  const load=path=>overrides[path]??read(path)
  await assertPublicProjection(load)
  const h=harness(load),{workspace,render}=h
  const cardList=tree=>byClass(tree,'hh-practice-marketplace-card')
  for(const locale of ['en','ru','es']){
    const c=copy[locale],data=fixture()
    const own=publicItem('own',{practitionerSlug:'fictional-self'})
    const alias=publicItem('homeopathy-consultation',{practitionerSlug:'andy-litvinov',pricingMode:'from',confirmedPrice:125,currency:'CAD'})
    const other=publicItem('homeopathy-consultation',{practitionerSlug:'fictional-other',pricingMode:'fixed',confirmedPrice:75,currency:'CAD'})
    const free=publicItem('free',{practitionerName:'',titles:{en:'Public fallback EN'},shortDescriptions:{en:'Summary fallback EN'}})
    const contact=publicItem('contact',{pricingMode:'contact',confirmedPrice:990})
    const notSpanish=publicItem('not-spanish',{displayLocales:['en','ru']})
    data.newServices.recent=[own,notSpanish,alias,other,free,contact]
    const expected=locale==='es'?[alias,other,free,contact]:[notSpanish,alias,other,free]
    const state={data},props={locale,ownerTools:null,accountId:'fictional-account'}
    let tree=render(workspace.default,props,state)
    const all=nodes(tree),disclosure=one(byClass(tree,'hh-practice-v4-community'),'One reachable community disclosure')
    assert.equal(disclosure.type,'details','Marketplace is a native reachable disclosure')
    assert.ok(!disclosure.props.open,'Community starts collapsed, not another open workbench')
    const summary=one([disclosure.props.children].flat(Infinity).filter(node=>node?.type==='summary'),'Disclosure has a usable summary')
    assert.equal(text(summary),c.latest,'Localized disclosure label')
    visible(tree,disclosure,'community disclosure');visible(tree,summary,'community summary')
    const expanded=new Set([disclosure])
    assert.ok(text(tree).includes(c.latest)&&!text(tree).includes(c.title),'Initially only the community summary is exposed, not its marketplace content')
    assert.ok(text(tree,expanded).includes(c.title),'Native expansion exposes the actual marketplace title')
    const market=one(byClass(disclosure,'hh-practice-marketplace'),'Actual public marketplace is inside the disclosure')
    const heading=one(nodes(market).filter(node=>node.type==='h2'),'One marketplace heading')
    assert.equal(heading.props.id,market.props['aria-labelledby'],'Marketplace accessible heading remains connected')
    assert.equal(text(heading),c.title,'Localized marketplace title');visible(tree,heading,'marketplace heading',expanded)
    const overview=one(byClass(tree,'hh-practice-overview'),'Practitioner overview remains reachable')
    const requests=one(nodes(tree).filter(node=>node.type==='practice-requests-overview'),'Single overview request mount')
    assert.ok(all.indexOf(overview)<all.indexOf(disclosure)&&all.indexOf(requests)<all.indexOf(disclosure),'Own work precedes the collapsed community')
    const cta=one(byClass(tree,'hh-practice-top-cta'),'Exactly one independent add-service CTA')
    assert.ok(!nodes(disclosure).includes(cta),'Add-service CTA is outside collapsed public examples')
    assert.equal(cta.props['aria-label'],c.add)
    const add=one(nodes(cta).filter(node=>node.type==='button'),'Single add-service button')
    assert.equal(add.props.type,'button');assert.equal(add.props.disabled,false,'Available quota enables add-service')
    visible(tree,add,'add-service CTA');assert.equal(text(add),c.add,'Localized add-service wording')
    assert.ok(text(cta).includes(c.hobby)&&text(cta).includes('1 / 10 '+c.slots),'Free Hobby quota is disclosed honestly')
    const catalog=one(byClass(market,'hh-practice-marketplace-all'),'Visible catalogue link')
    visible(tree,catalog,'catalogue link',expanded);assert.equal(catalog.type,'a');assert.equal(catalog.props.href,'/'+locale+'/services?catalog=1#service-listings','Exact localized supported catalogue destination');assert.equal(text(catalog),c.all)
    const cards=cardList(tree)
    assert.equal(cards.length,4,'At most four authentic public examples')
    for(let index=0;index<cards.length;index++){
      const card=cards[index],item=expected[index]
      const destination=item===alias?'/'+locale+'/services/alchemy-of-soul':'/'+locale+'/services/'+item.practitionerSlug+'/'+item.slug
      assert.equal(card.props.href,destination,'Public service canonical route and practitioner identity');visible(tree,card,'public service card',expanded)
      for(const name of ['title','summary','byline','foot'])visible(tree,one(byClass(card,'hh-practice-marketplace-card-'+name),'Required public card '+name),'public card '+name,expanded)
      assert.equal(text(one(byClass(card,'hh-practice-marketplace-card-title'),'Card title')),item.titles[locale]||item.titles.en,'Actual public localized title or honest fallback')
      assert.equal(text(one(byClass(card,'hh-practice-marketplace-card-summary'),'Card summary')),item.shortDescriptions[locale]||item.shortDescriptions.en,'Actual public localized summary or honest fallback')
      assert.equal(text(one(byClass(card,'hh-practice-marketplace-card-byline'),'Card practitioner')),item.practitionerName||c.practitioner,'Actual public practitioner name or generic role')
      const amount=new Intl.NumberFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(item.confirmedPrice)
      const price=item.pricingMode==='free'?c.free:item.pricingMode==='contact'?c.view:item.pricingMode==='from'?c.from+' '+amount:amount
      assert.equal(text(one(byClass(card,'hh-practice-marketplace-card-foot'),'Card price')),price,'Free, contact, fixed and from prices remain distinct')
      const cover=one(nodes(card).filter(node=>node.type===workspace.ShowcaseCover),'Actual source photo component stays mounted')
      assert.equal(cover.props.item,item,'Photo receives the same public item, not private profile');visible(tree,cover,'public service photo',expanded)
      const coverTree=render(workspace.ShowcaseCover,cover.props,{})
      const image=one(nodes(coverTree).filter(node=>node.type==='img'),'Actual photo render')
      visible(coverTree,image,'rendered public photo')
      assert.equal(image.props.src,item.imagePath,'Use the public service photo');assert.equal(image.props.alt,'');assert.equal(image.props.fill,true);assert.equal(image.props.unoptimized,true);assert.equal(image.props.loading,'lazy')
    }
    assert.doesNotMatch(rawText(market),/SYNTHETIC_PRIVATE|9876[1-4]/,'No private content or submission aggregates in public showcase')
    assert.equal(byClass(tree,'hh-practice-marketplace-statistics').length,0,'Retired market statistics are not restored')
    // The real CTA handler only selects the services workbench and increments its
    // explicit request. History is an in-memory URL; any transport would throw.
    h.window.location.href='https://fixture.invalid/'+locale+'/app/practice?keep=1'
    add.props.onClick();add.props.onClick()
    assert.equal(state.activePanel,'services','Add-service opens services workbench')
    assert.equal(state.newServiceRequest,2,'Each requested creation has one signal')
    assert.equal(new URL(h.window.location.href).searchParams.get('panel'),'services','Add-service updates the exact panel route')
    assert.equal(new URL(h.window.location.href).searchParams.get('keep'),'1','Unrelated navigation state is preserved')
    tree=render(workspace.default,props,state)
    assert.equal(byClass(tree,'hh-practice-v4-community').length,0,'Active workbench does not render community behind it')
    const mounted=one(nodes(tree).filter(node=>node.type===workspace.Services),'Exactly one services workbench')
    assert.equal(mounted.props.items,data.services);assert.equal(mounted.props.createRequest,2);assert.equal(mounted.props.quota.canAdd,true)
    const allowedDashboard=one(nodes(render(workspace.Services,mounted.props)).filter(node=>node.type==='my-services-dashboard'),'Allowed creation dashboard')
    const allowedState={}
    render(h.dashboard.default,allowedDashboard.props,allowedState,true)
    const newEditor=one(nodes(render(h.dashboard.default,allowedDashboard.props,allowedState)).filter(node=>node.type==='simple-service-editor'),'An allowed creation signal reaches one new editor')
    assert.equal(newEditor.props.item,null,'Create opens a new offering, not a private existing record')
    one(byClass(tree,'hh-practice-close'),'Selected workbench has a close control').props.onClick()
    assert.equal(state.activePanel,null,'Close restores overview');assert.equal(new URL(h.window.location.href).searchParams.has('panel'),false)
    assert.equal(byClass(render(workspace.default,props,state),'hh-practice-v4-community').length,1,'Community is reachable again after closing')
    for(const unavailable of [false,true]){
      const empty=fixture();empty.newServices=unavailable?null:{recent:[]}
      const rendered=render(workspace.default,props,{data:empty})
      assert.equal(cardList(rendered).length,0,'Empty response never fabricates examples')
      const status=one(byClass(rendered,'hh-practice-marketplace-empty'),'Honest empty/unavailable state')
      visible(rendered,status,'marketplace availability status',new Set(byClass(rendered,'hh-practice-v4-community')));assert.equal(status.props.role,'status');assert.equal(text(status),unavailable?c.unavailable:c.empty,'Empty and unavailable states remain distinct and localized')
    }
    const self=fixture();self.newServices.recent=[own]
    assert.equal(cardList(render(workspace.default,props,{data:self}))[0]?.props.href,'/'+locale+'/services/fictional-self/own','Own public service is retained when no peers are published')
    const missing=fixture();missing.newServices.recent=[publicItem('missing',{pricingMode:'fixed',confirmedPrice:null})]
    assert.equal(text(one(byClass(render(workspace.default,props,{data:missing}),'hh-practice-marketplace-card-foot'),'Missing price')),c.view,'Unknown price is not falsely advertised as free')
    missing.newServices.recent=[publicItem('invalid-currency',{pricingMode:'fixed',confirmedPrice:50,currency:'invalid'})]
    assert.equal(text(one(byClass(render(workspace.default,props,{data:missing}),'hh-practice-marketplace-card-foot'),'Invalid currency')),c.view,'Unformattable price is not invented')
    missing.newServices.recent=[publicItem('zero',{pricingMode:'fixed',confirmedPrice:0,currency:'CAD'})]
    const zero=new Intl.NumberFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(0)
    assert.equal(text(one(byClass(render(workspace.default,props,{data:missing}),'hh-practice-marketplace-card-foot'),'Zero price')),zero,'Explicit zero amount is not treated as missing')
    for(const count of [9,10,11])for(const owner of [false,true]){
      const quotaData=fixture();quotaData.services=Array.from({length:count},(_,i)=>({id:'fictional-owned-'+i,revision:1,status:'draft'}));quotaData.services.push({id:'fictional-archived',status:'archived'})
      const rendered=render(workspace.default,{...props,ownerTools:owner?'SYNTHETIC_OWNER_TOOLS':null},{data:quotaData})
      const button=one(byClass(rendered,'hh-practice-top-cta-button'),'Quota CTA')
      assert.equal(button.props.disabled,count>=10,'Hobby limit applies to owners too; archived entries do not consume quota')
      assert.equal(text(button),count>=10?c.limit:c.add,'Quota label does not promise unavailable creation')
    }
    const forced=fixture();forced.serviceQuota={tier:'hobby',used:10,limit:10,remaining:0,canAdd:false}
    assert.equal(one(byClass(render(workspace.default,props,{data:forced}),'hh-practice-top-cta-button'),'Authoritative quota CTA').props.disabled,true,'Server quota takes precedence over a shorter local list')
    const serviceMount=one(nodes(render(workspace.default,props,{data:forced,activePanel:'services',newServiceRequest:1})).filter(node=>node.type===workspace.Services),'Quota services mount')
    const serviceTree=render(workspace.Services,serviceMount.props)
    const serviceDashboard=one(nodes(serviceTree).filter(node=>node.type==='my-services-dashboard'),'Quota reaches actual service dashboard')
    assert.equal(serviceDashboard.props.quota,forced.serviceQuota,'Quota is forwarded unchanged to the editor boundary')
    assert.equal(byClass(serviceTree,'hh-practice-limit-notice').length,1,'Limit notice remains visible')
    const stale=render(h.dashboard.default,serviceDashboard.props,{creating:true})
    assert.equal(nodes(stale).filter(node=>node.type==='simple-service-editor').length,0,'Even stale create state cannot bypass exhausted quota')
    const dashboardState={}
    render(h.dashboard.default,serviceDashboard.props,dashboardState,true)
    const dashboardTree=render(h.dashboard.default,serviceDashboard.props,dashboardState)
    assert.equal(nodes(dashboardTree).filter(node=>node.type==='simple-service-editor').length,0,'Creation request cannot open an editor when quota is exhausted')
    const dashboardAdd=one(nodes(dashboardTree).filter(node=>node.type==='button'&&node.props['aria-expanded']===false&&node.props.className===undefined),'Dashboard add button')
    assert.equal(dashboardAdd.props.disabled,true,'Dashboard independently disables quota-exhausted creation')
    const existing=one(byClass(dashboardTree,'serviceCard'),'Existing service remains editable at quota')
    existing.props.onToggle({currentTarget:{open:true}})
    const editing=render(h.dashboard.default,serviceDashboard.props,dashboardState)
    const editor=one(nodes(editing).filter(node=>node.type==='simple-service-editor'),'Existing editor remains available at quota')
    assert.equal(editor.props.item,forced.services[0],'Editing stays scoped to the selected existing offering')
  }
  for(const activePanel of [null,'services','materials','clients','crm','requests','profile','analytics','events','more','marketing','express-reports'])for(const owner of [false,true])for(const activated of [false,true]){
    const data=fixture();data.practiceActivated=activated
    const tree=render(workspace.default,{locale:'en',ownerTools:owner?'SYNTHETIC_OWNER_TOOLS':null,accountId:'fictional-account'},{data,activePanel})
    const show=activated&&!activePanel
    assert.equal(byClass(tree,'hh-practice-v4-community').length,Number(show),'Community requires activated practice AND no selected panel')
    assert.equal(byClass(tree,'hh-practice-top-cta').length,Number(show),'Top CTA requires activated practice AND no selected panel')
    assert.equal(byClass(tree,'hh-practice-overview').length,Number(show),'Overview never competes with an active workbench')
    const workbenches=nodes(tree).filter(node=>node.props.id==='hh-practice-workspace-detail')
    assert.equal(workbenches.length,Number(activated&&Boolean(activePanel)),'Only the selected workbench is mounted after activation')
    if(workbenches.length)assert.equal(workbenches[0].props['data-practice-detail-panel'],activePanel)
    assert.equal(nodes(tree).filter(node=>node.type==='crm-manager').length,Number(activated&&owner&&activePanel==='crm'),'CRM remains owner-only and selected-panel-only')
    const reports=nodes(tree).filter(node=>node.type===h.express.default)
    assert.equal(reports.length,Number(activated&&activePanel==='express-reports'),'Exactly the selected activated report workbench mounts the real child')
    if(reports.length){
      const mount=reports[0]
      assert.equal(mount.props.accountId,'fictional-account','Report child receives the current authenticated workspace account')
      assert.equal(mount.props.requests,data.requests,'Report child receives only the current workspace requests')
      assert.equal(mount.props.owner,owner,'Report owner boundary is forwarded unchanged')
      assert.equal(mount.props.locale,'en','Report language is forwarded unchanged')
      const reportTree=render(h.express.default,mount.props,{loading:false,issuedOn:'2026-10-01'})
      assert.equal(reportTree.props['data-practitioner-express-reports'],true,'The real report workbench is rendered')
      assert.equal(byClass(reportTree,'owner').length,Number(owner),'Clinical-owner notice never leaks to another practitioner')
      assert.equal(nodes(reportTree).filter(node=>node.type==='form').length,0,'Guest enquiries cannot open private report creation')
      assert.equal(nodes(reportTree).filter(node=>node.props['data-express-report-id']).length,0,'No report data is fetched or invented')
      assert.doesNotMatch(rawText(reportTree),/SYNTHETIC_PRIVATE/,'Marketplace private sentinels never become report content')
    }

    assert.equal(byClass(tree,'hh-practice-marketing').length,Number(activated&&owner&&activePanel==='marketing'),'Marketing remains owner-only and selected-panel-only')
    assert.equal(byClass(tree,'hh-master-clinical-tools').length,Number(owner&&!activePanel),'Owner tool content never leaks to non-owners or another active panel')
  }
  for(const owner of [false,true]){
    const tree=render(workspace.default,{locale:'en',ownerTools:owner?'SYNTHETIC_OWNER_TOOLS':null,accountId:null},{data:fixture(),activePanel:'crm'})
    assert.equal(nodes(tree).filter(node=>node.type==='crm-manager').length,0,'CRM also requires the authenticated account identifier')
  }
  const loading=render(workspace.default,{locale:'en'},{data:null})
  assert.equal(byClass(loading,'hh-practice-v4-community').length,0,'No marketplace before workspace data arrives')
  assert.equal(loading.props['aria-busy'],true)
  const failed=render(workspace.default,{locale:'en'},{data:null,error:'SYNTHETIC_LOAD_ERROR'})
  assert.equal(failed.props['aria-busy'],false);assert.equal(nodes(failed).filter(node=>node.props.role==='alert').length,1)
  const fallback='/images/holistic-house/video-posters/constellations-en-v1.webp'
  for(const imagePath of ['https://images.example.test/public.webp','/images/public.webp','javascript:invalid','http://images.example.test/public.webp','//images.example.test/public.webp','',null]){
    const item=publicItem('photo',{imagePath}),state={}
    let coverTree=render(workspace.ShowcaseCover,{item},state)
    let image=one(nodes(coverTree).filter(node=>node.type==='img'),'Public photo source')
    visible(coverTree,image,'rendered public photo source')
    assert.equal(image.props.src,imagePath?.startsWith('https://')||imagePath==='/images/public.webp'?imagePath:fallback,'Only HTTPS or site-local public photos are selected')
    image.props.onError()
    coverTree=render(workspace.ShowcaseCover,{item},state)
    image=one(nodes(coverTree).filter(node=>node.type==='img'),'Photo retry fallback')
    visible(coverTree,image,'rendered public photo fallback')
    assert.equal(image.props.src,fallback,'Image failure uses the category fallback, not a broken portrait')
  }
  const unknownTree=render(workspace.ShowcaseCover,{item:publicItem('unknown',{areaKey:'unknown',imagePath:''})},{})
  const unknown=one(nodes(unknownTree).filter(node=>node.type==='img'),'Unknown category photo')
  visible(unknownTree,unknown,'rendered unknown-category photo')
  assert.equal(unknown.props.src,'/images/holistic-house/hero-olive-incense.webp','Unknown category retains the neutral site fallback')
}
