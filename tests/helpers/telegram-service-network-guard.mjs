// Test-process egress guard: only the exact explicitly opted-in loopback PG socket.
// No provider/HTTP/DNS/subprocess request can be issued by either acceptance step.
import {syncBuiltinESMExports} from 'node:module'
import http from 'node:http'
import https from 'node:https'
import http2 from 'node:http2'
import net from 'node:net'
import tls from 'node:tls'
import dgram from 'node:dgram'
import dns from 'node:dns'
import dnsPromises from 'node:dns/promises'
import childProcess from 'node:child_process'
import {assertTelegramIsolationEnvironment} from './telegram-service-isolation-guard.mjs'
const denied=()=>{throw new Error('SYNTHETIC_ACCEPTANCE_EGRESS_DENIED')}
const connect=net.Socket.prototype.connect
net.Socket.prototype.connect=function(...args){
 assertTelegramIsolationEnvironment()
 // Node internal normalized connect args are an Array carrying the options first.
 const first=Array.isArray(args[0])?args[0][0]:args[0]
 const options=first&&typeof first==='object'?first:{port:first,host:args[1]}
 if(options.path||options.host!=='127.0.0.1'||Number(options.port)!==5432)denied()
 return connect.apply(this,args)
}
for(const module of [http,https])for(const method of ['request','get','createServer'])module[method]=denied
for(const method of ['connect','createServer','createSecureServer'])http2[method]=denied
net.createServer=denied;tls.connect=denied;tls.createServer=denied;dgram.createSocket=denied
// Block every DNS entry point, not only A/AAAA lookups. Cover cached Resolver
// instances as well as callback, promise and newly constructed Resolver APIs.
for(const module of [dns,dnsPromises]){
 for(let prototype=module.Resolver.prototype;prototype&&prototype!==Object.prototype;prototype=Object.getPrototypeOf(prototype))
  for(const method of Object.getOwnPropertyNames(prototype))
   if(method!=='constructor'&&typeof prototype[method]==='function')prototype[method]=denied
 for(const method of Object.keys(module))if(typeof module[method]==='function'&&method!=='Resolver')module[method]=denied
 module.Resolver=class{constructor(){denied()}}
}
for(const method of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])childProcess[method]=denied
globalThis.fetch=denied
globalThis.WebSocket=class{constructor(){denied()}}
syncBuiltinESMExports()
