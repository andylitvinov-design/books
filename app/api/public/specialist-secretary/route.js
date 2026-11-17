import {createHash} from 'node:crypto'
import {NextResponse} from 'next/server'
import {getAppConfig, requireSameOrigin} from '@/lib/app/config'
import {consumeRate} from '@/lib/app/database'
import {AppError, onlyKeys} from '@/lib/assessments/contracts'
import {readBody, safeError, PRIVATE_HEADERS} from '@/lib/app/http'
import {createPractitionerRepository} from '@/lib/practitioners/repository'
import {publicSpecialistFacts, answerSpecialistQuestion} from '@/lib/practitioners/specialist-secretary.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=15
const VALID_SLUG=/^[a-z0-9][a-z0-9-]{1,79}$/
const locales=new Set(['ru','en','es'])

function validateInput(body){
  onlyKeys(body,['slug','locale','message','history'])
  if(!VALID_SLUG.test(body.slug||'')||!locales.has(body.locale)||
    typeof body.message!=='string'||!body.message.trim()||body.message.length>1200||
    !Array.isArray(body.history)||body.history.length>6||body.history.some(row=>
      !row||!['user','assistant'].includes(row.role)||typeof row.text!=='string'||
      row.text.length>1200||Object.keys(row).some(key=>!['role','text'].includes(key))))
    throw new AppError('INVALID_SECRETARY_INPUT',400)
  return body
}
export async function POST(request){
  try{
    // A user knowingly starts this public, first-party informational dialogue.
    // The route neither invokes a third-party AI model nor stores a transcript.
    // Production FAQ requests always use the existing origin guard and a
    // database-backed per-visitor rate budget. No unmetered public fallback.
    const config=getAppConfig()
    requireSameOrigin(request,config)
    const input=validateInput(await readBody(request,8192))
    const ip=(request.headers.get('x-vercel-forwarded-for')||
      request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,64)
    const visitor=createHash('sha256').update(ip+'|'+request.headers.get('user-agent')).digest('hex')
    await consumeRate(config,{op:'public-specialist-secretary',visitor},25,60)
    let practitioner=null
    if(config){
      try{practitioner=await createPractitionerRepository(config).getPublicPractitioner(input.slug,input.locale)}
      catch{ /* The owner's already-published introductory facts remain readable. */ }
    }
    const facts=publicSpecialistFacts({slug:input.slug,locale:input.locale,practitioner})
    if(!facts)throw new AppError('SPECIALIST_UNAVAILABLE',404)
    const answer=answerSpecialistQuestion({facts,message:input.message,history:input.history})
    if(!answer)throw new AppError('INVALID_SECRETARY_INPUT',400)
    return NextResponse.json(answer,{headers:PRIVATE_HEADERS})
  }catch(error){
    const safe=safeError(error)
    return NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS})
  }
}
