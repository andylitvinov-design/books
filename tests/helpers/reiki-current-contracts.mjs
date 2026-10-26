import assert from 'node:assert/strict';
import postcss from 'postcss';
import { energyworkSequence } from '../../data/academy/energywork-ai-schema.js';
import { createReikiLearner, oneReikiNode, readReikiSource, reikiNodes, reikiText, renderEnergyworkLanding } from './reiki-current-component.mjs';

const own = (node, key) => Object.hasOwn(node.props, key);
const nextButton = tree => oneReikiNode(tree, node => node.type === 'button' && own(node, 'data-energywork-next'), 'One course Next button');

export function assertCurrentSaveStatus(overrides = {}) {
  for (const locale of ['en', 'ru']) {
    for (const sync of ['guest', 'consent', 'ready']) {
      const fixture = createReikiLearner({ locale, sync, overrides });
      const tree = fixture.render();
      const status = oneReikiNode(tree, node => own(node, 'data-reiki-private-save-status'), 'One private save status');
      assert.equal(status.props['aria-live'], 'polite');
      const siblings = tree.props.children.props.children.flat(Infinity).filter(node => node && typeof node === 'object');
      const slideIndex = siblings.findIndex(node => own(node, 'data-energywork-slide-id'));
      const progressIndex = siblings.findIndex(node => node.props.className === 'progressFooter');
      const footerIndex = siblings.findIndex(node => node.type === 'footer');
      assert.ok(slideIndex >= 0 && progressIndex > slideIndex && footerIndex > progressIndex, 'Save status stays below lesson and above navigation');
      assert.ok(reikiNodes(siblings[progressIndex]).includes(status), 'Private status belongs to bottom progress');
      if (sync === 'guest') {
        assert.match(reikiText(status), locale === 'en' ? /Guest preview.*Answers are not saved/ : /Гостевой просмотр.*Ответы не сохраняются/);
        assert.equal(reikiNodes(status).filter(node => node.type === 'input').length, 0);
      } else if (sync === 'ready') {
        assert.match(reikiText(status), locale === 'en' ? /Saved privately/ : /Сохранено приватно/);
        const cabinet = oneReikiNode(status, node => node.type === 'a', 'Saved account course destination');
        assert.equal(cabinet.props.href, '/' + locale + '/app/course?view=courses');
      } else {
        const settings = oneReikiNode(status, node => node.type === 'details', 'Optional private-save disclosure');
        assert.ok(!settings.props.open, 'Consent remains an optional disclosure');
        const checkbox = oneReikiNode(settings, node => node.type === 'input' && node.props.type === 'checkbox', 'Explicit private-save consent');
        assert.equal(checkbox.props.checked, false);
        const save = oneReikiNode(settings, node => node.type === 'button', 'Consent save button');
        assert.equal(save.props.disabled, true, 'Unchecked consent cannot save');
        assert.equal(save.props.onClick.name, 'startSaving', 'Uses the actual save handler');
        checkbox.props.onChange({ target: { checked: true } });
        const enabled = oneReikiNode(fixture.render(), node => node.type === 'button' && node.props.onClick?.name === 'startSaving', 'Consented private-save action');
        assert.equal(enabled.props.disabled, false, 'Explicit checkbox enables save');
      }
    }
    for (const sync of ['guest', 'consent']) {
      const fixture = createReikiLearner({ locale, slideId: 'flight-done', sync, overrides });
      const tree = fixture.render();
      const consent = oneReikiNode(tree, node => node.type === 'input' && own(node, 'data-reiki-first-lesson-consent'), 'First lesson explicit consent');
      assert.equal(nextButton(tree).props.disabled, true, 'First lesson save stays gated before consent');
      consent.props.onChange({ target: { checked: true } });
      assert.equal(nextButton(fixture.render()).props.disabled, false);
    }
  }
}

