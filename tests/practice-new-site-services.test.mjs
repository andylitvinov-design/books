import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {assertCurrentServicesCatalog,currentCatalogSource} from './helpers/current-services-catalog-contract.mjs'
import {assertCurrentPracticeMarketplace,practiceMarketplaceSource} from './helpers/current-practice-marketplace-contract.mjs'

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('My Practice keeps a reachable collapsed public marketplace and isolated quota-safe service CTA', async t => {
  await assertCurrentPracticeMarketplace()
  // Each mutation exercises the actual returned tree, hook handler or public
  // projection. The unchanged source must pass before any negative can count.
  const workspace='components/app/practice-workspace.jsx'
  const dashboard='components/app/my-services-dashboard.jsx'
  const repository='lib/practitioners/repository.js'
  for(const [name,path,before,after,reason] of [
    ['missing disclosure',workspace,'className="hh-practice-v4-community"','className="retired-community"',/One reachable community disclosure/],
    ['expanded community',workspace,'<details className="hh-practice-v4-community">','<details open className="hh-practice-v4-community">',/Community starts collapsed/],
    ['hidden community',workspace,'<details className="hh-practice-v4-community">','<details hidden className="hh-practice-v4-community">',/Bounded render visibility: community disclosure/],
    ['inert community',workspace,'<details className="hh-practice-v4-community">','<details inert className="hh-practice-v4-community">',/Bounded render visibility: community disclosure/],
    ['collapsed visibility',workspace,'<details className="hh-practice-v4-community">','<details style={{visibility:"collapse"}} className="hh-practice-v4-community">',/Bounded render visibility: community disclosure/],
    ['hidden catalogue ancestor',workspace,'<div className="hh-practice-marketplace-latest">','<div style={{display:"none"}} className="hh-practice-marketplace-latest">',/Bounded render visibility: catalogue link/],
    ['aria-hidden catalogue',workspace,'<Link className="hh-practice-marketplace-all"','<Link aria-hidden="true" className="hh-practice-marketplace-all"',/Bounded render visibility: catalogue link/],
    ['hidden add-service CTA',workspace,'<button className="hh-practice-top-cta-button"','<button hidden className="hh-practice-top-cta-button"',/Bounded render visibility: add-service CTA/],
    ['hidden public card',workspace,'<Link className="hh-practice-marketplace-card"','<Link style={{visibility:"hidden"}} className="hh-practice-marketplace-card"',/Bounded render visibility: public service card/],
    ['hidden public title',workspace,'<strong className="hh-practice-marketplace-card-title"','<strong hidden className="hh-practice-marketplace-card-title"',/Bounded render visibility: public card title/],
    ['concealed marketplace title',workspace,'{marketplaceCopy.title}</h2>','<span hidden>{marketplaceCopy.title}</span></h2>',/Native expansion exposes|Localized marketplace title/],
    ['concealed CTA label',workspace,'<span>{serviceQuota.canAdd?marketplaceCopy.add:marketplaceCopy.limit}</span>','<span hidden>{serviceQuota.canAdd?marketplaceCopy.add:marketplaceCopy.limit}</span>',/Localized add-service wording/],
    ['concealed catalogue label',workspace,'{marketplaceCopy.all}<ChevronRight','<span hidden>{marketplaceCopy.all}</span><ChevronRight',/Explore all/],
    ['concealed price',workspace,'<span>{showcasePrice(item,locale,marketplaceCopy)}</span>','<span hidden>{showcasePrice(item,locale,marketplaceCopy)}</span>',/prices remain distinct/],
    ['price behind closed disclosure',workspace,'<span>{showcasePrice(item,locale,marketplaceCopy)}</span>','<details><summary></summary><span>{showcasePrice(item,locale,marketplaceCopy)}</span></details>',/prices remain distinct/],
    ['community behind active panel',workspace,'!needsOnboarding&&!activePanel&&<details className="hh-practice-v4-community"','!needsOnboarding&&<details className="hh-practice-v4-community"',/Active workbench does not render community/],
    ['community before activation',workspace,'!needsOnboarding&&!activePanel&&<details className="hh-practice-v4-community"','!activePanel&&<details className="hh-practice-v4-community"',/Community requires activated/],
    ['overview behind active panel',workspace,'!needsOnboarding&&!activePanel&&<div className="hh-practice-overview"','!needsOnboarding&&<div className="hh-practice-overview"',/Overview never competes/],
    ['wrong catalogue destination',workspace,"'/'+locale+'/services?catalog=1#service-listings'","'/'+locale+'/services?catalog=0'",/supported catalogue destination/],
    ['bypassed canonical service route',workspace,'getPublicServiceDetailHref(locale,item.practitionerSlug,item.slug)',"'/'+locale+'/services/'+item.practitionerSlug+'/'+item.slug",/canonical route and practitioner identity/],
    ['another practitioner rewritten','lib/practitioners/public-service-links.js',"practitionerSlug === 'andy-litvinov' && serviceSlug",'serviceSlug',/canonical route and practitioner identity/],
    ['private offerings as examples',workspace,'const publicServiceExamples=(newServices?.recent||[])','const publicServiceExamples=(data.services||[])',/authentic public examples/],
    ['missing Spanish publication gate',workspace,".filter(item=>locale!=='es'||item.displayLocales?.includes('es'))",'.filter(()=>true)',/canonical route and practitioner identity/],
    ['no public example bound',workspace,'].slice(0,4)',']',/authentic public examples/],
    ['own examples replace peers',workspace,'publicServiceExamples.filter(item=>item.practitionerSlug!==p?.slug)','publicServiceExamples.filter(item=>item.practitionerSlug===p?.slug)',/authentic public examples/],
    ['unlocalized title',workspace,'item.titles?.[locale]||item.titles?.en','item.titles?.en',/public localized title/],
    ['unlocalized summary',workspace,"item.shortDescriptions?.[locale]||item.shortDescriptions?.en||''","item.shortDescriptions?.en||''",/public localized summary/],
    ['missing actual photo',workspace,'<ShowcaseCover item={item} />','<span />',/photo component stays mounted/],
    ['hidden actual image',workspace,'<Image src={failed?fallback:showcasePhoto(item)}','<Image hidden src={failed?fallback:showcasePhoto(item)}',/Bounded render visibility: rendered public photo/],
    ['hidden actual image parent',workspace,'<span className="hh-practice-marketplace-card-photo">','<span hidden className="hh-practice-marketplace-card-photo">',/Bounded render visibility: rendered public photo/],
    ['ignored image failure',workspace,'failed?fallback:showcasePhoto(item)','showcasePhoto(item)',/Image failure uses the category fallback/],
    ['unsafe photo protocol',workspace,"selected.startsWith('https://')","selected.startsWith('http')",/Only HTTPS or site-local/],
    ['unknown price advertised free',workspace,"if(item.pricingMode==='contact'||item.confirmedPrice==null)return copy.viewService","if(item.pricingMode==='contact')return copy.viewService; if(item.confirmedPrice==null)return copy.free",/Unknown price is not falsely/],
    ['contact price invented',workspace,"if(item.pricingMode==='contact'||item.confirmedPrice==null)return copy.viewService","if(item.confirmedPrice==null)return copy.viewService",/prices remain distinct/],
    ['unavailable confused with empty',workspace,'newServices?marketplaceCopy.noRecent:marketplaceCopy.unavailable','marketplaceCopy.noRecent',/Empty and unavailable states remain distinct/],
    ['quota CTA enabled',workspace,'disabled={!serviceQuota.canAdd}','disabled={false}',/Hobby limit applies/],
    ['server quota ignored',workspace,'data.serviceQuota||getHobbyServiceQuota(services)','getHobbyServiceQuota(services)',/Server quota takes precedence/],
    ['archived services consume quota','lib/practitioners/service-quota.js',"services.filter(item => item?.status !== 'archived').length",'services.length',/Hobby limit applies/],
    ['creation signal lost',workspace,'setNewServiceRequest(current=>current+1)', 'setNewServiceRequest(current=>current)',/Each requested creation has one signal/],
    ['wrong CTA panel route',workspace,"setPanelRoute('services')","setPanelRoute('profile')",/exact panel route/],
    ['stale create bypasses quota',dashboard,'creating&&canAdd&&<div','creating&&<div',/stale create state cannot bypass/],
    ['editor ignores creation signal',dashboard,'if(createRequest>0&&canAdd)setCreating(true)','if(false)setCreating(true)',/allowed creation signal reaches/],
    ['CRM owner guard removed',workspace,"activePanel==='crm'&&isOwner&&accountId","activePanel==='crm'&&accountId",/CRM remains owner-only/],
    ['CRM account guard removed',workspace,"activePanel==='crm'&&isOwner&&accountId","activePanel==='crm'&&isOwner",/CRM also requires/],
    ['marketing owner guard removed',workspace,"activePanel==='marketing'&&isOwner&&<div","activePanel==='marketing'&&<div",/Marketing remains owner-only/],
    ['private field leaks in projection',repository,'slug:row.slug,\n          practitionerSlug:',"slug:row.slug,privateNote:row.private_note,\n          practitionerSlug:",/Exact public projection excludes/],
    ['draft becomes public title','lib/practitioners/contracts.js','const copy=row.localized_copy||{}','const copy=row.draft_copy||{}',/Exact public projection excludes/],
    ['unpublished examples selected',repository,"where s.status='published' and", "where s.status='draft' and",/published, active and reviewed-profile SQL gates/],
    ['inactive profiles selected',repository,"${alias}.active and ${alias}.public_profile",'${alias}.public_profile',/published, active and reviewed-profile SQL gates/],
    ['unbounded public query',repository,'limit 12','limit 12000',/Public query remains bounded/],
  ]) await t.test('current marketplace rejects '+name,async()=>{
    const original=practiceMarketplaceSource(path)
    assert.ok(original.includes(before),'Mutation target exists: '+name)
    // The creation-signal statement appears in deep-link and CTA handlers. Mutate
    // both: the callback assertion still executes the actual clicked CTA handler.
    const mutated=name==='creation signal lost'?original.replaceAll(before,after):original.replace(before,after)
    await assert.rejects(assertCurrentPracticeMarketplace({overrides:{[path]:mutated}}),error=>error?.code==='ERR_ASSERTION'&&reason.test(error.message),'Mutation must fail its intended semantic assertion: '+name)
  })
})

