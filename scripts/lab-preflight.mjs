#!/usr/bin/env node
// Safe offline diagnostic. Does not access secrets, network, GitHub or Vercel.
import {readFile} from 'node:fs/promises';
import {evaluateLabRelease} from './lab-policy.mjs';
const config=JSON.parse(await readFile(new URL('../ops/vercel.lab.json',import.meta.url),'utf8'));
const checks={
  'separate_lab_config':config.ignoreCommand==='exit 1' && config.git?.deploymentEnabled?.['**']===false,
  'no_automatic_git_deploy':config.git?.deploymentEnabled?.['**']===false,
  'no_production_target':true,
  'central_lease_implemented':false,
  'isolated_database_verified':false,
  'external_side_effects_disabled_in_application':false,
  'billing_cost_guard_verified':false,
};
const policy=evaluateLabRelease({now:Date.now(),history:[],sha:'0'.repeat(40),budget:'unverified',isolation:'unverified',lease:'unverified',target:'preview',projectId:'prj_bjwATbHF61gzEhfsrNe54lEnvJZw'});
const ready=Object.values(checks).every(Boolean) && policy==='allowed';
console.log(JSON.stringify({project:'holistichouse-lab',ready,checks,policy,action:ready?'eligible-for-controlled-preview':'do-not-deploy'},null,2));
if(!ready)process.exitCode=2;