export function assertCurrentFinishAndVideo(overrides = {}) {
  for (const locale of ['en', 'ru']) {
    for (const slideId of ['flight-done', 'tan-done', 'kun-done', 'ygg-done']) {
      const tree = createReikiLearner({ locale, slideId, overrides }).render();
      const finish = oneReikiNode(tree, node => node.type === 'button' && own(node, 'data-reiki-tomorrow-choice'), 'Finish-for-today action');
      assert.equal(finish.props.type, 'button');
      assert.equal(finish.props.disabled, false);
      assert.equal(finish.props.onClick.name, 'finishForToday');
      assert.match(reikiText(finish), locale === 'en' ? /Finish for today/ : /Завершить на сегодня/);
      assert.notEqual(finish.props.onClick, nextButton(tree).props.onClick, 'Finishing is not continuing');
    }
    const video = createReikiLearner({ locale, slideId: 'flight-02', overrides }).mountVideo();
    const player = oneReikiNode(video, node => node.type === 'academy-video', 'Real original meditation player');
    assert.equal(player.props.youtubeId, 'HqfixazXqRY');
  }
}

export function assertCurrentReviewSurface(overrides = {}) {
  for (const locale of ['en', 'ru']) {
    const fixture = createReikiLearner({ locale, overrides });
    const main = fixture.render();
    assert.equal(main.type, 'main');
    assert.equal(main.props['data-reiki-reviews'], 'v4');
    assert.equal(main.props['data-reiki-full-reviews'], 'v1');
    assert.equal(main.props['data-reiki-current-kind'], 'voices');
    assert.notEqual(main.props.hidden, true);
    const voices = fixture.mountVoices();
    const region = oneReikiNode(voices.render(), node => own(node, 'data-review-fulltext'), 'Full review region');
    assert.equal(region.props.role, 'region');
    assert.equal(region.props.tabIndex, 0);
    assert.equal(region.props['aria-label'], locale === 'en' ? 'Full learner review' : 'Полный текст отзыва');
    assert.equal(reikiText(region), voices.slide.testimonials[0].quote[locale], 'Full current quote is rendered, not an excerpt');
  }
}

export function assertCurrentReviewGates(overrides = {}) {
  const disabled = (slideId, sync, state = {}) => nextButton(createReikiLearner({ slideId, sync, state, overrides }).render()).props.disabled;
  for (const sync of ['checking', 'unavailable']) assert.equal(disabled('flight-voices', sync), true, sync + ' blocks Next');
  assert.equal(disabled('flight-voices', 'ready', { busy: true }), true, 'Busy blocks Next');
  assert.equal(disabled('flight-voices', 'ready'), false, 'Reading example reviews has no personal-answer requirement');
  assert.equal(disabled('welcome-02', 'ready'), true, 'Experience selection is still required');
  const welcome = createReikiLearner().slides.find(slide => slide.id === 'welcome-02');
  assert.equal(disabled('welcome-02', 'ready', { answers: { 'welcome-02': welcome.question.options[0].id } }), false);
  for (const slideId of ['flight-04', 'tan-04', 'kun-04', 'ygg-04']) {
    assert.equal(disabled(slideId, 'ready', { answers: { [slideId]: 'x'.repeat(49) } }), true, slideId + ' requires 50 characters');
    assert.equal(disabled(slideId, 'ready', { answers: { [slideId]: 'x'.repeat(50) } }), false, slideId + ' permits complete feedback');
  }
  for (const slideId of ['tan-study-04', 'kun-study-v2-01', 'ygg-study-v2-01']) {
    assert.equal(disabled(slideId, 'ready'), true, slideId + ' requires a study answer');
    assert.equal(disabled(slideId, 'ready', { answers: { [slideId]: 'Synthetic study answer' } }), false);
  }
  for (const sync of ['guest', 'consent']) {
    assert.equal(disabled('flight-done', sync), true, sync + ' checkpoint requires consent');
    assert.equal(disabled('flight-done', sync, { firstLessonConsent: true }), false);
  }
}

