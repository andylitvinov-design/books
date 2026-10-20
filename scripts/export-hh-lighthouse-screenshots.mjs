// Read Lighthouse final-screenshot audit output; never visit private/client pages.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const views=['mobile','desktop','services-mobile','remedy-mobile'];
let saved=0;
for (const view of views) {
  const source='artifacts/lighthouse-'+view+'.json';
  if (!existsSync(source)) throw new Error('Missing Lighthouse report: '+source);
  const data=JSON.parse(readFileSync(source,'utf8'));
  const shot=data.audits?.['final-screenshot']?.details?.data;
  if (typeof shot!=='string') { console.warn('No screenshot embedded:',view); continue; }
  const match=shot.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) { console.warn('Unexpected Lighthouse screenshot encoding:',view); continue; }
  const ext=match[1]==='jpeg'?'jpg':'png';
  const target='artifacts/lighthouse-'+view+'.'+ext;
  writeFileSync(target,Buffer.from(match[2],'base64'));
  saved++;
  console.log('Saved',target,'for',data.finalUrl);
}
if (saved<1) console.warn('Lighthouse version returned no final screenshots; performance reports remain available.');
