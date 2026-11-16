import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction,consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {validateVaultSearchParams,listApprovedVaultRows,publicVaultSearchResult,serverVaultR2} from '@/lib/video-vault/api-service.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request){
 try{
  const app=getAppConfig()
  requestOrigin(request,app)
  const auth=createRequestAuth(request,app)
  const actor=await auth.verified()
  await consumeRate(app,'vault-search:'+actor.id,25,60)
  const criteria=validateVaultSearchParams(new URL(request.url).searchParams)
  const {r2}=serverVaultR2()
  const rows=await transaction(app,actor,db=>listApprovedVaultRows(db))
  const items=publicVaultSearchResult(rows,criteria,{
    signPoster:key=>r2.presignGet(key,{seconds:600}),
  })
  return auth.apply(NextResponse.json({items},{headers:PRIVATE_HEADERS}))
 }catch(error){
  const {status,code}=safeError(error)
  return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
 }
}
