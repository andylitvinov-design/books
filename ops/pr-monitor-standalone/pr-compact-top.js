'use strict';
/* HH_PR_COMPACT_TOP_V1: presentation-only, no GitHub/API reads, CI or polling.
 * Rehomes the existing period-aware PR -> Merge widget rather than cloning it.
 */
(function (env) {
  function openTotal(text) {
    const match = String(text || '').replace(/[\u00a0\u202f]/g, ' ').trim()
      .match(/^всего\s+открыто\s+([\d\s]+)$/i);
    if (!match) return null;
    const raw = match[1].replace(/\s/g, '');
    const n = Number(raw);
    return /^\d+$/.test(raw) && Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  if (typeof module === 'object' && module.exports) module.exports = {openTotal};
  if (!env?.document || env.__hhPrCompactTopMounted) return;
  env.__hhPrCompactTopMounted = true;
  const doc = env.document;
  const formatter = new Intl.NumberFormat('ru-RU');
  function make(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function mount() {
    const main = doc.querySelector('main.wrap');
    const section = doc.getElementById('hh-pr-merge-speed');
    const grid = section?.querySelector('.hh-pr-speed-grid');
    const cards = grid ? Array.from(grid.children).filter(el => el.matches('article')) : [];
    if (!main || !section || cards.length !== 3) return false;

    section.classList.add('hh-compact-pr-top');
    section.setAttribute('aria-label', 'Сводка PR: создано и смержено за период, открыто сейчас');
    const median = cards[2];
    median.classList.add('hh-compact-pr-median');
    const meta = section.querySelector('.hh-pr-speed-meta');
    if (meta) meta.insertAdjacentElement('beforebegin', median);
    else section.append(median);

    const open = make('article', 'hh-pr-speed-card hh-compact-pr-open');
    open.title = 'Все незакрытые PR в репозитории на момент последнего полного снимка GitHub (все ветки)';
    const value = make('strong', '', '—');
    value.setAttribute('aria-live', 'polite');
    open.append(value, make('span', '', 'Открыто сейчас'));
    grid.append(open);

    const labels = [
      [cards[0].querySelector('span'), 'Создано'],
      [cards[1].querySelector('span'), 'Смержено'],
      [median.querySelector('span'), 'P50 до merge']
    ];
    function shortenLabels() {
      for (const [node, label] of labels) if (node && node.textContent !== label) node.textContent = label;
    }
    shortenLabels();
    new MutationObserver(shortenLabels).observe(section, {
      childList: true, characterData: true, subtree: true
    });

    function updateOpenTotal() {
      const amount = openTotal(doc.getElementById('now-total')?.textContent);
      const next = amount === null ? '—' : formatter.format(amount);
      if (value.textContent !== next) value.textContent = next;
      open.setAttribute('aria-label', 'Открыто сейчас: ' + next);
    }
    const counter = doc.getElementById('now-total');
    if (counter) {
      new MutationObserver(updateOpenTotal).observe(counter, {
        childList: true, characterData: true, subtree: true
      });
    }
    updateOpenTotal();

    // Rehome the ORIGINAL graphs without cloning SVGs, range selectors or data.
    const charts = make('section', 'hh-pr-top-graphs');
    charts.id = 'hh-pr-top-graphs';
    charts.setAttribute('aria-label', 'Графики PR: активность и задержки');
    function keepChartsNearTop() {
      const activity = doc.getElementById('hh-pr-trends');
      const latency = doc.getElementById('hh-merge-velocity');
      if (!activity && !latency) return false;
      if (charts.parentElement !== main || section.nextElementSibling !== charts) {
        main.insertBefore(charts, section.nextSibling);
      }
      if (activity && activity.parentElement !== charts) charts.appendChild(activity);
      if (latency && latency.parentElement !== charts) charts.appendChild(latency);
      return Boolean(activity && latency);
    }
    // Keep the compact KPI first, then both charts before every other panel.
    function keepFirst() {
      if (main.firstElementChild !== section) main.insertBefore(section, main.firstChild);
      keepChartsNearTop();
    }
    keepFirst();
    // The independently deployed velocity module can mount after DOMContentLoaded.
    // Observe until both real graphs exist; then stop this subtree observer.
    if (!keepChartsNearTop()) {
      const graphsWatcher = new MutationObserver(() => {
        if (keepChartsNearTop()) graphsWatcher.disconnect();
      });
      graphsWatcher.observe(main, {childList: true, subtree: true});
    }
    new MutationObserver(keepFirst).observe(main, {childList: true});
    return true;
  }
  function start() {
    if (mount()) return;
    const watch = new MutationObserver(() => {if (mount()) watch.disconnect();});
    watch.observe(doc.documentElement, {childList: true, subtree: true});
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})(typeof window === 'undefined' ? null : window);
