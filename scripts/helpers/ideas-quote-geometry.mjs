// Read-only native layout evidence. This callback is serialized into the page;
// keep it self-contained and return numbers/fixed categories, never text or URLs.
export function measureIdeasOrderedLayout(root, names) {
  const number = value => Number.isFinite(value) ? value : null;
  const bounds = node => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { top: number(r.top + window.scrollY), bottom: number(r.bottom + window.scrollY),
      left: number(r.left), right: number(r.right), width: number(r.width), height: number(r.height) };
  };
  const box = node => {
    if (!node) return null;
    const css = getComputedStyle(node);
    return { ...bounds(node), paddingLeft: number(parseFloat(css.paddingLeft)), paddingRight: number(parseFloat(css.paddingRight)),
      borderLeft: number(parseFloat(css.borderLeftWidth)), borderRight: number(parseFloat(css.borderRightWidth)),
      marginLeft: number(parseFloat(css.marginLeft)), marginRight: number(parseFloat(css.marginRight)),
      clientWidth: number(node.clientWidth), scrollWidth: number(node.scrollWidth),
      untransformed: css.transform === "none", blockMetrics: css.display !== "inline" };
  };
  // Derive the named hierarchy from the actual preview/result, not from a quote
  // row that could shrink together with its immediate wrapper.
  const section = root.querySelector("[data-ideas-aphorisms]");
  const list = section?.querySelector(":scope > ol");
  const rows = list ? [...list.children] : [];
  const temple = root.parentElement;
  const detail = temple?.parentElement;
  const hub = detail?.parentElement;
  const ideas = hub?.parentElement;
  const shell = ideas?.parentElement;
  const shellKind = shell?.matches("main.catalog-shell") ? "catalog" :
    shell?.matches("main.homeopathy-shell.remedies-landing") ? "spanish" : "other";
  const stage = root.matches("[data-ideas-preview]") ? "preview" :
    root.matches('[data-ideas-result="dao"]') ? "result" : "other";
  const hierarchy = Boolean(stage !== "other" && section?.parentElement === root && list?.parentElement === section &&
    root.querySelectorAll("[data-ideas-aphorisms]").length === 1 &&
    temple?.matches("[data-tests-coaching-temple]") && detail?.matches("#tests-coaching-detail") &&
    hub?.matches("[data-tests-coaching-hub]") && ideas?.matches("[data-ideas-discovery]") && shellKind !== "other" &&
    new Set([root, section, list, temple, detail, hub, ideas, shell, ...rows]).size === 8 + rows.length &&
    rows.every(row => row.matches("li[data-ideas-aphorism-id]")));
  const textGeometry = row => [...row.querySelectorAll("div,p,a,span")].filter(node => node.getClientRects().length > 0).map(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return { box: box(node), lines: [...range.getClientRects()].map(r => ({ left: number(r.left), right: number(r.right) })) };
  });
  return {
    rows: rows.slice(0, 3).map(bounds), middle: bounds(root.querySelector(names.middle)), after: bounds(root.querySelector(names.after)),
    quotes: { hierarchy, stage, shellKind, count: rows.length, viewport: number(window.innerWidth),
      layers: { shell: box(shell), ideas: box(ideas), hub: box(hub), detail: box(detail), temple: box(temple),
        result: box(root), section: box(section), list: box(list) },
      rows: rows.map(row => ({ box: box(row), text: textGeometry(row) })) },
  };
}