export function assertCurrentReviewCarousel(overrides = {}) {
  for (const locale of ['en', 'ru']) {
    for (const slideId of ['flight-voices', 'tan-voices', 'kun-voices', 'ygg-voices']) {
      const fixture = createReikiLearner({ locale, slideId, overrides });
      const mounted = fixture.mountVoices();
      const entries = mounted.slide.testimonials;
      const quote = tree => oneReikiNode(tree, node => own(node, 'data-review-fulltext'), 'Review text');
      let tree = mounted.render();
      assert.equal(reikiText(quote(tree)), entries[0].quote[locale]);
      const next = oneReikiNode(tree, node => own(node, 'data-review-next'), 'Review next');
      const previous = oneReikiNode(tree, node => own(node, 'data-review-prev'), 'Review previous');
      for (const button of [next, previous]) {
        assert.equal(button.type, 'button');
        assert.equal(button.props.type, 'button');
        assert.ok(button.props['aria-label']);
        assert.equal(button.props.href, undefined);
        const icon = oneReikiNode(button, node => node.type === 'icon-ArrowLeft' || node.type === 'icon-ArrowRight', 'Narrow visual arrow');
        assert.equal(icon.props.size, 16);
      }
      next.props.onClick();
      tree = mounted.render();
      assert.equal(reikiText(quote(tree)), entries[1].quote[locale], 'Next changes the actual quote');
      previous.props.onClick();
      tree = mounted.render();
      assert.equal(reikiText(quote(tree)), entries[0].quote[locale], 'Previous restores the actual quote');
      previous.props.onClick();
      assert.equal(reikiText(quote(mounted.render())), entries.at(-1).quote[locale], 'Previous wraps correctly');
      next.props.onClick();
      assert.equal(reikiText(quote(mounted.render())), entries[0].quote[locale], 'Next wraps correctly');
      const lesson = oneReikiNode(fixture.render(), node => own(node, 'data-energywork-slide-id'), 'Same actual lesson');
      assert.equal(lesson.props['data-energywork-slide-id'], slideId, 'Review controls never navigate the course');
      const links = reikiNodes(tree).filter(node => node.type === 'a');
      if (slideId === 'tan-voices' || slideId === 'ygg-voices') {
        assert.equal(links.length, 1, 'Only the verified source-page link is shown');
        assert.equal(links[0].props.href, '/' + locale + '/academy/' + entries[0].sourcePath);
      } else assert.equal(links.length, 0, 'Anonymous examples have no fabricated links');
      assert.ok(links.every(node => !/youtube|youtu\.be|comments/i.test(String(node.props.href))), 'No review links to unsupported video comments');
    }
  }
}

export function assertCurrentReviewTapTargets(source = readReikiSource('components/energywork-ai-learner.module.css')) {
  const root = postcss.parse(source);
  const prefix = '.page[data-reiki-full-reviews="v1"][data-reiki-current-kind="voices"] .voicesControls button';
  const get = (selector, property) => {
    const found = [];
    root.walkRules(rule => {
      if (rule.selector !== selector || rule.parent.type !== 'atrule' || !/max-width:\s*760px/.test(rule.parent.params)) return;
      rule.walkDecls(property, declaration => found.push(declaration.value));
    });
    assert.ok(found.length, selector + ' ' + property);
    return found.at(-1);
  };
  assert.equal(get(prefix, 'width'), '44px', '44px mobile hit target');
  assert.equal(get(prefix, 'height'), '44px', '44px mobile hit target');
  assert.equal(get(prefix + '::before', 'inset'), '7px', 'Separate 30px visual circle');
}

export function assertCurrentEnergyworkPaths(overrides = {}) {
  for (const locale of ['en', 'ru', 'es']) {
    const tree = renderEnergyworkLanding(locale, overrides);
    assert.equal(tree.props.lang, locale);
    for (const [key, path] of [['tantra', 'tantra-reiki'], ['kundalini', 'kundalini-reiki'], ['yggdrasil', 'yggdrasil']]) {
      const card = oneReikiNode(tree, node => node.props['data-energywork-screen'] === key, 'Actual ' + key + ' card');
      const links = reikiNodes(card).filter(node => node.type === 'a').map(node => node.props.href);
      for (const suffix of ['', '/free-initiation']) assert.ok(links.includes('/' + locale + '/academy/reiki/' + path + suffix), key + ' preserves locale-specific destination');
      assert.ok(!links.some(href => typeof href === 'string' && href.startsWith('/' + (locale === 'en' ? 'ru' : 'en') + '/academy/')), 'Path links do not silently switch language');
      const capture = oneReikiNode(card, node => node.type === 'reiki-capture', 'Actual path enquiry widget');
      assert.equal(capture.props.locale, locale);
      assert.equal(capture.props.course, key);
    }
  }
}

