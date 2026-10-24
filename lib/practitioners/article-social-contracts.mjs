import {AppError} from '../assessments/contracts.js'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateArticleSocialComment(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(key=>!['articleId','operationId','displayName','body','consent'].includes(key)))
   throw new AppError('INVALID_COMMENT',400)
 if(!UUID.test(input.articleId||'')||!UUID.test(input.operationId||'')||input.consent!==true)
   throw new AppError('INVALID_COMMENT',400)
 if(typeof input.displayName!=='string'||typeof input.body!=='string')
   throw new AppError('INVALID_COMMENT',400)
 const displayName=input.displayName.trim().replace(/\s+/g,' ')
 const body=input.body.trim()
 if(displayName.length<2||displayName.length>60||body.length<5||body.length>800||
   /[\u0000-\u001f\u007f<>]/.test(displayName)||
   /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)||
   /https?:\/\/|www\.|@\S+\.\S+/i.test(body))
   throw new AppError('INVALID_COMMENT',400)
 return {
   articleId:input.articleId.toLowerCase(),operationId:input.operationId.toLowerCase(),
   displayName,body,
 }
}
