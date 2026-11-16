import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessLocalVideoCompute,localVideoReadinessReport} from '../scripts/video-ai-gpu-readiness.mjs';

test('GPU feasibility must not imply that a model or a paid backend is connected',()=>{
  const high=assessLocalVideoCompute({
    platformName:'linux',gpuVramMiB:40960,ramGiB:64,nvidiaGpu:true});
  assert.equal(high.status,'gpu_feasibility_candidate');
  assert.equal(high.canRenderNow,false);
  assert.equal(high.comfyUiReady,false);
  const low=assessLocalVideoCompute({
    platformName:'linux',gpuVramMiB:12288,ramGiB:32,nvidiaGpu:true});
  assert.equal(low.status,'insufficient_vram_for_reference_32g_workflow');
  assert.equal(low.canRenderNow,false);
  assert.equal(assessLocalVideoCompute({
    platformName:'linux',gpuVramMiB:0,nvidiaGpu:false}).status,'no_verified_cuda_gpu');
  assert.equal(assessLocalVideoCompute({
    platformName:'darwin',ramGiB:64}).status,'requires_apple_silicon_model_compatibility_review');
  assert.equal(assessLocalVideoCompute({
    platformName:'win32',gpuVramMiB:40960,nvidiaGpu:true,ramGiB:16}).status,'check_host_ram');
});
test('read-only probe exposes honest negative model/weight/license evidence',()=>{
  const r=localVideoReadinessReport();
  assert.equal(r.schema,'hh-video-gpu-check-v1');
  assert.equal(r.verdict.canRenderNow,false);
  assert.equal(r.modelWeightsVerified,false);
  assert.equal(r.commercialLicenseVerified,false);
  assert.equal(r.comfyWorkflowVerified,false);
  assert.equal(r.generatedSampleMp4Verified,false);
  assert.ok(!JSON.stringify(r).includes('KLING_API_KEY'));
  const src=readFileSync(new URL('../scripts/video-ai-gpu-readiness.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(src,/fetch\(|https:|npm install|curl |pip install|process\.env\./);
});
