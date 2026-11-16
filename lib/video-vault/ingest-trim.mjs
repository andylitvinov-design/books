/** A pre-reviewed 119-frame 24fps cut is 4.9583s; hold <=2 final frames only. */
export function planVaultTrim(sourceSeconds, desiredSeconds, trimStartSeconds=0) {
 const source=Number(sourceSeconds),start=Number(trimStartSeconds??0);
 if(!Number.isFinite(source)||source<4.95||source>600||
    !Number.isFinite(start)||start<0||start>source-4.95)
   throw new Error('HH_VAULT_TRIM_SOURCE_UNSUITABLE');
 const available=source-start;
 const desired=desiredSeconds==null?Math.min(10,available):Number(desiredSeconds);
 if(!Number.isFinite(desired)||desired<5||desired>15||desired-available>0.055)
   throw new Error('HH_VAULT_TRIM_OUTSIDE_SOURCE');
 const inputSeconds=Math.min(available,desired);
 if(inputSeconds<4.95)throw new Error('HH_VAULT_TRIM_OUTSIDE_SOURCE');
 const outputFrames=Math.max(120,Math.round(desired*24));
 const outputSeconds=outputFrames/24;
 const holdSeconds=Math.max(0,outputSeconds-inputSeconds);
 if(holdSeconds>0.12)throw new Error('HH_VAULT_TRIM_HOLD_TOO_LONG');
 return Object.freeze({startSeconds:start,inputSeconds,outputSeconds,outputFrames,holdSeconds,
   finalFrameHoldApplied:holdSeconds>0,sourceShorterThanFiveSeconds:source<5});
}
