import {NextResponse} from 'next/server'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {consumeRate} from '@/lib/app/database'
import {createDaybookJournalRepository} from '@/lib/app/daybook-journal'
import {createJournalHandler} from '@/lib/app/daybook-journal-handler.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
const handle=createJournalHandler({getConfig:getAppConfig,origin:requestOrigin,sameOrigin:requireSameOrigin,
 auth:createRequestAuth,rate:consumeRate,repository:createDaybookJournalRepository,
 json:(body,options)=>NextResponse.json(body,options)})
export const GET=handle
export const POST=handle
export const PATCH=handle
export const DELETE=handle
