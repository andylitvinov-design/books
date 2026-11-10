'use strict';
const OWNER_RATE_RESERVE=100;
const JOB_RATE_RESERVE=24; // max 8 source blobs and bounded ref/tree calls
function eligible(probe,reserve){
 return probe?.ok===true && probe?.push===true &&
   Number.isSafeInteger(probe.remaining) && probe.remaining>=reserve;
}
function chooseRepairWriter({owner,job}={}){
 if(eligible(owner,OWNER_RATE_RESERVE))return 'owner';
 if(eligible(job,JOB_RATE_RESERVE))return 'job';
 throw Error('HH_REPAIR_NO_VERIFIED_WRITER_CREDENTIAL_OR_API_RATE');
}
module.exports={OWNER_RATE_RESERVE,JOB_RATE_RESERVE,eligible,chooseRepairWriter};
