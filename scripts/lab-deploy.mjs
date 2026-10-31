#!/usr/bin/env node
// Fail-closed until centralized durable reservation, isolation and cost evidence are wired.
// This command deliberately cannot deploy merely because an agent sets environment flags.
import {evaluateLabRelease} from './lab-policy.mjs';
const project='prj_bjwATbHF61gzEhfsrNe54lEnvJZw';
const evidence={
  isolation:'unverified',
  budget:'unverified',
  lease:'unverified'
};
const reason=evaluateLabRelease({
 now:Date.now(),history:[],sha:'0'.repeat(40),target:'preview',projectId:project,...evidence
});
console.error('LAB BLOCKED: '+reason+'; shared scheduler and verified test-service isolation are not installed. See docs/operations/HOLISTIC_HOUSE_LAB_ACTIVATION.md');
process.exitCode=2;
