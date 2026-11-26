import test from 'node:test'
import assert from 'node:assert/strict'
import {integrateLukasPanel} from '../scripts/prepare-lukas-video-access-panel.mjs'
const fixture=`import MessengerSignIn from "@/components/app/messenger-sign-in";
const voiceRequiresRecorded=true;const composerRef={};
function beginMessengerVoice(){};lukasRef.current?.stop();setVoicePermissionOpen(true);
    <div ref={threadRef} className={styles.thread} role="log" aria-live="polite"`
test('inline panel uses the canonical voice and consent paths and retains existing thread',()=>{const out=integrateLukasPanel(fixture);assert.match(out,/NEXT_PUBLIC_HH_LUKAS_VIDEO_ACCESS_UI==="true"/);assert.match(out,/lukasRef\.current\?\.stop\(\);if\(voice\.conversing\)return/);assert.match(out,/beginMessengerVoice\(\);else setVoicePermissionOpen\(true\)/);assert.match(out,/composerRef\.current\?\.focus/);assert.match(out,/<div ref=\{threadRef\}/);assert.equal(integrateLukasPanel(out),out)})
test('patch refuses host drift and partial edits',()=>{assert.throws(()=>integrateLukasPanel(fixture.replace('function beginMessengerVoice()','function beginOtherVoice()')),/HOST_CONTRACT_CHANGED/);assert.throws(()=>integrateLukasPanel(fixture+'\nNEXT_PUBLIC_HH_LUKAS_VIDEO_ACCESS_UI'),/PARTIAL_PANEL_INTEGRATION/)})
