#!/usr/bin/env node
/** Read ONLY owner-private register. No network, Drive sync, R2 PUT or cloud flags. */
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {auditPrivatePhysicalRegistry} from '../lib/video-vault/physical-variants.mjs';
const args=process.argv.slice(2);
const inArg=args.find(x=>x.startsWith('--input='));
if(!inArg||args.length!==1)throw Error(
 'Usage: node scripts/audit-video-vault-variants.mjs --input=/private/physical-registry.json');
const path=resolve(inArg.slice(8));
if(statSync(path).size>2000000)throw Error('HH_VAULT_VARIANTS_INPUT_TOO_LARGE');
const report=auditPrivatePhysicalRegistry(JSON.parse(readFileSync(path,'utf8')));
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(!report.valid)process.exitCode=1;
