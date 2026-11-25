import { readPublicReleaseEvidence } from '../../../../lib/ci/public-release-evidence.mjs';

// Resolve each request against the serving deployment, not a build-time cache.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  return Response.json(readPublicReleaseEvidence(process.env), {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}
