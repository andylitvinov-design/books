import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('private Cabinet advertises a dedicated installable Holistic House PWA',()=>{
 const manifest=JSON.parse(readFileSync('public/holistic-house-app.webmanifest','utf8'))
 const layout=readFileSync('app/[locale]/app/layout.jsx','utf8')
 const sw=readFileSync('public/sw.js','utf8')
 assert.equal(manifest.name,'Holistic House — My Course')
 assert.equal(manifest.display,'standalone')
 assert.match(layout,/holistic-house-app\.webmanifest/)
 assert.match(sw,/notificationclick/)
 assert.match(sw,/network-only/)
 assert.doesNotMatch(sw,/localStorage/)
})
