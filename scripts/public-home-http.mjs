import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';

// Node fetch always sends Sec-Fetch-Mode: cors. A document-navigation
// fixture needs raw HTTP so it exercises the actual anonymous cache gate,
// not the deliberate fetch/RSC bypass. No redirect or cookie jar is used.
export function requestHomeDocument(url, { headers = {}, method = 'GET' } = {}) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Expected an HTTP document');
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(target, {
      method, signal: AbortSignal.timeout(20000),
      headers: { accept: 'text/html', 'accept-encoding': 'identity',
        'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', ...headers },
    }, res => {
      const chunks = [];
      let length = 0;
      res.on('error', reject);
      res.on('data', chunk => {
        length += chunk.length;
        if (length > 2_000_000) { res.destroy(new Error('Homepage response exceeded 2 MB')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => {
        try {
          const fields = new Headers();
          for (let i = 0; i < res.rawHeaders.length; i += 2) fields.append(res.rawHeaders[i], res.rawHeaders[i+1]);
          const wire = Buffer.concat(chunks);
          const encoding = fields.get('content-encoding');
          if (encoding && !['identity', 'gzip', 'br'].includes(encoding)) throw new Error('Unexpected content encoding: '+encoding);
          const body = method === 'HEAD' ? Buffer.alloc(0) : encoding === 'gzip' ? gunzipSync(wire,{maxOutputLength:2_000_000}) :
            encoding === 'br' ? brotliDecompressSync(wire,{maxOutputLength:2_000_000}) : wire;
          resolve({ status: res.statusCode, headers: fields, wireBytes: wire.length,
            text: async () => body.toString('utf8'), arrayBuffer: async () => body });
        } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
