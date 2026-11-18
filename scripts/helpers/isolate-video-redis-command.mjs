/**
 * Read-only isolated test policy. Not bundled into the production web app.
 * The site-video namespace is verified against disposable real Redis.
 * Optional YouTube reads return a missing value, not a connection error.
 */
const SITE='holistic-house:site-videos:v1';
const AUX=new Set([
 'holistic-house:youtube:phone-channels:v1',
 'holistic-house:youtube:heygen-en:completed:v1'
]);
export function classifyIsolatedVideoRedisCommand(command){
 if(!Array.isArray(command)||!['HGET','HGETALL','EVAL'].includes(command[0]))
  return 'deny';
 const key=command[command[0]==='EVAL'?3:1];
 if(key===SITE)return 'site-redis';
 if(command[0]==='HGET'&&command.length===3&&
   typeof command[2]==='string'&&command[2].length<=128&&AUX.has(key))
  return 'synthetic-missing';
 return 'deny';
}
