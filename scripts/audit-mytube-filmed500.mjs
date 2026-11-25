#!/usr/bin/env node
/** Read-only physical source audit. No R2/DB/network write, paid AI or cron.
 * node scripts/audit-mytube-filmed500.mjs [--json]
 */
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import scenes from '../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import stock from '../data/video-catalog/free-stock-scenes.json' with {type:'json'};
import {localFilmed500Inventory} from '../lib/video-vault/verified-filmed-inventory.mjs';
const options=process.argv.slice(2);
if(options.some(x=>x!=='--json'))throw Error('unsupported_filmed500_option');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const verifyPhysical=(item)=>{
 const asset=resolve(root,'public'+item.video);
 if(!asset.startsWith(root+'/public/')||!existsSync(asset))return false;
 return createHash('sha256').update(readFileSync(asset)).digest('hex')===item.sha256;
};
const result=localFilmed500Inventory({scenes:scenes.scenes,stock,verifyPhysical});
console.log(JSON.stringify(result,null,2));
