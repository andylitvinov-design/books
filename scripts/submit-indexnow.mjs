// Dry-run by default; actual send only with explicit --submit on the trusted branch.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  validateIndexNowPlan, verifyIndexNowPublicRoutes, sendIndexNow,
} from "./indexnow-client.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const conf = JSON.parse(readFileSync(path.join(root, "data/indexnow-public-urls.json"), "utf8"));
const proofPath = path.join(root, "public", conf.keyFile.slice(1));
const key = readFileSync(proofPath, "utf8");
const plan = validateIndexNowPlan(conf, key);
const submit = process.argv.includes("--submit");

if (!submit) {
  console.log("IndexNow DRY RUN (no network calls)");
  console.log(JSON.stringify({ host: plan.host, paths: plan.urlList.map(u => new URL(u).pathname), count: plan.urlList.length }));
} else {
  // The GH push event can race with the Vercel production build. Never submit
  // until the actual canonical site returns the exact new public key.
  let ready = false;
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch(plan.keyLocation, {
        redirect: "error", signal: AbortSignal.timeout(12000), cache: "no-store",
      });
      if (res.ok && (await res.text()).trim() === plan.key) {
        ready = true;
        break;
      }
    } catch {
      // A transient site response is not a reason to alter Vercel or ad settings.
    }
    if (attempt < 20) await new Promise(resolve => setTimeout(resolve, 15000));
  }
  if (!ready) throw new Error("INDEXNOW_PRODUCTION_PROOF_NOT_READY");
  const checked = await verifyIndexNowPublicRoutes(plan);
  const receipt = await sendIndexNow(plan);
  console.log("IndexNow result " + JSON.stringify({
    keyVerified: checked.keyVerified,
    verifiedPublicPages: checked.validPublicPages,
    accepted: receipt.accepted,
    httpStatus: receipt.httpStatus,
    indexingConfirmed: false,
  }));
}
