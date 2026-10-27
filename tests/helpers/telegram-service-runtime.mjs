// Test-only dependency injection. Production function bodies are evaluated verbatim;
// imports must match this explicit module allowlist. No database/provider module loads.
import { readFileSync } from 'node:fs'
import * as crypto from 'node:crypto'
import * as contracts from '../../lib/assessments/contracts.js'
import * as input from '../../lib/practitioners/public-service-enquiry-input.mjs'
import * as cipher from '../../lib/app/crypto.js'
import * as privacy from '../../lib/practitioners/relay-privacy.mjs'
import * as serviceContracts from '../../lib/practitioners/contracts.js'
import * as link from '../../lib/practitioners/telegram-service-link.mjs'
import * as policy from '../../lib/crm/messenger-policy.js'
import * as diagnostic from '../../lib/crm/telegram-diagnostic.mjs'
import * as diagnosticV2 from '../../lib/crm/telegram-diagnostic-v2.mjs'
import * as inline from '../../lib/crm/telegram-inline-buttons.mjs'
import * as pagination from '../../lib/crm/messenger-pagination.js'
import * as pilot from '../../lib/crm/telegram-second-pilot.mjs'
import { PRACTITIONER_ID } from '../../data/app-services.js'
export { cipher }
export const A='a0000000-0000-4000-8000-000000000001', B='b0000000-0000-4000-8000-000000000002'
export const PA='a1000000-0000-4000-8000-000000000001', PB='b1000000-0000-4000-8000-000000000002'
export const OA='a2000000-0000-4000-8000-000000000001', OB='b2000000-0000-4000-8000-000000000002'
export const config={test:true,encryptionKey:Buffer.alloc(32,41),encryptionKeyId:'synthetic'}
export function request(serviceOfferingId=OB,patch={}) { return {
 operationId:crypto.randomUUID(),serviceOfferingId,serviceTitle:'Untrusted display title',
 description:'A synthetic scheduling request only.',sourcePath:'/en/services/telegram-request',locale:'en',
 contact:{displayName:'Synthetic visitor',email:'visitor@example.invalid',phone:''},contactConsent:true,...patch,
} }
function evaluate(path, modules, exports) {
 const names={}, source=readFileSync(new URL('../../'+path,import.meta.url),'utf8')
 let count=0
 const body=source.replace(/^import 'server-only'\s*$/m,'').replace(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'\s*$/gm,(_,raw,key)=>{
  if(!Object.hasOwn(modules,key))throw new Error('UNAPPROVED_TEST_IMPORT '+key)
  for(const name of raw.split(',').map(x=>x.trim())){
   const [imported,local=imported]=name.split(/\s+as\s+/)
   if(!Object.hasOwn(modules[key],imported))throw new Error('MISSING_TEST_IMPORT '+name)
   names[local]=modules[key][imported]
  }
  count++;return ''
 }).replace(/^export (?=(?:async )?function|const )/gm,'')
 if(/^import\b|^export\b/m.test(body)||!count)throw new Error('UNSUPPORTED_TEST_MODULE '+path)
 return Function(...Object.keys(names),'"use strict";\n'+body+'\nreturn {'+exports.join(',')+'};')(...Object.values(names))
}
export function runtime({transaction,databasePool,crmEnabled=()=>true}) {
 const offerings=evaluate('lib/practitioners/telegram-service-offering.js',{
  '../app/database.js':{transaction},'./contracts.js':serviceContracts,
 },['findPublishedTelegramOffering','publishedTelegramOffering'])
 const enquiry=evaluate('lib/practitioners/public-service-enquiry.js',{
  'node:crypto':crypto,'../assessments/contracts.js':contracts,'../app/database.js':{transaction},
  '../app/crypto.js':cipher,'../../data/app-services.js':{PRACTITIONER_ID},
  './telegram-service-offering.js':offerings,'./public-service-enquiry-input.mjs':input,
  '../crm/repository.js':{crmEnabled},'./relay-privacy.mjs':privacy,
 },['createPublicServiceEnquiry','listPublicServiceEnquiries','updatePublicServiceEnquiry'])
 const messengerHashes=evaluate('lib/crm/messenger-store.js',{
  'node:crypto':crypto,'../app/crypto.js':cipher,'../assessments/contracts.js':contracts,
  './messenger-policy.js':policy,'./messenger-pagination.js':pagination,'./telegram-second-pilot.mjs':pilot,
 },['businessHash','providerMessageHash'])
 const webhook=evaluate('lib/crm/messenger-webhook.js',{
  'node:crypto':crypto,'../app/database.js':{databasePool},'../app/crypto.js':cipher,
  './messenger-store.js':messengerHashes,'./messenger-policy.js':policy,
  '../assessments/contracts.js':contracts,'./telegram-diagnostic.mjs':diagnostic,
  './telegram-second-pilot.mjs':pilot,'./telegram-diagnostic-v2.mjs':diagnosticV2,
  './telegram-inline-buttons.mjs':inline,'../practitioners/telegram-service-link.mjs':link,
  '../practitioners/telegram-service-offering.js':offerings,
 },['processTelegramDiagnostic'])
 return {...enquiry,...webhook,...offerings}
}