export function assertCurrentFlightSection(overrides = {}) {
  // Independent expectations preserve both localization and the safety disclaimer.
  // Counting a title/paragraph would accept placeholder or unrelated copy instead
  // of the actual videoCopy[locale].flightTitle / flightLead bindings.
  const flightCopy = {
    en: {
      title: 'Flight to the Sun',
      lead: 'Watch Andrey’s guided meditation with the image of the sun. This is not a Reiki initiation.',
    },
    ru: {
      title: 'Полёт к Солнцу',
      lead: 'Авторская медитация Андрея с образом Солнца. Она не заменяет инициацию Рейки.',
    },
    es: {
      title: 'Vuelo hacia el Sol',
      lead: 'Meditación guiada de Andrey con el símbolo del sol. No equivale a una iniciación Reiki.',
    },
  };
  for (const locale of ['en', 'ru', 'es']) {
    const tree = renderEnergyworkLanding(locale, overrides);
    const section = oneReikiNode(tree, node => node.props.id === 'energywork-flight-to-sun', 'Actual Sun section');
    const heading = oneReikiNode(section, node => node.type === 'h2' && node.props.id === 'flight-to-sun-title', 'Single flight title');
    assert.equal(reikiText(heading), flightCopy[locale].title, locale + ' flight title uses the localized meditation title');
    const header = oneReikiNode(section, node => node.props.className === 'sectionHeader', 'Flight description block');
    const lead = oneReikiNode(header, node => node.type === 'p' && !node.props.className, 'One flight lead, independent of section order');
    assert.equal(reikiText(lead), flightCopy[locale].lead, locale + ' flight lead uses the localized meditation description and disclaimer');
    assert.equal(reikiNodes(section).filter(node => node.type === 'h3').length, 0, 'No duplicated title');
    const video = oneReikiNode(section, node => node.type === 'academy-video', 'Original flight player');
    assert.equal(video.props.youtubeId, 'HqfixazXqRY');
    const source = oneReikiNode(section, node => node.type === 'a' && node.props.href === 'https://www.youtube.com/watch?v=HqfixazXqRY', 'Original source link');
    assert.equal(source.props.rel, 'noopener noreferrer');
  }
  const path = 'data/academy/english-guided-meditations.ts';
  const source = overrides[path] ?? readReikiSource(path);
  assert.ok(source.includes('youtubeId: "HqfixazXqRY"'), 'Known original source for fallback fixture');
  const tree = renderEnergyworkLanding('en', { ...overrides, [path]: source.replace('youtubeId: "HqfixazXqRY"', 'youtubeId: null') });
  const pending = oneReikiNode(tree, node => node.props['data-video-source-pending'] === 'flight-to-sun', 'Missing video keeps poster fallback');
  const image = oneReikiNode(pending, node => node.type === 'img', 'Real poster declaration');
  assert.ok(image.props.src);
  assert.equal(image.props.fill, true);
}

export function assertCurrentReviewSequence(overrides = {}) {
  const slides = createReikiLearner({ overrides }).slides;
  const ids = Array.from(slides, slide => slide.id);
  // The private photo step is additive; never delete it to restore the old count.
  assert.equal(slides.length, 64, 'All active screens, including the private photo step');
  assert.equal(new Set(ids).size, 64, 'No duplicate slide identities');
  assert.deepEqual(ids, energyworkSequence(), 'Editorial and server-readable course order agree');
  assert.deepEqual(ids.slice(-3), ['intention-04', 'init-photo-01', 'end-02'], 'Photo follows the closing pause and precedes completion');
  for (const prefix of ['flight', 'tan', 'kun', 'ygg']) {
    const sequence = [prefix + '-02', prefix + '-voices', prefix + '-04', prefix + '-03', prefix + '-done'];
    let prior = -1;
    for (const id of sequence) {
      const current = ids.indexOf(id);
      assert.ok(current > prior, id + ' follows the video, examples and own report before closing practice');
      prior = current;
    }
    const review = slides.find(slide => slide.id === prefix + '-voices');
    assert.equal(review.kind, 'voices');
    assert.ok(review.testimonials.length >= 3);
    assert.equal(ids.indexOf(prefix + '-done'), ids.indexOf(prefix + '-03') + 1, 'Closing practice directly precedes milestone');
  }
}
