// Read-only PR handoff eligibility. Actual GitHub creation belongs to the existing release agent.
export function checkPrHandoff(packet, current) {
 const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
 if (!packet || !current) return {ready:false,reason:'missing-evidence'};
 if (packet.status !== 'RELEASE_CANDIDATE') return {ready:false,reason:'not-release-candidate'};
 if (packet.targetBranch !== 'codex/public-book-library') return {ready:false,reason:'wrong-target'};
 if (!sha(packet.headSha) || !sha(packet.baseSha) || !sha(current.headSha) || !sha(current.productionSha)) return {ready:false,reason:'invalid-sha'};
 if (packet.headSha !== current.headSha) return {ready:false,reason:'head-changed'};
 if (packet.baseSha !== current.productionSha) return {ready:false,reason:'base-changed'};
 if (packet.qaPassed !== true || packet.testEvidence !== true) return {ready:false,reason:'qa-incomplete'};
 if (!Array.isArray(current.openPrs)) return {ready:false,reason:'pr-inventory-unavailable'};
 if (current.openPrs.some(pr => pr.labId === packet.id || pr.headSha === packet.headSha)) return {ready:false,reason:'existing-pr'};
 return {ready:true,reason:'handoff-to-existing-release-lane'};
}
