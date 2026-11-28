// Test-only local TLS/HTTP2 transport. Never imported by the deployed app.
// Both production-mode Next servers run behind identical transparent proxies.
import { createSecureServer } from 'node:http2';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const [keyFile, certFile] = process.argv.slice(2);
assert.ok(keyFile && certFile, 'Expected temporary loopback certificate and key');
const tls = { key: readFileSync(keyFile), cert: readFileSync(certFile) };
const hop = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'http2-settings', 'te', 'trailer']);
const clean = fields => Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith(':') && !hop.has(k.toLowerCase())));
const servers = [];
for (const [external, internal] of [[3498,3398],[3499,3399]]) {
  const server = createSecureServer({...tls, allowHTTP1: false});
  server.on('stream', (stream, fields) => {
    const authority = '127.0.0.1:' + external;
    const method = fields[':method'], path = fields[':path'];
    if (fields[':authority'] !== authority || !['GET','HEAD'].includes(method) ||
        typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
      stream.respond({':status':400}); stream.end(); return;
    }
    const headers = {...clean(fields), host: authority, 'x-forwarded-host': authority,
      'x-forwarded-proto':'https', 'x-forwarded-port':String(external)};
    delete headers.forwarded;
    const upstream = request({hostname:'127.0.0.1',port:internal,path,method,headers}, response => {
      response.on('error', () => stream.destroy());
      if (stream.destroyed) { response.destroy(); return; }
      const output = clean(response.headers);
      // Preserve original CSP, compression, cache policy and every body byte.
      stream.respond({':status':response.statusCode,...output});
      response.pipe(stream);
    });
    upstream.on('error', () => {
      if (stream.destroyed) return;
      if (stream.headersSent) stream.destroy();
      else { stream.respond({':status':502}); stream.end(); }
    });
    stream.on('error', () => upstream.destroy());
    stream.on('close', () => upstream.destroy());
    upstream.end();
  });
  server.on('error', error => { console.error(error); process.exitCode=1; for (const item of servers) item.close(); });
  await new Promise((resolve,reject) => {
    server.once('error',reject); server.listen(external,'127.0.0.1',resolve);
  });
  servers.push(server);
  console.log('Local HTTPS/h2 audit proxy ready: '+external+' -> '+internal);
}