// Pure predicate: use independent parent content edges AND source-backed inset
// budgets. A narrow wrapper cannot redefine "full width" to make itself pass.
export function ideasQuoteGeometryProblems(layout, { locale, width }) {
  const failures = [];
  const fail = code => { if (!failures.includes(code)) failures.push(code); };
  const q = layout?.quotes;
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) <= 2;
  const validBox = b => b && ["left", "right", "width", "height", "top", "bottom", "paddingLeft", "paddingRight",
    "borderLeft", "borderRight", "marginLeft", "marginRight", "clientWidth", "scrollWidth"].every(key => finite(b[key])) &&
    b.width > 0 && b.height > 0 && close(b.right - b.left, b.width);
  const content = b => ({ left: b.left + b.borderLeft + b.paddingLeft, right: b.right - b.borderRight - b.paddingRight });
  const fills = (child, parent, margin = 0) => {
    const c = content(parent);
    return close(child.left, c.left + margin) && close(child.right, c.right - margin);
  };
  const inset = (b, padding, border, margin = 0) =>
    [b.paddingLeft, b.paddingRight].every(n => n >= 0 && n <= padding + .01) &&
    [b.borderLeft, b.borderRight].every(n => n >= 0 && n <= border + .01) &&
    [b.marginLeft, b.marginRight].every(n => Math.abs(n - margin) <= .01);
  const noOverflow = b => b.clientWidth > 0 && b.scrollWidth <= b.clientWidth + 1;
  if (!["en", "ru", "es"].includes(locale) || ![320, 375, 390, 430].includes(width)) fail("unsupported-case");
  if (!q?.hierarchy || !["preview", "result"].includes(q?.stage) ||
      q?.shellKind !== (locale === "es" ? "spanish" : "catalog")) fail("wrong-container");
  if (q?.viewport !== width) fail("wrong-viewport");
  if (q?.count !== 3 || q?.rows?.length !== 3 || layout?.rows?.length !== 3) fail("three-rows");
  const compact = width <= 360;
  const budgets = { shell: [locale === "es" ? 20 : 10, 0], ideas: [compact ? 5 : 7, 1], hub: [0, 0],
    detail: [14, 1], temple: [0, 0], result: [compact ? 2 : 7, 1, compact ? -6 : 0],
    section: [compact ? 4 : 6, 1], list: [0, 0] };
  const layers = q?.layers;
  if (!layers || !Object.keys(budgets).every(name => validBox(layers[name]))) {
    fail("missing-layer-geometry");
    return failures;
  }
  for (const [name, budget] of Object.entries(budgets)) {
    if (!inset(layers[name], ...budget)) fail(name + "-inset-budget");
    if (!layers[name].untransformed) fail(name + "-transform");
  }
  if (!close(layers.shell.left, 0) || !close(layers.shell.right, width)) fail("shell-width");
  const chain = ["shell", "ideas", "hub", "detail", "temple", "result", "section", "list"];
  for (let i = 1; i < chain.length; i++) {
    const name = chain[i];
    if (!fills(layers[name], layers[chain[i - 1]], budgets[name][2] || 0)) fail(name + "-content-width");
  }
  for (const name of ["section", "list"]) if (!noOverflow(layers[name])) fail(name + "-overflow");
  for (const row of q?.rows || []) {
    const b = row?.box;
    if (!validBox(b)) { fail("missing-row-geometry"); continue; }
    if (!inset(b, compact ? 9 : 10, 1)) fail("row-inset-budget");
    if (!b.untransformed || !fills(b, layers.list)) fail("row-content-width");
    if (!noOverflow(b)) fail("row-overflow");
    if (!Array.isArray(row.text) || row.text.length === 0) fail("missing-text-geometry");
    const edges = content(b);
    for (const text of row.text || []) {
      if (!validBox(text?.box) || !text.box.untransformed) { fail("missing-text-geometry"); continue; }
      if (text.box.blockMetrics && !noOverflow(text.box)) fail("text-overflow");
      if (!Array.isArray(text.lines) || text.lines.length === 0) fail("missing-line-geometry");
      for (const line of text.lines || []) {
        if (!finite(line?.left) || !finite(line?.right) || line.left < edges.left - 2 || line.right > edges.right + 2)
          fail("text-line-overflow");
      }
    }
  }
  const order = [...(layout?.rows || []), layout?.middle, layout?.after];
  if (order.length !== 5 || order.some(b => !b || !finite(b.top) || !finite(b.bottom) || b.bottom <= b.top) ||
    order.some((b, i) => i > 0 && (b.top <= order[i - 1].top || b.top < order[i - 1].bottom - 2))) fail("vertical-order");
  return failures;
}
