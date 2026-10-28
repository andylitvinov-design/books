import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')

test('catalog rating migration is account-owned, unique, and inaccessible directly to anon',async()=>{
  const sql=await read('supabase/migrations/20261028143000_hh_catalog_star_ratings.sql')
  for(const fragment of [
    'primary key(kind,item_key,account_id)',
    'alter table app.catalog_star_ratings enable row level security',
    'alter table app.catalog_star_ratings force row level security',
    'revoke all on app.catalog_star_ratings from public, anon, authenticated, hh_app_inbox',
    'grant update(stars,updated_at) on app.catalog_star_ratings to hh_app_backend',
    'account_id=(select auth.uid())',
    'stars between 1 and 5',
    'insert into app.catalog_star_ratings(kind,item_key,account_id,stars)',
    "from app.service_reviews where status='published'",
  ])assert.ok(sql.includes(fragment),fragment)
  assert.doesNotMatch(sql,/grant\s+all\s+on app\.catalog_star_ratings to (?:anon|authenticated|public|service_role)/i)
})

test('rating route requires real account and same-origin, no public mutation or silent analytics',async()=>{
  const [route,store,component,serviceRepo]=await Promise.all([
    read('app/api/catalog/ratings/route.js'),
    read('lib/catalog/catalog-star-ratings.js'),
    read('components/catalog-star-rating.tsx'),
    read('lib/practitioners/reviews.js'),
  ])
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/actor=await auth\.verified\(\)/)
  assert.match(route,/consumeRate\(config,\{op:'catalog-stars-member'/)
  assert.match(route,/consumeRate\(config,\{op:'catalog-stars-ip'/)
  assert.match(route,/Cache-Control|PRIVATE_HEADERS/)
  assert.match(store,/app\.accounts where id=\$1 and status='active'/)
  assert.match(store,/SELF_REVIEW_NOT_ALLOWED/)
  assert.match(store,/COMPLETED_SESSION_REQUIRED/)
  assert.match(store,/on conflict\(kind,item_key,account_id\)/)
  assert.match(component,/value\.count > 0 \? value\.average\.toFixed\(1\) : "—"/)
  assert.match(component,/No ratings yet/)
  assert.match(component,/Пока нет оценок/)
  assert.match(component,/Sin valoraciones/)
  assert.match(component,/\[5, 4, 3, 2, 1\]/)
  assert.match(serviceRepo,/app\.catalog_star_ratings/)
  assert.doesNotMatch(route,/\bservice_role\b|\badminSecret\b/)
})

test('real star filters are connected to public video, talisman and service catalogs',async()=>{
  for(const path of [
    'components/holistic-meditation-gallery.tsx',
    'components/academy-video-library-client.tsx',
    'components/taoist-talisman-catalog.tsx',
    'components/holistic-support-talisman-viewer.tsx',
    'components/services-smart-discovery.tsx',
    'components/master-network-explorer.tsx',
  ]) {
    const source=await read(path)
    assert.match(source,/useCatalogRatings\(/,path)
    assert.match(source,/StarFilter/,path)
    assert.match(source,/CatalogStarRating/,path)
  }
  assert.match(await read('components/service-video-showcase.tsx'),/PublicVideoStarRating/)
})

if(!process.execArgv.includes('--conditions=react-server')) {
  test('run validation tests in server-only runtime',()=>{
    const r=spawnSync(process.execPath,['--conditions=react-server','--test',fileURLToPath(import.meta.url)],{encoding:'utf8'})
    assert.equal(r.status,0,r.stdout+r.stderr)
  })
} else {
  const {validateStarRequest,validateRatingList}=await import('../lib/catalog/catalog-star-ratings.js')
  test('strict rating contract rejects fake, overrange and extra fields',()=>{
    const base={kind:'video',key:'Y4K4piEwwA8',stars:5}
    assert.deepEqual(validateStarRequest(base),base)
    assert.deepEqual(validateRatingList('video',['Y4K4piEwwA8','Y4K4piEwwA8']),['Y4K4piEwwA8'])
    for(const stars of [0,6,2.5,'5',null,undefined])assert.throws(()=>validateStarRequest({...base,stars}),/INVALID_RATING/)
    for(const kind of ['private','health','client','unknown',''])assert.throws(()=>validateStarRequest({...base,kind}),/INVALID_RATING_TARGET/)
    for(const key of ['https://youtube.com/watch?v=Y4K4piEwwA8','../private','a'.repeat(121),''])assert.throws(()=>validateStarRequest({...base,key}),/INVALID_RATING_TARGET/)
    assert.throws(()=>validateStarRequest({...base,accountId:'forged'}),/UNKNOWN_FIELD/i)
    assert.throws(()=>validateRatingList('video',Array(41).fill('12345678901')),/INVALID_RATING_TARGET/)
  })
}