test('Marketplace stats are read after authentication; only public-approved service names are returned', async () => {
  const [api, repo] = await Promise.all([
    source('app/api/app/[...path]/route.js'),
    source('lib/practitioners/repository.js'),
  ])
  const verified = api.indexOf('const actor = await auth.verified()')
  const practice = api.indexOf("joined === 'practice' && method === 'GET'")
  assert.ok(verified >= 0 && practice > verified)
  assert.match(api, /newServices = await practiceRepo\.getMarketplaceNewServices\(\)/)
  assert.match(api, /return json\(\{ \.\.\.workspace, newServices \}\)/)
  const start = repo.indexOf('async getMarketplaceNewServices()')
  const end = repo.indexOf('async listPublicServices(', start)
  const sourceOfStats = repo.slice(start, end)
  assert.ok(start > 0 && end > start)
  assert.match(sourceOfStats, /s\.submitted_at >= now\(\)-interval '7 days'/)
  assert.match(sourceOfStats, /s\.status='submitted'/)
  assert.match(sourceOfStats, /s\.image_path/)
  assert.match(sourceOfStats, /p\.public_profile->>'displayName'/)
  assert.match(sourceOfStats, /shortDescriptions:/)
  assert.match(sourceOfStats, /practitionerName:row\.practitioner_name/)
  assert.match(sourceOfStats, /s\.status='published'/)
  assert.match(sourceOfStats, /serviceStatusSql\('s'\)/)
  assert.match(sourceOfStats, /publicStatusSql\('p'\)/)
  assert.match(sourceOfStats, /\{server:true\}/)
  assert.doesNotMatch(sourceOfStats, /draft_copy|draft_profile|contact_ciphertext/)
})

