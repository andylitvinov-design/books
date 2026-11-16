#!/usr/bin/env node
// Read-only audit: does not change publication flags or upload to YouTube.
import {readFileSync} from "node:fs";
import {curationAudit} from "../lib/video-discovery/curation.mjs";
const source=new URL("../data/academy/meditation-catalog-candidates-20261028.json",import.meta.url);
const catalog=JSON.parse(readFileSync(source,"utf8"));
const rows=Array.isArray(catalog.videos)?catalog.videos:[];
const audited=curationAudit(rows);
process.stdout.write(JSON.stringify({
 source:"2026-10-28 archived proposals, NOT current production database",
 total:rows.length,...audited,
 publicationPolicy:"Candidates remain quarantined until metadata, rights, embed, content and owner review.",
},null,2)+"\n");
