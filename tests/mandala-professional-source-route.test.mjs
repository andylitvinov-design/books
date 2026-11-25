import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('app/[locale]/holistic-support/mandala/page.tsx','utf8');
const client=readFileSync('components/mandala-meditation-client.tsx','utf8');
test('only public service API shapes enter professional route and never raw account objects',()=>{
 assert.match(page,/createPractitionerRepository\(getAppConfig\(\)\)/);
 assert.match(page,/\.getPublicService\(query\.master,query\.service,locale\)/);
 assert.match(page,/toPublishedProfessionalSource\(detail,locale\)/);
 assert.match(page,/publishedSlug\(query\?\.master\) && publishedSlug\(query\?\.service\)/);
 assert.match(page,/professionalSource=\{professionalSource\}/);
 assert.doesNotMatch(page,/getOwnPractitioner|account\.tests|privateNotes|psychologyProfile/);
});
test('existing client reuses one MandalaFreeVideoStudio and carries public source only',()=>{
 assert.match(client,/professionalSource\?: MandalaProfessionalSource \| null/);
 assert.match(client,/professionalMode\?: boolean/);
 assert.match(client,/professionalSource=\{professionalSource\} professionalMode=\{professionalMode\}/);
 assert.equal((client.match(/<MandalaFreeVideoStudio\b/g)||[]).length,1);
});
