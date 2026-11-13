// Only opaque metadata crosses the browser boundary. Dialogue state stays on
// the server and is discarded when the browser conversation is reset.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** @typedef {{id:string,revision:number}} NativeSession */
/** @typedef {{id:string|null,revision:number,turnId:string}} NativeSessionTurn */
/** @param {NativeSession|null} session @param {string} turnId @returns {NativeSessionTurn} */
export function newNativeSessionTurn(session,turnId){
 if(!uuid.test(turnId)||session&&(!uuid.test(session.id)||!Number.isSafeInteger(session.revision)||session.revision<0))throw Error('INVALID_NATIVE_SESSION');
 return {id:session?.id||null,revision:session?.revision||0,turnId};
}
/** @param {NativeSessionTurn} request @param {unknown} value @returns {NativeSession|null} */
export function acceptNativeSession(request,value){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const result=/** @type {Record<string,unknown>} */(value);
 if(Object.keys(result).some(k=>!['id','revision'].includes(k))||typeof result.id!=='string'||!uuid.test(result.id)||
    typeof result.revision!=='number'||result.revision!==request.revision+1||
    (request.id!==null&&request.id!==result.id))return null;
 return {id:result.id,revision:result.revision};
}
/** A skipped server turn invalidates the pointer rather than reviving stale context. */
/** @param {NativeSessionTurn} request @param {unknown} value @returns {NativeSession|null} */
export function advanceNativeClientSession(request,value){
 if(value==null)return null;
 const accepted=acceptNativeSession(request,value);
 if(!accepted)throw Error('INVALID_NATIVE_SESSION_RESPONSE');
 return accepted;
}
