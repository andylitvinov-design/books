import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { createReikiLearner, oneReikiNode, readReikiSource, reikiNodes, reikiText } from './reiki-current-component.mjs';

const ids = ['margaret', 'olga', 'litten', 'tantra-level-1'];
const authors = {
  en: [/^Margaret(?:\s*·|$)/, /^Olga(?:\s*·|$)/, /^Litten(?:\s*·|$)/, /^Tantra Reiki Level 1 learner.*anonymous/i],
  ru: [/^Маргарет(?:\s*·|$)/, /^Ольга(?:\s*·|$)/, /^Литтен(?:\s*·|$)/, /^Участница Тантра Рейки 1-й ступени.*без подписи/],
  es: [/^Margaret(?:\s*·|$)/, /^Olga(?:\s*·|$)/, /^Litten(?:\s*·|$)/, /^Participante anónima.*Nivel 1/],
};

function archivedQuotes() {
  const archive = JSON.parse(readReikiSource('data/academy/tantra-reiki-full.generated.json'));
  const translations = JSON.parse(readReikiSource('data/academy/tantra-reiki-ru-en.generated.json'));
  assert.equal(archive.mode, 'verbatim-source-archive');
  assert.deepEqual(archive.sourceUrls, {
    en: 'https://psitrends.com/studies/tantra',
    ru: 'https://psitrends.com/ru/cat-train-ru/advanced-ru/tantra-ru',
  });
  assert.equal(translations.sourceLocale, 'ru');
  assert.equal(translations.targetLocale, 'en');
  assert.equal(translations.sourceUrl, archive.sourceUrls.ru);
  return {
    en: [archive.blocks.en[89].text, archive.blocks.en[84].text.replace(/^TESTIMONIAL: OLGA\s*/, ''),
      archive.blocks.en[86].text + '\n\n' + archive.blocks.en[87].text,
      [56, 57].map(index => translations.blocks.find(block => block.sourceIndex === index).text).join('\n\n')],
    ru: [null, archive.blocks.ru.slice(61, 65).map(block => block.text).join('\n\n'), null,
      archive.blocks.ru.slice(56, 58).map(block => block.text).join('\n\n')],
  };
}

function assertQuote(text, locale, index, archive) {
  if (archive[locale][index] !== null) {
    assert.equal(text, archive[locale][index], `${locale}/${ids[index]}: complete source-backed text`);
    return;
  }
  // These two RU renderings are translations of the English originals, not
  // additional original Russian testimonials. Pin the existing complete text;
  // this is preservation evidence, not independent translation verification.
  const ruTranslationHashes = {
    margaret: '94d9d9fb42cd9bc3d32217eb8a734440ba0a1111905d4265b4efcb946050ddf8',
    litten: '92a41d145aa916975f861bff83cc6d10958633dfe1cb8eacc27816e645ea9223',
  };
  assert.equal(createHash('sha256').update(text).digest('hex'), ruTranslationHashes[ids[index]],
    `${locale}/${ids[index]}: preserve the existing complete translation`);
}

function renderLandingCards(locale, context, reviews, overrides) {
  const path = 'components/tantra-learner-review-cards.tsx';
  const source = overrides[path] ?? readReikiSource(path);
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, 'Actual shared landing cards parse');
  const element = (type, props) => ({ type, props: props || {} });
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    'next/link': { default: 'a' },
    '@/data/academy/energywork-ai-curriculum': { tantraVoices: reviews },
    './tantra-learner-review-cards.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  };
  const module = { exports: {} };
  const forbidden = () => { throw new Error('External operation forbidden in testimonial fixture'); };
  vm.runInNewContext(ts.transpileModule(source, { fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module, exports: module.exports, fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden,
    require: name => { assert.ok(Object.hasOwn(modules, name), 'Unexpected cards dependency: ' + name); return modules[name]; },
  }, { filename: path, timeout: 5000 });
  return module.exports.TantraLearnerReviewCards({ locale, context, headingId: 'synthetic-testimonial-heading' });
}

export function assertCurrentTestimonialSources(overrides = {}) {
  const archive = archivedQuotes();
  let reviews;
  for (const locale of ['en', 'ru']) {
    const fixture = createReikiLearner({ locale, slideId: 'tan-voices', overrides });
    const main = fixture.render();
    assert.equal(main.props.lang, locale, 'Course explicitly declares the displayed locale');
    const mounted = fixture.mountVoices();
    reviews = mounted.slide.testimonials;
    assert.deepEqual(Array.from(reviews, review => review.id), ids, 'Four original author identities in order');
    assert.match(mounted.slide.body.en, /Published learner experiences from the course, not this exact recording/);
    assert.equal(mounted.slide.body.ru, 'Отзывы учеников о курсе, а не об этой конкретной записи.');
    for (let index = 0; index < ids.length; index++) {
      assert.equal(reviews[index].sourcePath, 'reiki/tantra-reiki', 'Original-program source remains attached to each author');
      const tree = mounted.render();
      const quote = oneReikiNode(tree, node => Object.hasOwn(node.props, 'data-review-fulltext'), 'Rendered full review');
      assert.ok(quote.props.lang === undefined || quote.props.lang === locale, 'Quote inherits or declares the displayed locale');
      assertQuote(reikiText(quote), locale, index, archive);
      assert.match(reikiText(oneReikiNode(tree, node => node.type === 'cite', 'Rendered author')), authors[locale][index]);
      assert.equal(oneReikiNode(tree, node => node.type === 'a', 'Rendered original-program source').props.href,
        '/' + locale + '/academy/reiki/tantra-reiki');
      oneReikiNode(tree, node => Object.hasOwn(node.props, 'data-review-next'), 'Actual carousel next').props.onClick();
    }
  }
  for (const locale of ['en', 'ru', 'es']) {
    for (const context of ['tantra', 'practitioner']) {
      const tree = renderLandingCards(locale, context, reviews, overrides);
      const cards = reikiNodes(tree).filter(node => Object.hasOwn(node.props, 'data-tantra-review-id'));
      assert.deepEqual(cards.map(node => node.props['data-tantra-review-id']), ids, 'Landing preserves four authors');
      const displayLanguage = locale === 'es' ? 'en' : locale;
      for (let index = 0; index < ids.length; index++) {
        const quote = oneReikiNode(cards[index], node => node.type === 'blockquote', 'Landing full quote');
        assert.equal(quote.props.lang, displayLanguage, 'Landing declares the actual text language');
        assertQuote(reikiText(quote), displayLanguage, index, archive);
        assert.match(reikiText(oneReikiNode(cards[index], node => node.type === 'strong', 'Landing author')), authors[locale][index]);
        assert.equal(oneReikiNode(cards[index], node => node.type === 'a', 'Landing source link').props.href,
          '/' + locale + '/academy/reiki/tantra-reiki#tantra-full-source');
      }
      if (locale === 'es') assert.match(reikiText(tree), /[Ss]e muestran en inglés/, 'Spanish visitors are told that archive quotes are displayed in English');
      if (context === 'practitioner') assert.match(reikiText(tree), locale === 'en' ? /not reviews of the entire five-lesson Reiki Practitioner course/ : locale === 'ru' ? /не отзывы обо всём пятиурочном курсе/ : /no reseñas del curso completo/, 'Do not misrepresent Tantra accounts as whole-course reviews');
    }
  }
}