test('View all services reaches the dedicated catalogue through supported locale redirects', async () => {
  for(const locale of ['en','ru','es']) await assertCurrentServicesCatalog({locale})
})

for(const [name,path,before,after,reason] of [
  ['missing legacy redirect','app/[locale]/services/page.tsx','if ((await searchParams)?.catalog === "1") redirect("/" + locale + "/services/catalog#service-listings");','',/Legacy catalogue links/],
  ['wrong legacy locale','app/[locale]/services/page.tsx','redirect("/" + locale + "/services/catalog#service-listings")','redirect("/es/services/catalog#service-listings")',/Legacy catalogue links/],
  ['missing directory invite','app/[locale]/services/page.tsx','<ServicesDirectoryInvitation locale={locale as Locale} />','<div />',/directory-invite composition/],
  ['wrong catalogue route','components/services-studio-extras.tsx','href={"/" + locale + "/services/catalog"}','href={"/" + locale + "/services"}',/dedicated catalogue/],
  ['missing listings target','components/services-directory-page.tsx','id="service-listings"','id="retired-listings"',/Legacy anchor remains/],
  ['missing marketplace finder','components/services-directory-page.tsx','<MarketplaceServiceFinder services={services} locale={locale} />','<div />',/0 !== 1/],
]) test('current catalogue routing rejects '+name,async()=>{
  const original=currentCatalogSource(path)
  assert.ok(original.includes(before),'Mutation target must exist')
  await assert.rejects(assertCurrentServicesCatalog({locale:'en',overrides:{[path]:original.replace(before,after)}}),reason)
})
