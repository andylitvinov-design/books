import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {getCommerceConfig} from '../commerce/config.js'
import {createCommerceRepository} from '../commerce/repository.js'
import {clarityApprovedRepeatPrice,verifyClarityRepeatPayment} from '../coaching/clarity-repeat-payment.mjs'
// Read the canonical, provider-verified commerce order under its existing
// owner lock/RLS. This does not capture, charge or grant course access.
export async function readVerifiedClarityRepeatPayment(config,actor,orderId){
 const commerce=getCommerceConfig()
 const price=clarityApprovedRepeatPrice(process.env)
 if(!price||!commerce.configured||commerce.provider!=='paypal'||commerce.environment!==config.billingEnvironment)throw new AppError('CLARITY_PAYMENT_UNAVAILABLE',503)
 const repository=createCommerceRepository(config,commerce)
 return repository.withOwner(actor,async store=>{
  const order=await store.getServiceOrder(orderId)
  if(!order)throw new AppError('CLARITY_PAYMENT_NOT_FOUND',404)
  try{return verifyClarityRepeatPayment(order,{ownerId:actor.id,orderId,provider:commerce.provider,environment:commerce.environment,price})}
  catch(error){throw new AppError(error.message,409)}
 })
}
