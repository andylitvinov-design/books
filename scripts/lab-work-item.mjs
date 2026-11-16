// Lab work items: deterministic schema validation, no external writes.
import {routeFeature} from './feature-delivery-router.mjs';
export function planLabWork(item){
 if(!item||typeof item!=='object')throw Error('Missing work item');
 if(typeof item.id!=='string'||!/^LAB-[1-9][0-9]*$/.test(item.id))throw Error('Invalid LAB id');
 if(typeof item.title!=='string'||item.title.trim().length<5)throw Error('Invalid title');
 if(typeof item.owner!=='string'||!item.owner.trim())throw Error('Owner required');
 if(typeof item.baseSha!=='string'||!/^[0-9a-f]{40}$/i.test(item.baseSha))throw Error('Exact production base SHA required');
 const decision=routeFeature(item);
 return {id:item.id,title:item.title,owner:item.owner,baseSha:item.baseSha,route:decision.lane,status:decision.status,requiresPr:decision.status==='PR_REQUIRED',labWorkspace:'workspaces/'+item.id.toLowerCase(),productionBranch:'codex/public-book-library'};
}
