// Exact-head, fail-closed routing: edits limited to CI orchestration do not trigger
// another expensive Alchemy Next build and 16-viewport browser matrix.
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const CI_ONLY = new Set([
  '.github/workflows/hh-alchemy-mobile-acceptance.yml',
  '.github/workflows/hh-growth-studio.yml',
  '.github/workflows/hh-messages-wellness-v2.yml',
  '.github/workflows/practice-google-browser.yml',
  '.github/workflows/practice-visual-browser.yml',
  'scripts/ci-alchemy-impact.mjs',
  'tests/ci-alchemy-impact.test.mjs',
  'tests/pr-fast-lane.test.mjs',
]);

export function needsAlchemyBrowser(files) {
  return !Array.isArray(files) || files.length === 0 || files.some(file =>
    !file || !CI_ONLY.has(file.filename) || !['modified','added'].includes(file.status)
  );
}

async function githubJson(url, token) {
  const result = await fetch(url, {
    headers: {Accept:'application/vnd.github+json', Authorization:'Bearer '+token},
    signal: AbortSignal.timeout(10000),
  });
  if (!result.ok) throw Error('GitHub query failed: '+result.status);
  return result.json();
}

export async function main(env = process.env) {
  let required = true; // unknown inputs always retain the real browser
  try {
    if (env.GITHUB_EVENT_NAME === 'pull_request') {
      const repository = env.GITHUB_REPOSITORY || '';
      const num = Number(env.HH_PR_NUMBER);
      const sha = env.HH_HEAD_SHA || '';
      const token = env.GITHUB_TOKEN || '';
      if (!/^[\w.-]+\/[\w.-]+$/.test(repository) ||
          !Number.isInteger(num) || num < 1 || !/^[a-f0-9]{40}$/.test(sha) || !token) {
        throw Error('Unverified PR identity');
      }
      const root = 'https://api.github.com/repos/'+repository+'/pulls/'+num;
      const pr = await githubJson(root,token);
      if (pr.head?.sha !== sha || pr.base?.ref !== 'codex/public-book-library' ||
          pr.head?.repo?.full_name !== repository || pr.state !== 'open' || pr.draft) {
        throw Error('PR exact-head identity mismatch');
      }
      const files=[];
      for (let page=1;page<=30;page++) {
        const part = await githubJson(root+'/files?per_page=100&page='+page,token);
        if (!Array.isArray(part)) throw Error('Invalid PR files');
        files.push(...part);
        if (files.length > 2999) throw Error('PR too large');
        if (part.length < 100) break;
        if (page === 30) throw Error('Incomplete pagination');
      }
      required = needsAlchemyBrowser(files);
      console.log('Alchemy exact-head scope:',files.length,'files; real browser:',required);
    }
  } catch (e) {
    console.warn('Alchemy scope uncertain; retaining browser:',String(e.message||e));
    required = true;
  }
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT,'browser='+required+'\n');
  return required;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
