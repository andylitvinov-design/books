import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateArticleDraft} from '../lib/practitioners/article-contracts.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const base={locale:'ru',title:'Arsenicum Album',excerpt:'Краткое описание авторского образовательного материала.',body:'Авторское описание архетипа и основных наблюдений.',sourceUrls:[],linkedServiceIds:[]}

test('original remedy cover paths are allowed without accepting external private media',()=>{
 const result=validateArticleDraft({...base,coverPath:'/media/remedies/arsenicum-album/message188-1.jpg'})
 assert.equal(result.coverPath,'/media/remedies/arsenicum-album/message188-1.jpg')
 for(const coverPath of ['//evil.com/a.jpg','/media/clients/private.jpg','https://evil.com/image.jpg','/media/remedies/../../private.jpg']){
  assert.throws(()=>validateArticleDraft({...base,coverPath}),error=>error.code==='INVALID_IMAGE')
 }
})

test('owner-scoped folder migration keeps articles when a folder is deleted',()=>{
 const sql=read('sql/practitioner-article-folders-20261019.sql')
 assert.match(sql,/UNIQUE \(id, practitioner_id\)/)
 assert.match(sql,/FOREIGN KEY \(folder_id, practitioner_id\)/)
 assert.match(sql,/ON DELETE SET NULL \(folder_id\)/)
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/)
 assert.match(sql,/trusted_auth_user_id=\(SELECT auth\.uid\(\)\)/)
 assert.match(sql,/REVOKE ALL .* FROM PUBLIC, anon, authenticated/)
})

test('article library uses protected folder API and preserves draft-only publishing',()=>{
 const repo=read('lib/practitioners/article-repository.js')
 const api=read('app/api/app/[...path]/route.js')
 assert.match(repo,/async library\(actor\)/)
 assert.match(repo,/await ownedFolder\(db,p\.id,input\.folderId\)/)
 assert.match(repo,/select \* from app\.practitioner_articles where practitioner_id=\$1 order by updated_at desc limit 500/)
 assert.match(api,/joined === 'practice\/articles' && method === 'GET'/)
 assert.match(api,/path\[2\] === 'folders'/)
 assert.match(api,/articleRepo\.renameFolder/)
 assert.match(api,/articleRepo\.removeFolder/)
 assert.match(repo,/async submit\(actor,id,input\)/)
 assert.match(repo,/async moderate\(id,input\)/)
})

test('master article editor includes search, folders, inline formatting and preview',()=>{
 const ui=read('components/app/practitioner-articles.jsx')
 assert.match(ui,/type="search"/)
 assert.match(ui,/setSelectedFolder/)
 assert.match(ui,/onClick=\{renameFolder\}/)
 assert.match(ui,/onClick=\{deleteFolder\}/)
 assert.match(ui,/ArticlePreview/)
 assert.match(ui,/insertFormat/)
 assert.match(ui,/sourceUrls/)
})
