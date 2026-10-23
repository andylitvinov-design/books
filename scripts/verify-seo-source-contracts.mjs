import ts from "typescript";

const parse = (source) => ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const exportedFunction = (file, name) => file.statements.find((node) =>
  ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
  (name === "default" ? node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) : node.name?.text === name));
const unwrap = (node) => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
function returnedJsx(fn) {
  const roots = [];
  function visit(node) {
    if (node !== fn && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) roots.push(unwrap(node.expression));
    ts.forEachChild(node, visit);
  }
  if (fn) visit(fn);
  return roots;
}
function tags(roots, name) {
  const found = [];
  function visit(node) {
    if (ts.isFunctionLike(node)) return;
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === name) found.push(node);
    ts.forEachChild(node, visit);
  }
  for (const root of roots) visit(root);
  return found;
}
function unconditional(node, roots) {
  for (let cursor = node; cursor && !roots.includes(cursor); cursor = cursor.parent) {
    if (ts.isConditionalExpression(cursor) || ts.isBinaryExpression(cursor) || ts.isFunctionLike(cursor)) return false;
  }
  return Boolean(node);
}

// Follow the imported component used in the exported page's returned JSX.
// Comments, strings, unused helpers and unmounted imports are not heading evidence.
// This is a source contract, not browser visibility or live indexing evidence.
export function auditSeoComponentMount({ pageSource, pageExport = "default", componentName, moduleSpecifier, props = {} }) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const page = parse(pageSource);
  check(page.parseDiagnostics.length === 0, "Invalid TSX SEO page source");
  const imported = page.statements.filter(ts.isImportDeclaration).flatMap((node) => {
    if (node.moduleSpecifier.text !== moduleSpecifier || node.importClause?.isTypeOnly) return [];
    const bindings = node.importClause?.namedBindings;
    return bindings && ts.isNamedImports(bindings) ? bindings.elements.filter((binding) =>
      !binding.isTypeOnly && (binding.propertyName?.text || binding.name.text) === componentName).map((binding) => binding.name.text) : [];
  });
  check(imported.length === 1, "Missing imported SEO heading owner: " + componentName);
  const pageReturns = returnedJsx(exportedFunction(page, pageExport));
  check(pageReturns.length === 1, "Expected one returned public page tree: " + pageExport);
  const mounts = imported.flatMap((binding) => tags(pageReturns, binding));
  check(mounts.length === 1, "Public page must mount its imported heading owner once: " + componentName);
  check(mounts.length === 1 && unconditional(mounts[0], pageReturns), "Public SEO owner must be mounted unconditionally: " + componentName);
  for (const [name, expected] of Object.entries(props)) {
    const attributes = mounts[0]?.attributes.properties || [];
    const matching = attributes.filter((node) => ts.isJsxAttribute(node) && node.name.text === name);
    const value = matching[0]?.initializer;
    const correct = typeof expected === "string"
      ? value && ts.isStringLiteral(value) && value.text === expected
      : value && ts.isJsxExpression(value) && value.expression && ts.isIdentifier(value.expression) && value.expression.text === expected.identifier;
    check(matching.length === 1 && correct && !attributes.some(ts.isJsxSpreadAttribute), "Incorrect delegated SEO prop: " + name);
  }
  return { ok: failures.length === 0, failures };
}

export function auditDelegatedSeoHeading(options) {
  const { pageSource, componentSource, pageExport = "default", componentName } = options;
  const failures = [...auditSeoComponentMount(options).failures];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const pageReturns = returnedJsx(exportedFunction(parse(pageSource), pageExport));
  check(tags(pageReturns, "h1").length === 0, "Public page must not duplicate its delegated H1");
  const component = parse(componentSource);
  check(component.parseDiagnostics.length === 0, "Invalid TSX SEO component source");
  const componentReturns = returnedJsx(exportedFunction(component, componentName));
  check(componentReturns.length === 1, "Expected one returned heading-owner tree: " + componentName);
  const headings = tags(componentReturns, "h1");
  check(headings.length === 1, "SEO heading owner must return exactly one H1: " + componentName);
  check(headings.length === 1 && unconditional(headings[0], componentReturns), "Delegated SEO H1 must be unconditional");
  const children = headings[0]?.parent?.children || [];
  check(children.some((node) => ts.isJsxText(node) ? Boolean(node.text.trim()) : ts.isJsxExpression(node) ? Boolean(node.expression) : ts.isJsxElement(node)), "Delegated SEO H1 must not be empty");
  return { ok: failures.length === 0, failures };
}
