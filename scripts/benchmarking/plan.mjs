#!/usr/bin/env node
/**
 * Offline, read-only Holistic House benchmark backlog.
 *
 * Usage:
 *   node scripts/benchmarking/plan.mjs
 *   node scripts/benchmarking/plan.mjs --json
 *
 * No browser crawling, credentials, network, external APIs, DB access, or writes.
 */
import { readFileSync } from "node:fs";
import { rankReferencePatterns } from "../../lib/benchmarking/reference-matrix.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => !["--json", "--help"].includes(arg))) {
  process.stderr.write("Usage: node scripts/benchmarking/plan.mjs [--json|--help]\n");
  process.exitCode = 2;
} else if (args.includes("--help")) {
  process.stdout.write("Show evidence-labelled public benchmark patterns. Read-only, offline. --json outputs structured rows.\n");
} else {
  try {
    const manifest = JSON.parse(readFileSync(new URL("../../data/benchmarking/reference-patterns.json", import.meta.url), "utf8"));
    const rows = rankReferencePatterns(manifest);
    if (args.includes("--json")) {
      process.stdout.write(JSON.stringify({
        schemaVersion: manifest.schemaVersion,
        measurementStatus: manifest.measurementStatus,
        ownerIssue: manifest.ownerIssue,
        sourceType: "official_docs_only",
        disclaimer: "These are product hypotheses and ordinal scores, not competitor UX measurements or verified revenue.",
        rows,
      }, null, 2) + "\n");
    } else {
      process.stdout.write("Holistic House · Benchmark-to-Product plan · OFFLINE\n");
      process.stdout.write("STATUS: public documentation references only; no competitor UI/browser/provider verification.\n");
      process.stdout.write("Priority | Score | Reference pattern | Existing HH module\n");
      process.stdout.write("---------|-------|-------------------|-------------------\n");
      for (const item of rows) {
        process.stdout.write(`${item.priority.padEnd(8)} | ${String(item.planningScore).padEnd(5)} | ${item.id} | ${item.hhModule}\n`);
      }
      process.stdout.write("\nNext: confirm supplier sandbox, then record a permitted anonymous-flow walkthrough; never import competitor assets.\n");
    }
  } catch (error) {
    process.stderr.write("Benchmark manifest invalid: " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  }
}
