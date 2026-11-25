import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const server = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/mcp/veo-lite.mjs');
const scene = {
  prompt: 'Cinematic slow sweeping shot across a tranquil hillside and mountain lake in the morning sunlight.',
  duration: 6, aspectRatio: '9:16', resolution: '1080p', generateAudio: false,
  publicContentApproved: true,
};
const request = (id, method, params) => ({ jsonrpc:'2.0', id, method, ...(params ? {params} : {}) });
function send(requests, env = {}) {
  const proc = spawnSync(process.execPath, [server], {
    input: requests.map(x => JSON.stringify(x)).join('\n') + '\n',
    encoding: 'utf8',
    timeout: 7000,
    env: {
      PATH:process.env.PATH, HOME:process.env.HOME,
      HH_VEO_PAID_ENABLED:'false',
      HH_VEO_MCP_ALLOW_SUBMIT:'false',
      HH_VEO_GCP_PROJECT_ID:'',
      HH_VEO_GCS_OUTPUT_URI:'',
      HH_VEO_SERVICE_ACCOUNT_JSON:'',
      ...env,
    },
  });
  assert.equal(proc.status,0,proc.stderr || proc.error?.message);
  assert.equal(proc.stderr,'');
  return proc.stdout.trim().split('\n').map(line=>JSON.parse(line));
}
test('MCP initializes and exposes exactly four safe tools',()=>{
  const messages=send([
    request(1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}),
    {jsonrpc:'2.0',method:'notifications/initialized'},
    request(2,'tools/list'),
  ]);
  assert.equal(messages.length,2);
  assert.equal(messages[0].result.protocolVersion,'2025-06-18');
  assert.equal(messages[1].result.tools.length,4);
  assert.deepEqual(messages[1].result.tools.map(x=>x.name),
    ['veo_lite_readiness','veo_lite_quote','veo_lite_generate','veo_lite_status']);
});
test('readiness and estimates work offline without provider credentials',()=>{
  const messages=send([
    request(1,'tools/call',{name:'veo_lite_readiness',arguments:{}}),
    request(2,'tools/call',{name:'veo_lite_quote',arguments:scene}),
  ]);
  const readiness=JSON.parse(messages[0].result.content[0].text);
  assert.equal(readiness.configured,false);
  assert.equal(readiness.paidGenerationEnabled,false);
  const quote=JSON.parse(messages[1].result.content[0].text);
  assert.equal(quote.estimatedUsdCents,30);
  assert.equal(quote.generateAudio,false);
  assert.equal(quote.aspectRatio,'9:16');
});
test('paid submit fails closed even if a client supplies explicit approval',()=>{
  const result=send([request(1,'tools/call',{name:'veo_lite_generate',arguments:{
    ...scene, paidApproved:true,approvedMaxUsdCents:30,
  }})]);
  assert.equal(result[0].result.isError,true);
  assert.equal(JSON.parse(result[0].result.content[0].text).error,'disabled');
});
test('gated submit also fails without credentials; status cannot fake a result',()=>{
  const result=send([
    request(1,'tools/call',{name:'veo_lite_generate',arguments:{...scene,paidApproved:true,approvedMaxUsdCents:30}}),
    request(2,'tools/call',{name:'veo_lite_status',arguments:{operationName:'projects/bad/locations/us-central1/operations/12345678'}}),
  ],{HH_VEO_PAID_ENABLED:'true',HH_VEO_MCP_ALLOW_SUBMIT:'true'});
  assert.equal(JSON.parse(result[0].result.content[0].text).error,'not_configured');
  assert.equal(JSON.parse(result[1].result.content[0].text).error,'not_configured');
});
test('silent-only validation rejects attempts to turn on audio in quote',()=>{
  const result=send([request(1,'tools/call',{name:'veo_lite_quote',arguments:{...scene,generateAudio:true}})]);
  assert.equal(result[0].result.isError,true);
  assert.equal(JSON.parse(result[0].result.content[0].text).error,'validation');
});

test('existing admin video page and project MCP settings expose the gated provider',()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const read=relative=>readFileSync(path.join(root,relative),'utf8');
  const mcp=JSON.parse(read('.vscode/mcp.json'));
  assert.deepEqual(mcp.servers['holistic-veo-lite'].args,['scripts/mcp/veo-lite.mjs']);
  assert.match(read('.codex/config.toml'),/\[mcp_servers\.holistic_veo_lite\]/);
  assert.match(read('app/admin/videos/page.tsx'),/<VeoSceneStudio/);
  const ownerActions=read('app/admin/videos/veo-actions.js');
  assert.match(ownerActions,/requireAdminRequest\(\)/);
  assert.match(ownerActions,/HH_VEO_PAID_ENABLED/);
  assert.match(ownerActions,/approvedMaxUsdCents !== quote\.estimatedUsdCents/);
  assert.match(read('lib/mandala/cinematic-production.mjs'),/veo_lite:Object\.freeze/);
});
