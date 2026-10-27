import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {chooseOpenverseAudio,openverseSearchUrl,validateSfxPlan,
  prepareOpenverseSfx,videoSfxFfmpegArgs,mixOpenverseSfx} from '../scripts/openverse-video-sfx.mjs'

const ID = '257357-4781497'
const attribution = '"Button click.wav" by brnck is marked with CC0 1.0. To view the terms, visit https://creativecommons.org/publicdomain/zero/1.0/.'
const click = {id:ID,title:'Button click.wav',license:'cc0',source:'freesound',
  url:'https://cdn.freesound.org/previews/257/257357_4781497-hq.mp3',filetype:'mp3',
  attribution,duration:257}
const clickMp3 = Buffer.concat([Buffer.from('ID3'),Buffer.alloc(32,0)])
const plan = {video:'owner.mp4',output:'owner-with-sfx.mp4',
  cues:[{type:'click',query:'button click',atSeconds:1.5,durationSeconds:0.35},
    {type:'click',query:'button click',atSeconds:4.2,durationSeconds:0.35}]}
async function withDir(fn) {
  const dir = await mkdtemp(join(tmpdir(),'hh-openverse-test-'))
  try { return await fn(dir) } finally { await rm(dir,{force:true,recursive:true}) }
}
test('Openverse query has exact allowed licenses/sources and no credentials',()=>{
  const url = new URL(openverseSearchUrl('soft whoosh transition'))
  assert.equal(url.origin,'https://api.openverse.org')
  assert.equal(url.pathname,'/v1/audio/')
  assert.equal(url.searchParams.get('license'),'cc0,by,pdm')
  assert.equal(url.searchParams.get('source'),'freesound,jamendo')
  assert.equal(url.searchParams.get('q'),'soft whoosh transition')
  assert.equal(url.searchParams.get('mature'),'false')
  assert.equal(url.searchParams.has('api_key'),false)
})
test('strict source, HTTPS direct download and license filtering; rank matching title',()=>{
  const good = {...click}
  const candidates = chooseOpenverseAudio([
    {...good,license:'by-nc'}, {...good,source:'wikimedia'},
    {...good,url:'http://cdn.freesound.org/a.mp3'},
    {...good,url:'https://169.254.169.254/latest'},
    {...good,url:'https://example.com/private.mp3'},
    {...good,attribution:''}, {...good,filetype:'exe'},
    {...good,title:'Machine random noise'}, good
  ],'button click')
  assert.equal(candidates.length,2)
  assert.equal(candidates[0].title,'Button click.wav')
  assert.equal(candidates[1].title,'Machine random noise')
})
test('reject private query contents, invalid timing, path and same type with inconsistent searches',()=>{
  for (const changed of [
    {cues:[{type:'../foo',query:'button click',atSeconds:1}]},
    {cues:[{type:'click',query:'user@email.com',atSeconds:1}]},
    {cues:[{type:'click',query:'button click',atSeconds:-1}]},
    {cues:[{type:'click',query:'button click',atSeconds:1,gain:2}]},
    {cues:[{type:'click',query:'button click',atSeconds:1},{type:'click',query:'different',atSeconds:2}]},
    {video:'../data.txt'}
  ]) assert.throws(()=>validateSfxPlan({...plan,...changed}),/SFX_/)
})
test('one API search per unique type, exact untouched attribution, cached replay makes no requests',async()=>{
  await withDir(async dir=>{
    let searches=0,downloads=0
    const fetcher=async(url)=>{
      searches++
      assert.equal(new URL(url).searchParams.get('q'),'button click')
      return Response.json({results:[{...click,source:'wrong'},click]})
    }
    const download=async(url,target)=>{
      downloads++
      assert.equal(url,click.url)
      await writeFile(target,clickMp3)
    }
    const first=await prepareOpenverseSfx(plan,{dir,fetcher,download})
    assert.equal(searches,1)
    assert.equal(downloads,1)
    assert.equal(first.cues.length,2)
    assert.equal(first.cues[0].path,first.cues[1].path)
    assert.equal(await readFile(join(dir,'credits.txt'),'utf8'),attribution+'\n')
    assert.equal((await readFile(join(dir,'manifest.json'),'utf8')).includes('"count": 1'),true)
    const noFetch=()=>{throw Error('MUST_NOT_SEARCH_AGAIN')}
    const repeat=await prepareOpenverseSfx(plan,{dir,fetcher:noFetch,download:noFetch})
    assert.equal(repeat.cues[0].path,first.cues[0].path)
    assert.equal(searches,1)
  })
})
test('do not search twice when first licensed result is corrupt; one search and next candidate',async()=>{
  await withDir(async dir=>{
    let searches=0,downloads=0
    const fetcher=async()=>{searches++;return Response.json({results:[click,{...click,id:'257357-4781498'}]})}
    const download=async(url,path)=>{downloads++;await writeFile(path,downloads===1?Buffer.from('HTML broken'):clickMp3)}
    const r=await prepareOpenverseSfx(plan,{dir,fetcher,download})
    assert.equal(searches,1)
    assert.equal(downloads,2)
    assert.match(r.assets.click.file,/257357-4781498/)
    assert.equal(await readFile(join(dir,'credits.txt'),'utf8'),attribution+'\n')
  })
})
test('rate limit / no results fail closed, do not produce credits on failure',async()=>{
  await withDir(async dir=>{
    await assert.rejects(()=>prepareOpenverseSfx(plan,{
      dir,fetcher:async()=>new Response('limit',{status:429})
    }),/SFX_OPENVERSE_RATE_LIMIT/)
    await assert.rejects(()=>prepareOpenverseSfx(plan,{
      dir,fetcher:async()=>Response.json({results:[{...click,license:'by-nc'}]})
    }),/SFX_NO_LICENSED_AUDIO/)
    assert.rejects(()=>stat(join(dir,'credits.txt')), {code:'ENOENT'})
  })
})
test('FFmpeg maps existing video without re-encoding; overlays effects at cue timestamps',()=>{
  const cues=[{path:'/tmp/click.mp3',atMs:1250,duration:0.8,gain:0.12},
    {path:'/tmp/click.mp3',atMs:3500,duration:0.8,gain:0.12}]
  const args=videoSfxFfmpegArgs('/tmp/source.mp4','/tmp/dest.mp4',cues)
  assert.equal(args.filter(x=>x==='/tmp/click.mp3').length,2)
  assert.equal(args[args.indexOf('-c:v')+1],'copy')
  assert.equal(args[args.indexOf('-c:a')+1],'aac')
  assert.match(args[args.indexOf('-filter_complex')+1],/adelay=1250:all=1/)
  assert.match(args[args.indexOf('-filter_complex')+1],/adelay=3500:all=1/)
  assert.match(args[args.indexOf('-filter_complex')+1],/amix=inputs=3:duration=first/)
  assert.throws(()=>videoSfxFfmpegArgs('a','b',[{path:'/tmp/a',atMs:3,duration:2,gain:4}]),/SFX_PLAN_INVALID/)
})
test('original output is never overwritten',async()=>{
  await withDir(async dir=>{
    const output=join(dir,'output.mp4')
    await writeFile(output,'original')
    await assert.rejects(()=>mixOpenverseSfx({video:join(dir,'in.mp4'),output,
      cues:[{path:join(dir,'a.mp3'),atMs:1,duration:1,gain:0.1}],executable:'ffmpeg'}),/SFX_OUTPUT_EXISTS/)
    assert.equal(await readFile(output,'utf8'),'original')
  })
})
