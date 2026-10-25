import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import {
  assertValidReferenceMatrix,
  planningScore,
  rankReferencePatterns,
  validateReferenceMatrix,
} from "../lib/benchmarking/reference-matrix.mjs";

const manifest = JSON.parse(readFileSync(
  new URL("../data/benchmarking/reference-patterns.json", import.meta.url), "utf8",
));
const script = new URL("../scripts/benchmarking/plan.mjs", import.meta.url);
const copy = () => structuredClone(manifest);

test("reference matrix validates as evidence-labelled, source-only hypotheses", () => {
  assertValidReferenceMatrix(manifest);
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.measurementStatus, "NOT_MEASURED");
  assert.equal(manifest.patterns.length, 10);
  for (const row of manifest.patterns) {
    assert.equal(row.evidenceLevel, "docs_only", row.id);
    assert.equal(row.status, "reference_only", row.id);
    assert.equal(row.originalAssetsAllowed, false, row.id);
    assert.equal(row.copiedCodeAllowed, false, row.id);
    assert.ok(existsSync(new URL("../" + row.hhModule, import.meta.url)),
      "Existing HH target must be real: " + row.hhModule);
  }
});

test("priority sorting is deterministic and prevents cosmetic P2 work overtaking P0 revenue gates", () => {
  const ranked = rankReferencePatterns(manifest);
  assert.deepEqual(ranked.map(row => row.priority),
    [...ranked.map(row => row.priority)].sort((a, b) => a.localeCompare(b)));
  assert.ok(ranked.every(row => row.planningScore > 0));
  assert.equal(planningScore({
    estimatedImpact: 4, estimatedConfidence: 3, reversibility: 5,
    implementationEffort: 3, operationalRisk: 2,
  }), 10);
  assert.equal(rankReferencePatterns(manifest)[0].priority, "P0");
  assert.equal(new Set(ranked.map(row => row.id)).size, ranked.length);
});

test("forged observation, paid status and reused competitor assets fail closed", () => {
  const forged = copy();
  forged.patterns[0].evidenceLevel = "hh_provider_verified";
  forged.patterns[0].status = "released";
  forged.patterns[0].originalAssetsAllowed = true;
  forged.patterns[0].copiedCodeAllowed = true;
  const problems = validateReferenceMatrix(forged).join("\n");
  assert.match(problems, /evidence manifest/);
  assert.match(problems, /linked verification evidence/);
  assert.match(problems, /copying competitor assets or code is forbidden/);
});

test("injected sources, private URLs and duplicate ids fail closed", () => {
  const bad = copy();
  bad.patterns[0].primarySource = "https://example.com/?email=visitor%40example.com";
  bad.patterns[1].primarySource = "http://localhost:3000/";
  bad.patterns[2].id = bad.patterns[0].id;
  bad.patterns[3].hhRoute = "/en/client/tests?answer=private";
  bad.patterns[4].hhModule = "../../.env";
  bad.patterns[5].note = "API_KEY=secret@example.com";
  const errors = validateReferenceMatrix(bad);
  assert.ok(errors.some(error => error.includes("source must be public HTTPS")));
  assert.ok(errors.some(error => error.includes("duplicate id")));
  assert.ok(errors.some(error => error.includes("locale-scoped")));
  assert.ok(errors.some(error => error.includes("not another repo")));
  assert.ok(errors.some(error => error.includes("potential credential")));
  assert.throws(() => assertValidReferenceMatrix(bad), /Benchmark manifest invalid/);
});

test("offline CLI returns machine-readable evidence status, not an invented competitor score", () => {
  const output = execFileSync(process.execPath, [script, "--json"], { encoding: "utf8", timeout: 5000 });
  const parsed = JSON.parse(output);
  assert.equal(parsed.measurementStatus, "NOT_MEASURED");
  assert.equal(parsed.sourceType, "official_docs_only");
  assert.equal(parsed.rows.length, manifest.patterns.length);
  assert.ok(parsed.rows.every(row => !("measuredConversionRate" in row)));
  const invalid = spawnSync(process.execPath, [script, "--crawl-anything"], {
    encoding: "utf8", timeout: 5000,
  });
  assert.equal(invalid.status, 2, invalid.stderr);
});
