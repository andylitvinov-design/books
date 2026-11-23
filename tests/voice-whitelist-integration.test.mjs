import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {fishLanguages,FISH_PUBLIC_VOICES} from '../lib/mandala/voice-studio-fish.mjs'
import {approvedFishReference} from '../lib/mandala/voice-studio-fish-provider.mjs'

function getRoute(env){
 const source=readFileSync(new URL('../app/api/holistic-support/voice/route.js',import.meta.url),'utf8')
 const get=source.slice(source.indexOf('export async function GET()'),source.indexOf('export async function POST(')).replace('export async function GET()', 'async function GET()')
 const context={process:{env},fishLanguages,FISH_PUBLIC_VOICES,approvedFishReference,voiceStudioProviders:()=>({}),voiceStudioReady:()=>false,VOICE_STUDIO_MODEL:'x',VOICE_STUDIO_OPENROUTER_MODEL:'x',VOICE_STUDIO_OPENROUTER_FREE_MODEL:'x',PRIVATE_HEADERS:{},NextResponse:{json:value=>value}}
 return vm.runInNewContext(`${get}; GET()`,context)
}
test('public whitelist requires active free provider and individual voice rights',async()=>{
 const configured={HH_VOICE_STUDIO_FISH_ENABLED:'true',HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED:'true',HH_VOICE_STUDIO_FISH_FREE_DATA_APPROVED:'true',HH_VOICE_STUDIO_FISH_VOICE_RIGHTS_APPROVED:'true',HH_VOICE_STUDIO_FISH_API_KEY:'synthetic-test-key',HH_VOICE_STUDIO_FISH_VOICE_RU_ID:'12345678901234567890123456789012',HH_VOICE_STUDIO_FISH_ZORYA_COMMERCIAL_LICENSE_APPROVED:'true'}
 const allowed=await getRoute(configured)
 assert.ok(allowed.fishLicensedVoices.includes('fish-zorya'))
 assert.ok(!allowed.fishLicensedVoices.includes('fish-sasha'))
 assert.ok(allowed.fishLicenseHold.includes('fish-sasha'))
 assert.ok(!allowed.fishLicensedVoices.includes('fish-e1'))
 const disabled=await getRoute({...configured,HH_VOICE_STUDIO_FISH_FREE_TIER_CONFIRMED:'false'})
 assert.equal(disabled.fishLicensedVoices.length,0)
 assert.ok(disabled.fishLicenseHold.includes('fish-zorya'))
})
