#!/usr/bin/env node
// Safe, read-only screenshot + DOM/CSS reference capture for PUBLIC guest pages.
// Never attach real user sessions or run on private/account/client/admin routes.
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require=createRequire(import.meta.url)
const privateRoute=/(?:^|\/)(?:api|app|admin|client|dashboard|account|auth|checkout|payment|private)(?:\/|$)/i
const safePath=p=>{
  if (!/^\/(?:en|ru|es)(?:\/|$)/.test(p)||p.startsWith('//')||privateRoute.test(p))
    throw Error('Only locale-prefixed PUBLIC routes; private account/admin/client paths are forbidden')
  if (p.includes('?')||p.includes('#')||p.includes('%')||p.includes('\\'))
    throw Error('Do not capture tokens, query strings, fragments or encoded private paths')
  return p
}
export function parseCaptureArgs(argv) {
  const opts={origin:'http://127.0.0.1:3119',route:'/ru/practice',browser:'chromium',width:390,height:844,out:'artifacts/public-ui-reference'}
  for(let i=0;i<argv.length;i++){
    const [flag,inline]=argv[i].split('=',2)
    if(!flag.startsWith('--'))throw Error('Unexpected argument '+flag)
    const val=inline??argv[++i]
    if(!val||val.startsWith('--'))throw Error('Missing argument for '+flag)
    const name=flag.slice(2)
    if(!['origin','route','browser','width','height','out'].includes(name))throw Error('Unknown argument '+flag)
    opts[name]=val
  }
  const u=new URL(opts.origin)
  const isLocal=u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&/^\d+$/.test(u.port)
  const isPublic=u.origin==='https://holistichouse.vercel.app'
  if(!isLocal&&!isPublic)throw Error('Only local development or the canonical public Holistic House origin is allowed')
  if(u.pathname!=='/'||u.search||u.hash)throw Error('Origin must not contain paths, queries or fragments')
  opts.origin=u.origin
  opts.route=safePath(opts.route)
  if(!['chromium','webkit'].includes(opts.browser))throw Error('Browser must be chromium or webkit')
  opts.width=Number(opts.width); opts.height=Number(opts.height)
  if(!Number.isInteger(opts.width)||opts.width<320||opts.width>1920||
     !Number.isInteger(opts.height)||opts.height<480||opts.height>1600)
    throw Error('Use a supported mobile/tablet/desktop screenshot viewport')
  return opts
}

export async function capturePublicPage(opts) {
  const { chromium,webkit } = require(process.env.HH_PLAYWRIGHT_PACKAGE||'playwright')
  const browserType=opts.browser==='chromium'?chromium:webkit
  const browser=await browserType.launch({headless:true})
  try {
    const page=await browser.newPage({viewport:{width:opts.width,height:opts.height},deviceScaleFactor:1,
      isMobile:opts.width<=430,hasTouch:opts.width<=430,reducedMotion:'reduce',serviceWorkers:'block'})
    // Only brand-new isolated browser pages. No personal accounts or cookies.
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    const response=await page.goto(opts.origin+opts.route,{waitUntil:'domcontentloaded',timeout:90000})
    if(!response||response.status()!==200)throw Error('Public page did not load: HTTP '+(response?.status()??'no response'))
    const finalURL=new URL(page.url())
    if(finalURL.origin!==opts.origin||privateRoute.test(finalURL.pathname))
      throw Error('Public capture redirected to another/private origin or path')
    await page.evaluate(async()=>{await document.fonts.ready})
    await page.waitForTimeout(250)
    const data=await page.evaluate(()=>{
      const item=(node)=>{
        const r=node.getBoundingClientRect(), s=getComputedStyle(node)
        if(s.display==='none'||s.visibility==='hidden'||r.height<1||r.width<1)return null
        const attr = name=>node.getAttribute(name)||undefined
        return {
          tag:node.tagName.toLowerCase(),id:node.id||undefined,
          testid:attr('data-testid')||attr('data-practice-showcase')||undefined,
          className:typeof node.className==='string'?node.className.slice(0,160):undefined,
          label:(node.getAttribute('aria-label')||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,80),
          box:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)},
          style:{fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
            color:s.color,background:s.backgroundColor,borderRadius:s.borderRadius,
            padding:s.padding,margin:s.margin,gap:s.gap,
            objectFit:s.objectFit,backgroundImage:s.backgroundImage.slice(0,320)},
        }
      }
      const nodes=[...document.querySelectorAll('header, main, nav, h1, h2, section, article, button, a, img')]
      const selected=nodes.map(item).filter(Boolean).slice(0,200)
      return {
        title:document.title,
        pathname:location.pathname,
        viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
          scrollWidth:document.documentElement.scrollWidth},
        landmarks:selected,
      }
    })
    await mkdir(opts.out,{recursive:true})
    const base=opts.browser+'-'+opts.width+'-'+opts.route.replaceAll('/','-').replace(/^-+/,'')
    await page.screenshot({path:resolve(opts.out,base+'.png'),fullPage:false})
    await page.screenshot({path:resolve(opts.out,base+'-full.png'),fullPage:true})
    await writeFile(resolve(opts.out,base+'.json'),JSON.stringify({
      kind:'public guest reference only; browser context is isolated; not account E2E',
      origin:opts.origin,route:opts.route,engine:opts.browser,
      pageErrors:errors, ...data,
    },null,2)+'\n')
    console.log('Captured '+opts.origin+opts.route+' '+opts.browser+' '+opts.width+'px → '+opts.out)
    return data
  } finally {
    await browser.close()
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const opts=parseCaptureArgs(process.argv.slice(2))
    await capturePublicPage(opts)
  }catch(error){
    console.error('Public UI capture failed: '+error.message)
    process.exitCode=1
  }
}
