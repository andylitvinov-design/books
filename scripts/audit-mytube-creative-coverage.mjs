#!/usr/bin/env node
/** Read-only, no network, model or database call. */
import {auditMyTubeCreativeCoverage} from "../lib/mandala/mytube-coverage-quality.mjs";
const result=await auditMyTubeCreativeCoverage();
process.stdout.write(JSON.stringify(result,null,2)+"\n");
if(!result.ok)process.exitCode=1;
