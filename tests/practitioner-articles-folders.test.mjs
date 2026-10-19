import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateArticleDraft} from '../lib/practitioners/article-contracts.js'
import {articleBlocks,inlineArticleSegments} from '../lib/practitioners/article-format.js'

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


test('article formatter handles remedy headings, lists and bold without HTML interpretation',()=>{
 const blocks=articleBlocks('## Показания\n\nОписание первой строки.\nДополнительная строка.\n\n### Источники\n- Алхимия\n- Самонаблюдение\n\n1. Первый\n2. Второй')
 assert.deepEqual(blocks.map(x=>x.type),['h2','p','h3','ul','ol'])
 assert.deepEqual(blocks[3].items,['Алхимия','Самонаблюдение'])
 assert.deepEqual(blocks[4].items,['Первый','Второй'])
 assert.match(blocks[1].text,/\nДополнительная строка/)
 assert.deepEqual(inlineArticleSegments('Text **bold** end'),[
  {text:'Text ',strong:false},{text:'bold',strong:true},{text:' end',strong:false},
 ])
 assert.deepEqual(articleBlocks('<script>alert(1)</script>'),[{type:'p',text:'<script>alert(1)</script>'}])
 const publicPage=read('app/[locale]/articles/[slug]/page.tsx')
 assert.match(publicPage,/articleBlocks\(published\.body/)
 assert.doesNotMatch(publicPage,/dangerouslySetInnerHTML/)
})

test('owner search keywords are optional, deduplicated and bounded',()=>{
 const clean=validateArticleDraft({...base,tags:['Цинк','Zincum','цинк']})
 assert.deepEqual(clean.tags,['Цинк','Zincum'])
 assert.deepEqual(validateArticleDraft(base).tags,[])
 assert.throws(()=>validateArticleDraft({...base,tags:['bad\nentry']}),{code:'INVALID_TAG'})
 assert.throws(()=>validateArticleDraft({...base,tags:Array(13).fill('bad')}),{code:'INVALID_LIST'})
 assert.throws(()=>validateArticleDraft({...base,tags:['x'.repeat(81)]}),{code:'INVALID_TEXT'})
})

test('remedy editor keeps unfiled selection valid, protects unsaved edits and supports quick links',()=>{
 const ui=read('components/app/practitioner-articles.jsx')
 const workspace=read('components/app/practice-workspace.jsx')
 const materials=read('components/app/practice-materials.jsx')
 assert.match(ui,/folders\.some\(f=>f\.id===selectedFolder\)\?selectedFolder:''/)
 assert.match(ui,/hasUnsaved&&!window\.confirm\(t\.discard\)/)
 assert.match(ui,/type="search"/)
 assert.match(ui,/tokens\.every\(token=>haystack\.includes\(token\)\)/)
 assert.match(ui,/tagInput/)
 assert.match(ui,/statusFilter/)
 assert.match(ui,/Submit for review/)
 assert.match(workspace,/params\.get\('panel'\)==='materials'/)
 assert.match(materials,/get\('materialTab'\)==='articles'/)
})

test('folder names cannot be duplicated even with mixed case',()=>{
 const sql=read('sql/practitioner-article-folder-name-unique-20261019.sql')
 const repo=read('lib/practitioners/article-repository.js')
 assert.match(sql,/UNIQUE INDEX/)
 assert.match(sql,/lower\(btrim\(name\)\)/)
 assert.match(repo,/FOLDER_EXISTS/)
 assert.match(repo,/ON CONFLICT/i)
})
