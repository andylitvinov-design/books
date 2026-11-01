import {createPublicKey,verify} from 'node:crypto';
// Reviewer signs canonical exact-HEAD acceptance. Only public key belongs in publisher.
// Private signing key MUST be held by independent reviewer service, never by Lab Developer.
export function acceptancePayload({featureId,headSha,baseSha,reviewerId,evidenceId,decision}={}){
 if(!/^LAB-[1-9][0-9]*$/.test(featureId||'')||!(/^[a-f0-9]{40}$/i.test(headSha||''))||!(/^[a-f0-9]{40}$/i.test(baseSha||''))||!reviewerId||!evidenceId||decision!=='LAB_ACCEPTED')throw Error('Invalid acceptance payload');
 return JSON.stringify({featureId,headSha:headSha.toLowerCase(),baseSha:baseSha.toLowerCase(),reviewerId,evidenceId,decision});
}
export function verifyAcceptance(attestation,{featureId,headSha,baseSha,authorId,publicKeyPem}={}){
 try{
  if(!attestation||!publicKeyPem||attestation.reviewerId===authorId||!attestation.signature)return false;
  const message=acceptancePayload({...attestation,featureId,headSha,baseSha});
  if(attestation.featureId!==featureId||attestation.headSha?.toLowerCase()!==headSha?.toLowerCase()||attestation.baseSha?.toLowerCase()!==baseSha?.toLowerCase())return false;
  const key=createPublicKey(publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519')return false;
  return verify(null,Buffer.from(message),key,Buffer.from(attestation.signature,'base64'));
 }catch{return false}
}
