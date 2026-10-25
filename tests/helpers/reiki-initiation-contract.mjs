import assert from 'node:assert/strict';
import { createReikiLearner, reikiNodes, reikiText, oneReikiNode } from './reiki-current-component.mjs';

// The owner's Oct 22 chat-versus-live-session clarification supersedes the old
// "always personal" wording, not the recording-is-not-initiation boundary.
const expected = {
  en: {
    title: 'A video meditation is not an initiation',
    body: 'A recording alone is not an initiation. After all five lessons you can request a free guided initiation in chat or a separate personal session with Andrey.',
  },
  ru: {
    title: 'Видеомедитация — это ещё не инициация',
    body: 'Видеозапись сама по себе не является инициацией. После пяти уроков можно запросить инициацию с Андреем в чате или отдельную личную сессию.',
  },
};

function notePaths(tree, ancestors = []) {
  if (Array.isArray(tree)) return tree.flatMap(child => notePaths(child, ancestors));
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return [];
  const path = [...ancestors, tree];
  return [
    ...(Object.hasOwn(tree.props, 'data-reiki-personal-initiation-note') ? [path] : []),
    ...notePaths(tree.props.children, path),
  ];
}

export function assertCurrentInitiationNotes(overrides = {}) {
  for (const locale of ['en', 'ru']) {
    for (const sync of ['guest', 'ready']) {
      for (const slideId of ['tan-done', 'kun-done']) {
        const tree = createReikiLearner({ locale, slideId, sync, overrides }).render();
        const paths = notePaths(tree);
        assert.equal(paths.length, 1, `${locale}/${sync}/${slideId}: one mounted initiation note`);
        for (const node of paths[0]) {
          assert.ok(!node.props.hidden, 'Initiation note is not hidden');
          assert.ok(![true, 'true'].includes(node.props['aria-hidden']), 'Initiation note is exposed to assistive technology');
          assert.notEqual(node.props.style?.display, 'none', 'Initiation note remains displayed');
          assert.notEqual(node.props.style?.visibility, 'hidden', 'Initiation note remains visible');
        }
        const note = paths[0].at(-1);
        assert.equal(note.type, 'aside', 'Initiation note remains a separate semantic aside');
        const title = oneReikiNode(note, node => node.props.className === 'personalInitiationNoteTitle', 'Visible note heading');
        const body = oneReikiNode(note, node => node.type === 'p', 'Visible note explanation');
        assert.equal(reikiText(title), expected[locale].title, `${locale}: recording is not an initiation`);
        assert.equal(reikiText(body), expected[locale].body, `${locale}: five lessons, a request, chat guidance and separate personal session`);
      }
      for (const slideId of ['flight-done', 'ygg-done', 'end-01']) {
        const tree = createReikiLearner({ locale, slideId, sync, overrides }).render();
        assert.equal(reikiNodes(tree).filter(node => Object.hasOwn(node.props, 'data-reiki-personal-initiation-note')).length, 0,
          `${locale}/${sync}/${slideId}: targeted Tantra/Kundalini note is not moved or duplicated`);
      }
    }
  }
}
