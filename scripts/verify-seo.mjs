// Read-only SEO audit; default mode uses no network, credentials or patient data.
// To verify after deployment: npm run verify:seo -- --live-base=https://holistichouse.vercel.app
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve, sep } from "node:path";
import ts from "typescript";
import { getPrioritySitemapEntries, SEO_PRIORITY_PAGE_FAMILIES } from "../data/seo-priority-paths.js";

const projectRoot = new URL("../", import.meta.url);
const origin = "https://holistichouse.vercel.app";
const publicRouteSources = [
  ["app/[locale]/about/page.tsx", /generateMetadata/, /alternates:/, /<h1/],
  ["app/[locale]/services/free-situation-review/page.tsx", /generateMetadata/, /alternates:/],
  ["app/[locale]/academy/[[...slug]]/page.tsx", /generateMetadata/, /alternates:/],
  ["components/yggdrasil-free-initiation.tsx", /<h1/],
];
const privateRouteSources = [
  "app/[locale]/app/[[...path]]/page.jsx",
  "app/[locale]/client/[selector]/page.js",
  "app/[locale]/report/[assessmentId]/page.jsx",
  "app/admin/clients/page.js",
];

// Bounded static source composition, not computed CSS, browser rendering or indexing.
// Only returned JSX and its actual locale-bound data count; comments, unused imports,
// dead/conditional heading branches and copied H1 markers cannot satisfy this check.
function auditFreeReviewComposition(read) {
  const fail = (condition, message) => assert.ok(condition, "Free review SEO: unverified source shape: " + message);
  const parse = (path) => {
    const file = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    fail(file.parseDiagnostics.length === 0, "invalid source " + path);
    return file;
  };
  const unwrap = (node) => node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) ? unwrap(node.expression) : node;
  const walk = (node) => { const result = []; const visit = (n) => { result.push(n); ts.forEachChild(n, visit); }; visit(node); return result; };
  const fn = (file, name) => {
    const matches = file.statements.filter((node) => ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      (name === "default" ? node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) : node.name?.text === name && !node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)));
    fail(matches.length === 1, "missing exported owner " + name); return matches[0];
  };
  const returned = (owner, allowGuard = false) => {
    const result = owner.body?.statements.at(-1);
    fail(result && ts.isReturnStatement(result) && result.expression, "owner must return its actual final tree");
    if (!allowGuard) {
      const returns = [];
      const visit = (node) => { if (node !== owner && ts.isFunctionLike(node)) return; if (ts.isReturnStatement(node)) returns.push(node); ts.forEachChild(node, visit); };
      visit(owner); fail(returns.length === 1, "early/unreachable owner return");
    }
    return unwrap(result.expression);
  };
  const runtimeConst = (statement) => ts.isVariableStatement(statement) && !statement.modifiers?.length && statement.declarationList.getFirstToken()?.kind === ts.SyntaxKind.ConstKeyword;
  const variable = (fileOrOwner, name) => {
    const statements = fileOrOwner.body?.statements || fileOrOwner.statements;
    const declarations = statements.filter((statement) => runtimeConst(statement)).flatMap((s) => [...s.declarationList.declarations]).filter((d) => ts.isIdentifier(d.name) && d.name.text === name);
    fail(declarations.length === 1 && declarations[0].initializer, "missing source binding " + name); return unwrap(declarations[0].initializer);
  };
  // Compare expression trees, never whitespace-merged source text. Parentheses and
  // type assertions erase no runtime expression or lexical binding.
  const expressionShape = (input) => {
    const node = unwrap(input);
    if (!node || typeof node.kind !== "number") return null;
    if (ts.isIdentifier(node)) return ["identifier", node.text];
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return ["string", node.text];
    if (ts.isNumericLiteral(node)) return ["number", node.text];
    if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return [node.kind];
    if (ts.isPropertyAccessExpression(node) && !node.questionDotToken && ts.isIdentifier(node.name)) return ["property", expressionShape(node.expression), node.name.text];
    if (ts.isElementAccessExpression(node) && !node.questionDotToken) return ["element", expressionShape(node.expression), expressionShape(node.argumentExpression)];
    if (ts.isCallExpression(node) && !node.questionDotToken && !node.typeArguments?.length) return ["call", expressionShape(node.expression), node.arguments.map(expressionShape)];
    if (ts.isPrefixUnaryExpression(node)) return ["prefix", node.operator, expressionShape(node.operand)];
    if (ts.isBinaryExpression(node)) return ["binary", node.operatorToken.kind, expressionShape(node.left), expressionShape(node.right)];
    if (ts.isConditionalExpression(node)) return ["conditional", expressionShape(node.condition), expressionShape(node.whenTrue), expressionShape(node.whenFalse)];
    if (ts.isAwaitExpression(node)) return ["await", expressionShape(node.expression)];
    return null;
  };
  const completeShape = (shape) => shape !== null && (!Array.isArray(shape) || shape.every(completeShape));
  const referenceShapes = new Map();
  const same = (node, code) => {
    if (!referenceShapes.has(code)) {
      const file = ts.createSourceFile("contract.tsx", "const expected = (" + code + ");", ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      fail(file.parseDiagnostics.length === 0, "invalid internal expression contract");
      const shape = expressionShape(file.statements[0].declarationList.declarations[0].initializer);
      fail(completeShape(shape), "unsupported internal expression contract");
      referenceShapes.set(code, JSON.stringify(shape));
    }
    const shape = expressionShape(node);
    return completeShape(shape) && JSON.stringify(shape) === referenceShapes.get(code);
  };
  // Supported direct-source grammar, deliberately not a JavaScript interpreter.
  // Binding source properties, immutable literal modules and effect-free owner
  // preparation are checked before using returned JSX as static source evidence.
  const objectFields = (node, label) => {
    fail(ts.isObjectLiteralExpression(node), label + " must be an object literal");
    const names = new Set();
    return Object.fromEntries(node.properties.map((property) => {
      fail(ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)), label + " must have explicit noncomputed fields");
      const name = property.name.text;
      fail(name !== "__proto__" && !names.has(name), label + " has duplicate/unsupported field " + name);
      names.add(name); return [name, property.initializer];
    }));
  };
  const plainBinding = (binding, names) => {
    if (!ts.isObjectBindingPattern(binding) || binding.elements.length !== names.length) return false;
    const found = binding.elements.map((element) => {
      if (element.dotDotDotToken || element.initializer || !ts.isIdentifier(element.name)) return null;
      const source = element.propertyName || element.name;
      return (ts.isIdentifier(source) || ts.isStringLiteral(source)) && source.text === element.name.text ? source.text : null;
    });
    return found.every((name) => names.includes(name)) && new Set(found).size === names.length;
  };
  const paramsOwner = (owner) => fail(owner.parameters.length === 1 && !owner.parameters[0].initializer && !owner.parameters[0].dotDotDotToken && plainBinding(owner.parameters[0].name, ["params"]), "owner must receive actual params property");
  const paramsLocale = (statement) => {
    if (!runtimeConst(statement) || statement.declarationList.declarations.length !== 1) return false;
    const declaration = statement.declarationList.declarations[0];
    return plainBinding(declaration.name, ["locale"]) && ts.isAwaitExpression(unwrap(declaration.initializer)) && same(unwrap(declaration.initializer).expression, "params");
  };
  const value = (input, scope = {}) => {
    const node = unwrap(input);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isIdentifier(node) && Object.hasOwn(scope, node.text)) return scope[node.text];
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      fail(!node.questionDotToken, "unsupported optional source property");
      const receiver = value(node.expression, scope), key = ts.isPropertyAccessExpression(node) ? node.name.text : value(node.argumentExpression, scope);
      fail(receiver !== null && typeof receiver === "object" && (typeof key === "string" || Number.isInteger(key)) && Object.hasOwn(receiver, key), "unsupported/missing own source property " + node.getText());
      return receiver[key];
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = value(node.left, scope), right = value(node.right, scope);
      fail([left, right].every((item) => typeof item === "string" || typeof item === "number" && Number.isFinite(item)), "unsupported source coercion");
      return left + right;
    }
    if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => value(item, scope));
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(Object.entries(objectFields(node, "source data")).map(([name, initializer]) => [name, value(initializer, scope)]));
    throw new Error("Free review SEO: unverified source shape: unsupported source value " + node?.getText());
  };
  const importShapes = {
    page: { "next": ["t:Metadata"], "next/navigation": ["v:notFound"], "@/components/free-entry-landing": ["v:FreeEntryLanding"], "@/data/academy/catalog": ["v:isPublicLocale"], "@/data/site-metadata": ["v:metadataBaseFor"] },
    component: { "next/image": ["d:Image"], "next/link": ["d:Link"], "lucide-react": ["v:ArrowLeft", "v:ArrowRight", "v:CheckCircle2", "v:ExternalLink", "v:ShieldCheck", "v:Sparkles"], "@/components/public-site-header": ["v:PublicSiteHeader"], "@/components/compact-lead-capture": ["v:CompactLeadCapture"], "@/components/personal-express-enquiry": ["v:PersonalExpressEnquiry"], "@/components/free-situation-review-form": ["v:FreeSituationReviewForm"], "@/components/site-video-player": ["v:SiteVideoPlayer"], "@/data/service-video-library": ["v:getServiceVideoMedia"], "@/lib/site-videos/model": ["v:siteVideoWatchUrl"], "@/components/personal-testimonials": ["v:PersonalTestimonials"], "@/lib/public-locales": ["t:PublicLocale"], "./free-entry-landing.module.css": ["d:styles"] },
  };
  const supportedImports = (file, expected) => {
    const imports = file.statements.filter(ts.isImportDeclaration), seen = new Set();
    fail(imports.length === Object.keys(expected).length, "unsupported module import shape");
    for (const statement of imports) {
      const specifier = statement.moduleSpecifier.text, clause = statement.importClause, bindings = [];
      fail(Object.hasOwn(expected, specifier) && !seen.has(specifier) && clause && !statement.attributes && !statement.assertClause, "unsupported module import shape; missing actual import");
      seen.add(specifier);
      if (clause.name) bindings.push((clause.isTypeOnly ? "td:" : "d:") + clause.name.text);
      if (clause.namedBindings) {
        fail(ts.isNamedImports(clause.namedBindings), "unsupported module namespace binding");
        for (const element of clause.namedBindings.elements) {
          fail(!element.propertyName || element.propertyName.text === element.name.text, "unsupported module import alias binding");
          bindings.push((clause.isTypeOnly || element.isTypeOnly ? "t:" : "v:") + element.name.text);
        }
      }
      fail(JSON.stringify(bindings.sort()) === JSON.stringify([...expected[specifier]].sort()), "unsupported module import binding");
    }
  };
  const literalModule = (file, variables, functions, imports) => {
    supportedImports(file, imports);
    const seen = new Set();
    for (const statement of file.statements) {
      if (ts.isImportDeclaration(statement)) { fail(Boolean(statement.importClause), "unsupported module side-effect import"); continue; }
      if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue;
      if (ts.isFunctionDeclaration(statement)) { fail(functions.includes(statement.name?.text) && !seen.has(statement.name.text), "unsupported module function binding"); seen.add(statement.name.text); continue; }
      fail(runtimeConst(statement), "unsupported module effect/control flow");
      for (const declaration of statement.declarationList.declarations) {
        fail(ts.isIdentifier(declaration.name) && variables.includes(declaration.name.text) && !seen.has(declaration.name.text), "unsupported module data binding");
        seen.add(declaration.name.text); value(declaration.initializer);
      }
    }
    fail([...variables, ...functions].every((name) => seen.has(name)), "missing supported module binding");
  };
  // Every directly executed preparation statement is matched by one rule.
  // No declaration, guard alternative or statement is skipped by name lookup.
  // Runtime const excludes ambient/resource-management/type-erased declarations.
  const singleConst = (statement) => {
    if (!runtimeConst(statement) || statement.declarationList.declarations.length !== 1) return null;
    return statement.declarationList.declarations[0];
  };
  const constBinding = (statement, name, expression) => {
    const declaration = singleConst(statement);
    return Boolean(declaration && ts.isIdentifier(declaration.name) && declaration.name.text === name && same(unwrap(declaration.initializer), expression));
  };
  const functionMode = (owner, async) => fail(!owner.asteriskToken && owner.modifiers?.every((modifier) => [ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.DefaultKeyword, ts.SyntaxKind.AsyncKeyword].includes(modifier.kind)) && Boolean(owner.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) === async, "unsupported function execution mode");
  const preparation = (owner, rules, message) => {
    const statements = owner.body?.statements;
    fail(statements?.length === rules.length + 1 && ts.isReturnStatement(statements.at(-1)) && Boolean(statements.at(-1).expression), message);
    rules.forEach((rule, index) => fail(rule(statements[index]), message));
  };
  const localeGuardStatement = (statement, condition, thenRule) => {
    if (!ts.isIfStatement(statement) || statement.elseStatement || !same(unwrap(statement.expression), condition)) return false;
    const then = ts.isBlock(statement.thenStatement) && statement.thenStatement.statements.length === 1 ? statement.thenStatement.statements[0] : statement.thenStatement;
    return thenRule(then);
  };
  const supportedEffects = (root, label, callRule) => {
    for (const node of walk(root)) {
      fail(!ts.isThrowStatement(node) && !ts.isNewExpression(node) && !ts.isDeleteExpression(node) && !ts.isAwaitExpression(node) && !ts.isYieldExpression(node) && !ts.isTaggedTemplateExpression(node), "unsupported " + label + " termination/effect");
      fail(!(ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) && !ts.isPostfixUnaryExpression(node) && !(ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)), "unsupported " + label + " mutation");
      if (ts.isCallExpression(node)) fail(callRule(node), "unsupported " + label + " call/effect " + node.expression.getText());
    }
  };
  const ownerCall = (node) => {
    const callee = node.expression, args = node.arguments;
    let safe = same(node, 'getServiceVideoMedia("constellation-case",locale)') || same(node, 'siteVideoWatchUrl(situationVideo.video)') || same(node, 'String(i+1)');
    if (ts.isPropertyAccessExpression(callee)) {
      const method = callee.name.text, receiver = unwrap(callee.expression);
      if (method === "filter") safe = ts.isArrayLiteralExpression(receiver) && args.length === 1 && same(args[0], "Boolean");
      if (method === "join") safe = (ts.isArrayLiteralExpression(receiver) || ts.isCallExpression(receiver) && ts.isPropertyAccessExpression(receiver.expression) && receiver.expression.name.text === "filter") && args.length === 1 && ts.isStringLiteral(args[0]) && args[0].text === " ";
      if (method === "padStart") safe = same(receiver, 'String(i+1)') && args.length === 2 && same(args[0], "2") && ts.isStringLiteral(args[1]) && args[1].text === "0";
      if (method === "map") {
        const callback = args[0], bound = callback && ts.isArrowFunction(callback) ? callback.parameters : [];
        const supportedBindings = { "t.bullets": ["benefit"], "t.outcomes": ["item,index", "item,i"], "t.steps": ["step,index", "item,i"], "situationApproach[locale].items": ["item,index"] };
        const bindings = Object.entries(supportedBindings).find(([expression]) => same(receiver, expression))?.[1];
        safe = bindings?.includes(bound.map((parameter) => parameter.name.getText()).join(",")) && args.length === 1 && ts.isArrowFunction(callback) && !callback.modifiers?.length && bound.every((parameter) => ts.isIdentifier(parameter.name) && !parameter.initializer && !parameter.dotDotDotToken) && (ts.isJsxElement(unwrap(callback.body)) || ts.isJsxFragment(unwrap(callback.body)));
      }
    }
    return safe;
  };
  const supportedOwnerFlow = (owner) => {
    const expressions = {
      t: 'copy[locale][kind]', common: 'copy[locale].common', images: 'art[kind]',
      captureId: 'kind==="dao"?"request-free-wu-xing":kind==="situation"?"request-free-review":"start-free"',
      testsHref: '"/"+locale+"/client/tests"', final: 'finalCopy[locale][kind]',
      situationVideo: 'kind==="situation"?getServiceVideoMedia("constellation-case",locale):null',
    };
    preparation(owner, Object.entries(expressions).map(([name, expression]) => (statement) => constBinding(statement, name, expression)), "unsupported owner effect/control flow before return or unsupported owner initializer/binding");
    supportedEffects(owner.body, "owner", ownerCall);
  };
  // Closed direct-expression contract. The earlier shape/SEO checks are diagnostic
  // gates, not evidence that an arbitrary descendant expression is executable.
  // This grammar admits only literal data, lexical reads, checked own fields,
  // primitive operations and the finite existing JSX/callback/boundary forms.
  // It never runs source JavaScript or an imported component/helper.
  const closedCompositionExpressions = (component, owner, tree, pageTree, metadataTree, metadataCopy) => {
    const textToken = Symbol("opaque boundary string"), jsxToken = Symbol("checked JSX"), videoToken = Symbol("opaque boundary video"), baseToken = Symbol("opaque metadata base");
    const styleToken = Symbol("CSS module"), classToken = Symbol("CSS class string or absent export"), media = Object.freeze({ video: videoToken, poster: textToken });
    const css = read("components/free-entry-landing.module.css");
    const styleNames = new Set([...css.matchAll(/\.([a-z][a-zA-Z0-9]*)\b/g)].map((match) => match[1]));
    // Selector tokens only: no assertion about compilation, CSS cascade or visibility.
    const moduleNames = ["art", "copy", "finalCopy", "freeTestDirectCopy", "situationFirstScreen", "situationApproach", "serviceTitles"];
    const moduleValues = Object.fromEntries(moduleNames.map((name) => [name, value(variable(component, name))]));
    const components = new Set(["FreeEntryLanding", "Image", "Link", "ArrowLeft", "ArrowRight", "CheckCircle2", "ExternalLink", "ShieldCheck", "Sparkles", "PublicSiteHeader", "CompactLeadCapture", "PersonalExpressEnquiry", "FreeSituationReviewForm", "SiteVideoPlayer", "PersonalTestimonials"]);
    const intrinsicTags = new Set("a article details div figcaption figure h1 h2 h3 li main nav ol p section span strong summary ul".split(" "));
    const propNames = new Set("className lang locale kind showAssessmentStrip href prefetch size id src alt fill priority sizes video compact minimal posterPriority fallbackPoster internalOnly target rel intro variant key serviceTitle title lead disclaimer hidden style".split(" "));
    const needed = new Set(), checked = new Set();
    const plainParameter = (parameter) => ts.isIdentifier(parameter.name) && !parameter.initializer && !parameter.dotDotDotToken && !parameter.modifiers?.length;
    const numeric = (item) => typeof item === "number" && Number.isFinite(item);
    const text = (item) => typeof item === "string" || item === textToken;
    const primitive = (item) => item === null || text(item) || numeric(item) || typeof item === "boolean";
    const sourceObject = (item) => item !== null && typeof item === "object" && !Array.isArray(item);
    const trouble = (label, node) => "unsupported " + label + " expression/value " + ts.SyntaxKind[node?.kind] + ": " + node?.getText();
    const syntax = (input, names, label) => {
      const node = unwrap(input); fail(Boolean(node), "missing " + label + " expression");
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return;
      if (ts.isIdentifier(node)) { fail(names.has(node.text), "unbound " + label + " identifier " + node.text); return; }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        fail(!node.questionDotToken && (!ts.isPropertyAccessExpression(node) || ts.isIdentifier(node.name)), trouble(label, node));
        syntax(node.expression, names, label); if (ts.isElementAccessExpression(node)) syntax(node.argumentExpression, names, label);
        needed.add(node); return;
      }
      if (ts.isArrayLiteralExpression(node)) { for (const element of node.elements) syntax(element, names, label); return; }
      if (ts.isObjectLiteralExpression(node)) { for (const item of Object.values(objectFields(node, "source data"))) syntax(item, names, label); return; }
      if (ts.isBinaryExpression(node)) {
        fail([ts.SyntaxKind.PlusToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(node.operatorToken.kind), trouble(label, node));
        syntax(node.left, names, label); syntax(node.right, names, label); needed.add(node); return;
      }
      if (ts.isConditionalExpression(node)) { syntax(node.condition, names, label); syntax(node.whenTrue, names, label); syntax(node.whenFalse, names, label); return; }
      if (ts.isCallExpression(node)) {
        fail(!node.questionDotToken && !node.typeArguments?.length, trouble(label, node));
        const callee = unwrap(node.expression), args = node.arguments; needed.add(node);
        if (ts.isIdentifier(callee)) {
          fail(!names.has(callee.text), "shadowed " + label + " call binding " + callee.text);
          const permitted = label === "metadata" && callee.text === "metadataBaseFor" && args.length === 0 || label === "owner" && (
            callee.text === "getServiceVideoMedia" && same(node, 'getServiceVideoMedia("constellation-case",locale)') ||
            callee.text === "siteVideoWatchUrl" && same(node, 'siteVideoWatchUrl(situationVideo.video)') ||
            callee.text === "String" && args.length === 1);
          fail(permitted, "unsupported " + label + " call/effect " + callee.text);
          args.forEach((argument) => syntax(argument, names, label)); return;
        }
        fail(label === "owner" && ts.isPropertyAccessExpression(callee) && !callee.questionDotToken, trouble(label, node));
        const method = callee.name.text; syntax(callee.expression, names, label);
        if (method === "map") {
          const callback = args[0];
          fail(args.length === 1 && callback && ts.isArrowFunction(callback) && !callback.modifiers?.length && callback.parameters.length >= 1 && callback.parameters.length <= 2 && callback.parameters.every(plainParameter), "unsupported owner map binding");
          const bound = callback.parameters.map((parameter) => parameter.name.text);
          fail(new Set(bound).size === bound.length && bound.every((name) => !names.has(name) && !["String", "Boolean", "getServiceVideoMedia", "siteVideoWatchUrl"].includes(name)), "unsupported owner map shadow binding");
          fail(ts.isJsxElement(unwrap(callback.body)) || ts.isJsxFragment(unwrap(callback.body)), "unsupported owner map body");
          syntax(callback.body, new Set([...names, ...bound]), label); return;
        }
        if (method === "filter") { fail(args.length === 1 && same(args[0], "Boolean") && !names.has("Boolean"), "unsupported owner filter binding"); return; }
        fail(method === "join" && args.length === 1 && same(args[0], '" "') || method === "padStart" && args.length === 2 && same(args[0], "2") && same(args[1], '"0"'), "unsupported owner method " + method);
        args.forEach((argument) => syntax(argument, names, label)); return;
      }
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
        const open = opening(node);
        if (open) {
          const tag = open.tagName;
          fail(ts.isIdentifier(tag) && (intrinsicTags.has(tag.text) || components.has(tag.text) && (tag.text !== "FreeEntryLanding" || label === "route")), "unsupported " + label + " JSX tag binding");
          if (ts.isJsxElement(node)) fail(node.closingElement.tagName.getText() === tag.text, "unsupported JSX closing binding");
          const attributes = new Set();
          for (const attribute of open.attributes.properties) {
            fail(ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && !attributes.has(attribute.name.text), "unsupported " + label + " JSX attribute/spread");
            fail(propNames.has(attribute.name.text) || /^(aria|data)-[a-z0-9-]+$/.test(attribute.name.text), "unsupported " + label + " JSX prop contract " + attribute.name.text);
            attributes.add(attribute.name.text);
            const initializer = attribute.initializer;
            if (initializer) { fail(ts.isStringLiteral(initializer) || ts.isJsxExpression(initializer) && Boolean(initializer.expression), "unsupported JSX attribute initializer"); syntax(ts.isJsxExpression(initializer) ? initializer.expression : initializer, names, label); }
          }
        }
        for (const child of node.children || []) {
          if (ts.isJsxText(child)) continue;
          if (ts.isJsxExpression(child)) { fail(!child.dotDotDotToken, "unsupported JSX child spread"); if (child.expression) syntax(child.expression, names, label); }
          else syntax(child, names, label);
        }
        return;
      }
      fail(false, trouble(label, node));
    };
    const childValue = (item) => primitive(item) || item === jsxToken || Array.isArray(item) && item.every(childValue);
    const expression = (input, scope, label, mediaValue) => {
      const node = unwrap(input); checked.add(node);
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
      if (ts.isNumericLiteral(node)) { const number = Number(node.text); fail(Number.isFinite(number), trouble(label, node)); return number; }
      if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (node.kind === ts.SyntaxKind.NullKeyword) return null;
      if (ts.isIdentifier(node)) { fail(Object.hasOwn(scope, node.text), "unbound " + label + " identifier " + node.text); return scope[node.text]; }
      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        const receiver = expression(node.expression, scope, label, mediaValue), key = ts.isPropertyAccessExpression(node) ? node.name.text : expression(node.argumentExpression, scope, label, mediaValue);
        if (receiver === styleToken) { fail(ts.isPropertyAccessExpression(node) && styleNames.has(key), "unsupported CSS boundary field " + key); return classToken; }
        fail(sourceObject(receiver) && typeof key === "string" && Object.hasOwn(receiver, key) || Array.isArray(receiver) && Number.isInteger(key) && key >= 0 && key < receiver.length, "unsupported/missing own " + label + " property " + node.getText());
        return receiver[key];
      }
      if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => expression(item, scope, label, mediaValue));
      if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(Object.entries(objectFields(node, "source data")).map(([name, item]) => [name, expression(item, scope, label, mediaValue)]));
      if (ts.isBinaryExpression(node)) {
        const left = expression(node.left, scope, label, mediaValue), right = expression(node.right, scope, label, mediaValue);
        if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          fail([left, right].every((item) => text(item) || numeric(item)), "unsupported " + label + " primitive addition/coercion");
          return left === textToken || right === textToken ? textToken : left + right;
        }
        fail(primitive(left) && primitive(right) && left !== textToken && right !== textToken, "unsupported " + label + " equality values");
        return node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? left === right : left !== right;
      }
      if (ts.isConditionalExpression(node)) {
        const condition = expression(node.condition, scope, label, mediaValue);
        fail(condition !== textToken && (primitive(condition) || condition === media), "unsupported " + label + " condition value");
        return expression(condition ? node.whenTrue : node.whenFalse, scope, label, mediaValue);
      }
      if (ts.isCallExpression(node)) {
        const callee = unwrap(node.expression), args = node.arguments;
        if (ts.isIdentifier(callee)) {
          const inputs = args.map((argument) => expression(argument, scope, label, mediaValue));
          if (callee.text === "metadataBaseFor") return baseToken;
          if (callee.text === "getServiceVideoMedia") { fail(inputs[0] === "constellation-case" && ["en", "ru", "es"].includes(inputs[1]), "unsupported media boundary arguments"); return mediaValue; }
          if (callee.text === "siteVideoWatchUrl") { fail(inputs[0] === videoToken, "unsupported video boundary argument"); return textToken; }
          fail(callee.text === "String" && numeric(inputs[0]), "unsupported owner String primitive/coercion"); return String(inputs[0]);
        }
        const receiver = expression(callee.expression, scope, label, mediaValue), method = callee.name.text;
        if (method === "map") {
          fail(Array.isArray(receiver) && receiver.length > 0, "unsupported owner map receiver/value domain");
          const callback = args[0];
          return receiver.map((item, index) => {
            const local = { ...scope, [callback.parameters[0].name.text]: item };
            if (callback.parameters[1]) local[callback.parameters[1].name.text] = index;
            return expression(callback.body, local, label, mediaValue);
          });
        }
        if (method === "filter" || method === "join") {
          fail(Array.isArray(receiver) && receiver.every((item) => text(item) || item === classToken), "unsupported owner " + method + " primitive receiver/coercion");
          if (method === "filter") return receiver.filter((item) => item === textToken || item === classToken || Boolean(item));
          return receiver.some((item) => item === textToken || item === classToken) ? textToken : receiver.join(" ");
        }
        fail(method === "padStart" && typeof receiver === "string", "unsupported owner padStart primitive receiver/coercion"); return receiver.padStart(2, "0");
      }
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
        for (const attribute of opening(node)?.attributes.properties || []) {
          const initializer = attribute.initializer;
          const item = !initializer ? true : expression(ts.isJsxExpression(initializer) ? initializer.expression : initializer, scope, label, mediaValue);
          const name = attribute.name.text;
          const styleValue = sourceObject(item) && Object.values(item).every((entry) => typeof entry === "string" || numeric(entry));
          const tag = opening(node).tagName.getText();
          const supported = name === "style" ? styleValue : name === "video" ? tag === "SiteVideoPlayer" && item === videoToken : name === "intro" ? tag === "PersonalExpressEnquiry" && item === jsxToken : primitive(item) || name === "className" && item === classToken;
          fail(supported, "unsupported " + label + " JSX prop value " + name);
        }
        for (const child of node.children || []) {
          if (ts.isJsxText(child) || ts.isJsxExpression(child) && !child.expression) continue;
          fail(childValue(expression(ts.isJsxExpression(child) ? child.expression : child, scope, label, mediaValue)), "unsupported " + label + " JSX child value");
        }
        return jsxToken;
      }
      fail(false, trouble(label, node));
    };
    const names = new Set([...moduleNames, "styles", "locale", "kind"]);
    for (const statement of owner.body.statements.slice(0, -1)) {
      const declaration = singleConst(statement); syntax(declaration.initializer, names, "owner"); names.add(declaration.name.text);
    }
    syntax(tree, names, "owner");
    syntax(pageTree, new Set(["locale"]), "route");
    syntax(metadataTree, new Set(["locale", "t"]), "metadata");
    // Every concrete authored locale/kind and BOTH opaque media outcomes. This is
    // a finite value/binding check, not imported-helper execution or rendering.
    for (const locale of ["en", "ru", "es"]) {
      expression(pageTree, { locale }, "route", null);
      expression(metadataTree, { locale, t: metadataCopy[locale] }, "metadata", null);
      for (const kind of ["tests", "situation", "dao"]) for (const mediaValue of [null, media]) {
        const scope = { ...moduleValues, styles: styleToken, locale, kind };
        for (const statement of owner.body.statements.slice(0, -1)) {
          const declaration = singleConst(statement); scope[declaration.name.text] = expression(declaration.initializer, scope, "owner", mediaValue);
        }
        expression(tree, scope, "owner", mediaValue);
      }
    }
    for (const node of needed) fail(checked.has(node), "unverified value path outside finite source domain: " + node.getText());
  };

  const imported = (file, name, module) => {
    const bindings = file.statements.filter(ts.isImportDeclaration).filter((n) => n.moduleSpecifier.text === module && !n.importClause?.isTypeOnly)
      .flatMap((n) => n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings) ? [...n.importClause.namedBindings.elements] : [])
      .filter((n) => !n.isTypeOnly && (n.propertyName?.text || n.name.text) === name);
    fail(bindings.length === 1, "missing actual import " + name); return bindings[0].name.text;
  };
  const opening = (n) => ts.isJsxElement(n) ? n.openingElement : ts.isJsxSelfClosingElement(n) ? n : null;
  const tags = (tree, tag) => walk(tree).filter((n) => opening(n)?.tagName.getText() === tag);
  const attr = (node, name) => {
    const attributes = opening(node)?.attributes.properties || [];
    fail(!attributes.some(ts.isJsxSpreadAttribute), "unresolved spread on SEO ancestor");
    const found = attributes.filter((a) => ts.isJsxAttribute(a) && a.name.text === name);
    fail(found.length <= 1, "duplicate attribute " + name);
    const initializer = found[0]?.initializer;
    return !found.length ? undefined : initializer && ts.isJsxExpression(initializer) ? initializer.expression : initializer || true;
  };
  const exposed = (node, root, delegatedMount = false) => {
    for (let current = node; current; current = current.parent) {
      fail(!ts.isConditionalExpression(current) && !ts.isBinaryExpression(current) && !ts.isFunctionLike(current) && !ts.isCallExpression(current), "conditional/unreachable SEO tree");
      if (opening(current)) {
        const tag = opening(current).tagName.getText();
        fail(/^[a-z]/.test(tag) || (delegatedMount && current === node), "unresolved component ancestor");
        fail(!["template", "script", "style", "noscript", "details"].includes(tag), "inert or folded SEO ancestor");
        for (const name of ["hidden", "aria-hidden"]) {
          const expression = attr(current, name);
          if (expression !== undefined) {
            const v = expression === true ? true : value(expression);
            const knownTrue = v === true || name === "aria-hidden" && v === "true";
            const knownFalse = v === false || name === "aria-hidden" && v === "false";
            fail(!knownTrue, "explicitly hidden SEO tree");
            fail(knownFalse, "unsupported " + name + " literal on SEO ancestor");
          }
        }
        const style = attr(current, "style");
        if (style) {
          const s = value(style);
          fail(s && typeof s === "object" && !Array.isArray(s), "unsupported SEO ancestor style object");
          const ascii = (text) => text.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "").replace(/[A-Z]/g, (letter) => letter.toLowerCase());
          const visible = {
            display: new Set("block inline inline-block flex inline-flex grid inline-grid flow-root".split(" ")),
            visibility: new Set(["visible"]), contentVisibility: new Set(["visible"]),
          };
          for (const [property, raw] of Object.entries(s)) {
            fail(Object.hasOwn(visible, property) || property === "opacity", "unsupported SEO ancestor style property " + property);
            if (property === "opacity") {
              const token = typeof raw === "string" ? ascii(raw) : raw;
              fail(typeof token === "number" || typeof token === "string" && /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?%?$/.test(token), "unsupported SEO opacity literal");
              const opacity = typeof token === "number" ? token : Number(token.endsWith("%") ? token.slice(0, -1) : token);
              fail(Number.isFinite(opacity), "unsupported SEO opacity literal");
              fail(opacity > 0, "explicitly hidden SEO style");
            } else {
              fail(typeof raw === "string", "unsupported SEO visibility literal " + property);
              const token = ascii(raw);
              fail(!(property === "display" ? ["none"] : property === "visibility" ? ["hidden", "collapse"] : ["hidden"]).includes(token), "explicitly hidden SEO style");
              fail(visible[property].has(token), "unsupported SEO visibility literal " + property);
            }
          }
        }
      }
      if (current === root) return;
    }
    fail(false, "SEO node is not in actual returned tree");
  };
  const page = parse("app/[locale]/services/free-situation-review/page.tsx");
  literalModule(page, ["copy"], ["generateStaticParams", "generateMetadata", "FreeSituationReviewPage"], importShapes.page);
  const staticParamsOwner = fn(page, "generateStaticParams");
  functionMode(staticParamsOwner, false);
  fail(staticParamsOwner.parameters.length === 0, "unsupported static params parameter shape");
  preparation(staticParamsOwner, [], "unsupported static params preparation shape");
  fail(JSON.stringify(value(returned(staticParamsOwner))) === JSON.stringify(["en", "ru", "es"].map((locale) => ({ locale }))), "unsupported static locale params");
  const pageOwner = fn(page, "default");
  functionMode(pageOwner, true);
  paramsOwner(pageOwner);
  const pageTree = returned(pageOwner);
  const name = imported(page, "FreeEntryLanding", "@/components/free-entry-landing");
  const mounts = tags(pageTree, name);
  fail(mounts.length === 1 && tags(pageTree, "h1").length === 0, "one actual delegated owner without duplicate H1");
  exposed(mounts[0], pageTree, true);
  fail(same(attr(mounts[0], "locale"), "locale") && value(attr(mounts[0], "kind")) === "situation", "wrong delegated locale/kind");
  fail(paramsLocale(pageOwner.body.statements[0]), "route must use requested params.locale property binding");
  const localeGuard = imported(page, "isPublicLocale", "@/data/academy/catalog");
  const notFound = imported(page, "notFound", "next/navigation");
  preparation(pageOwner, [paramsLocale, (statement) => localeGuardStatement(statement, "!" + localeGuard + "(locale)", (then) => ts.isExpressionStatement(then) && same(then.expression, notFound + "()"))], "route must reject invalid locales before rendering; unsupported route preparation/guard shape");
  supportedEffects(pageTree, "route", () => false);
  fail(pageTree === mounts[0] && ts.isJsxSelfClosingElement(pageTree), "unsupported route returned delegation shape");
  const routeAttributes = pageTree.attributes.properties;
  fail(routeAttributes.length === 2 && routeAttributes.every((attribute) => ts.isJsxAttribute(attribute) && ["locale", "kind"].includes(attribute.name.text)), "unsupported route delegation attribute/prop shape");
  const component = parse("components/free-entry-landing.tsx");
  literalModule(component, ["art", "copy", "finalCopy", "freeTestDirectCopy", "situationFirstScreen", "situationApproach", "serviceTitles"], ["FreeEntryLanding"], importShapes.component);
  const owner = fn(component, "FreeEntryLanding");
  functionMode(owner, false);
  fail(owner.parameters.length === 1 && !owner.parameters[0].initializer && !owner.parameters[0].dotDotDotToken && plainBinding(owner.parameters[0].name, ["locale", "kind"]), "owner must receive locale/kind properties");
  fail(same(variable(owner, "t"), "copy[locale][kind]"), "wrong locale/kind copy binding");
  fail(!walk(owner.body).some((n) => ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ["locale", "kind", "copy", "t"].includes(n.left.getText())), "mutated locale/copy binding");
  const tree = returned(owner), headings = tags(tree, "h1");
  fail(imported(component, "getServiceVideoMedia", "@/data/service-video-library") === "getServiceVideoMedia" && imported(component, "siteVideoWatchUrl", "@/lib/site-videos/model") === "siteVideoWatchUrl", "unsupported owner video boundary binding");
  supportedOwnerFlow(owner);
  fail(headings.length === 1, "owner must return exactly one H1");
  exposed(headings[0], tree);
  fail(opening(tree)?.tagName.getText() === "main" && same(attr(tree, "lang"), "locale"), "localized main tree");
  const children = headings[0].children?.filter((n) => !ts.isJsxText(n) || n.text.trim());
  fail(children?.length === 1 && ts.isJsxExpression(children[0]) && same(children[0].expression, "t.title"), "H1 must render actual localized title");
  const copy = value(variable(component, "copy"));
  const metadataOwner = fn(page, "generateMetadata"), metadataTree = returned(metadataOwner, true);
  functionMode(metadataOwner, true);
  paramsOwner(metadataOwner);
  fail(same(variable(metadataOwner, "t"), "copy[locale]"), "metadata must use requested locale copy");
  preparation(metadataOwner, [paramsLocale, (statement) => localeGuardStatement(statement, "!" + localeGuard + "(locale)", (then) => ts.isReturnStatement(then) && Boolean(then.expression) && JSON.stringify(value(then.expression)) === JSON.stringify({ robots: { index: false } })), (statement) => constBinding(statement, "t", "copy[locale]")], "metadata must reject invalid locales without an early success return; unsupported metadata preparation/guard/declarator shape");
  fail(ts.isObjectLiteralExpression(metadataTree), "actual returned metadata object");
  const fields = objectFields(metadataTree, "metadata");
  fail(Object.keys(fields).sort().join(",") === "alternates,description,metadataBase,openGraph,title,twitter", "unsupported metadata field/effect");
  fail(same(fields.title, "t.title") && same(fields.description, "t.description"), "actual title/description metadata bindings");
  const base = imported(page, "metadataBaseFor", "@/data/site-metadata");
  fail(same(fields.metadataBase, base + "()"), "canonical metadata base owner");
  supportedEffects(metadataTree, "metadata", (call) => same(call, base + "()"));
  const metadataCopy = value(variable(page, "copy"));
  const titles = [], headingsText = [];
  for (const locale of ["en", "ru", "es"]) {
    const t = metadataCopy[locale];
    fail(typeof copy[locale]?.situation?.title === "string" && copy[locale].situation.title.trim(), "missing localized H1 " + locale);
    fail(typeof t?.title === "string" && t.title.trim() && typeof t.description === "string" && t.description.trim(), "missing localized metadata " + locale);
    const alternates = value(fields.alternates, { locale });
    fail(alternates.canonical === "/" + locale + "/services/free-situation-review", "wrong self canonical " + locale);
    const expected = Object.fromEntries(["en", "ru", "es"].map((l) => [l, "/" + l + "/services/free-situation-review"]));
    expected["x-default"] = expected.en;
    fail(JSON.stringify(Object.entries(alternates.languages).sort()) === JSON.stringify(Object.entries(expected).sort()), "wrong hreflang " + locale);
    for (const field of ["openGraph", "twitter"]) {
      const social = value(fields[field], { locale, t });
      fail(social.title === t.title && social.description === t.description && (field !== "openGraph" || social.url === alternates.canonical), "wrong localized " + field);
    }
    titles.push(t.title); headingsText.push(copy[locale].situation.title);
  }
  fail(new Set(titles).size === 3 && new Set(headingsText).size === 3, "locale titles must not collapse to one language");
  closedCompositionExpressions(component, owner, tree, pageTree, metadataTree, metadataCopy);
}

export function auditSeoSources({ root = projectRoot } = {}) {
  // New optional source root; no-argument API and CLI still inspect this checkout.
  const sourceRoot = root instanceof URL ? new URL(root.href.endsWith("/") ? root.href : root.href + "/") : pathToFileURL(resolve(root) + sep);
  const read = (path) => readFileSync(new URL(path, sourceRoot), "utf8");
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const entries = getPrioritySitemapEntries(origin);
  const map = JSON.parse(read("data/seo-demand-map.json"));
  check(entries.length === 15, "Unexpected number of public locale-complete pages");
  check(SEO_PRIORITY_PAGE_FAMILIES.length === 5, "Unexpected number of priority page families");
  check(new Set(entries.map((entry) => entry.url)).size === entries.length, "Duplicate priority sitemap URLs");
  for (const entry of entries) {
    check(entry.url.startsWith(origin + "/"), "Priority URL must use the canonical HTTPS origin: " + entry.url);
    check(Object.keys(entry.alternates.languages).sort().join(",") === "en,es,ru", "Priority sitemap alternate set is incomplete: " + entry.url);
    check(!/\/(api|admin|app|client|report|prescriptions|documents)(\/|$)/.test(entry.url), "Private URL in priority sitemap: " + entry.url);
  }
  check(map.keywords.length >= 30, "Demand map is unexpectedly incomplete");
  check(/not_google_metrics/.test(map.status), "Demand map must not claim unavailable Google metrics");
  for (const row of map.keywords) {
    check(row.source === "editorial_seed_unvalidated", "Demand source is not an editorial seed: " + row.cluster_id);
    for (const metric of Object.values(row.measured)) check(metric === null, "Invented Google metric for " + row.cluster_id);
    if (row.primary_path !== null) {
      check(row.primary_path === "/" || row.primary_path.startsWith("/" + row.locale + "/"), "Demand path locale mismatch: " + row.cluster_id);
      check(!/\/(api|admin|app|client|report|prescriptions|documents)(\/|$)/.test(row.primary_path), "Private demand path: " + row.cluster_id);
    }
  }
  for (const [path, ...patterns] of publicRouteSources) {
    check(existsSync(new URL(path, sourceRoot)), "Missing public SEO source: " + path);
    const source = read(path);
    for (const pattern of patterns) check(pattern.test(source), "Missing public SEO contract " + pattern + " in " + path);
  }
  for (const path of privateRouteSources) {
    check(existsSync(new URL(path, sourceRoot)), "Missing private route source: " + path);
    check(/robots:\s*\{\s*index:\s*false/.test(read(path)), "Private route must remain noindex: " + path);
  }
  try { auditFreeReviewComposition(read); } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    failures.push(detail.startsWith("Free review SEO: unverified source shape:") ? detail : "Free review SEO: unverified source shape: " + detail);
  }
  const sitemapCode = read("app/sitemap.ts");
  check(/getPrioritySitemapEntries\(base\)/.test(sitemapCode), "Priority sitemap entries are not integrated");
  check(/\.\.\.existing, \.\.\.entries, \.\.\.priorityEntries, \.\.\.network/.test(sitemapCode), "Sitemap merge or deduplication contract changed");
  const shell = read("app/layout.tsx");
  check(/type="application\/ld\+json"/.test(shell) && /"@type": "WebSite"/.test(shell), "Public WebSite JSON-LD is missing");
  check(/"google-site-verification"/.test(shell), "Existing owner-approved Google Search Console verification metadata is missing");
  const freeInitiation = read("components/yggdrasil-free-initiation.tsx");
  for (const suffix of ["/basic-course/description", "/basic-course"]) {
    check(freeInitiation.includes(suffix), "Missing internal Yggdrasil learning link: " + suffix);
  }
  check(/href=\{root \+ "\/basic-course"\}/.test(freeInitiation), "Missing first-party course entry");
  check(/id="preparation-readings"/.test(freeInitiation), "Missing reading entry section");
  check(/<YggdrasilInitiationForm locale=\{locale\} \/>/.test(freeInitiation), "Missing localized contact form");
  return { ok: failures.length === 0, failures, checked: { publicRoutes: publicRouteSources.length, privateRoutes: privateRouteSources.length, prioritySitemapEntries: entries.length } };
}

// Parse only public response markup, never JavaScript strings embedded in Next payloads.
// This bounded HTML reader handles metadata tags, quoted/unquoted attributes and entities;
// it is not a browser or a claim that Google indexed a page.
function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#")) {
      const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " }[key];
  });
}
function attributes(tag) {
  const result = {};
  const source = tag.replace(/^<[^\s/>]+/, "");
  for (const match of source.matchAll(/([^\s=<>/'"]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}
function visibleText(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
const tagAttributes = String.raw`(?:"[^"]*"|'[^']*'|[^'">])*`;
function excludeTemplates(html) {
  const tags = new RegExp(`<(/?)([a-z][a-z0-9:-]*)\\b${tagAttributes}>`, "gi");
  let depth = 0;
  let cursor = 0;
  let output = "";
  let match;
  while ((match = tags.exec(html))) {
    if (!depth) output += html.slice(cursor, match.index);
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (tag === "template") {
      if (closing) depth = Math.max(0, depth - 1);
      else depth++;
    } else if (!closing && ["script", "style"].includes(tag)) {
      // Raw script/style contents may contain literal HTML; do not tokenize them.
      const end = new RegExp(`</${tag}\\s*>`, "gi");
      end.lastIndex = tags.lastIndex;
      const found = end.exec(html);
      const finish = found ? end.lastIndex : html.length;
      if (!depth) output += html.slice(match.index, finish);
      tags.lastIndex = finish;
    } else if (!depth) output += match[0];
    cursor = tags.lastIndex;
  }
  return output + (depth ? "" : html.slice(cursor));
}
export function parsePublicSeoHtml(html) {
  const uncommented = excludeTemplates(html.replace(/<!--[\s\S]*?-->/g, ""));
  const scriptPattern = new RegExp(`<script\\b${tagAttributes}>[\\s\\S]*?<\\/script\\s*>`, "gi");
  const scriptOpen = new RegExp(`^<script\\b${tagAttributes}>`, "i");
  const scripts = [...uncommented.matchAll(scriptPattern)];
  const jsonLd = [];
  const schemaErrors = [];
  for (const [script] of scripts) {
    if (attributes(script.match(scriptOpen)[0]).type?.toLowerCase() !== "application/ld+json") continue;
    try {
      const parsed = JSON.parse(script.replace(scriptOpen, "").replace(/<\/script\s*>$/i, ""));
      if (!parsed || typeof parsed !== "object") throw new Error("Structured data must be an object or array");
      jsonLd.push(parsed);
    } catch { schemaErrors.push("Invalid JSON-LD"); }
  }
  const markup = uncommented.replace(new RegExp(`<(script|style)\\b${tagAttributes}>[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "");
  const tags = (name) => [...markup.matchAll(new RegExp(`<${name}\\b${tagAttributes}>`, "gi"))].map(([tag]) => attributes(tag));
  const text = (name) => [...markup.matchAll(new RegExp(`<${name}\\b${tagAttributes}>([\\s\\S]*?)<\\/${name}\\s*>`, "gi"))].map((match) => visibleText(match[1]));
  const links = tags("link");
  const meta = tags("meta");
  return {
    titles: text("title"), h1: text("h1"),
    descriptions: meta.filter((tag) => tag.name?.toLowerCase() === "description").map((tag) => tag.content || ""),
    canonical: links.filter((tag) => tag.rel?.toLowerCase().split(/\s+/).includes("canonical")).map((tag) => tag.href || ""),
    alternates: links.filter((tag) => tag.rel?.toLowerCase().split(/\s+/).includes("alternate") && tag.hreflang),
    robots: meta.filter((tag) => ["robots", "googlebot", "bingbot"].includes(tag.name?.toLowerCase())).map((tag) => tag.content || ""),
    jsonLd, schemaErrors,
  };
}
function schemaTypes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaTypes);
  if (!value || typeof value !== "object") return [];
  return [value["@type"]].flat().filter(Boolean).concat(schemaTypes(value["@graph"]));
}
export function auditPublicSeoHtml({ html, url, languages, xRobotsTag = "" }) {
  const data = parsePublicSeoHtml(html);
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(`${url}: ${message}`); };
  for (const key of ["titles", "descriptions", "h1"]) {
    check(data[key].length === 1 && Boolean(data[key][0]?.trim()), `Expected exactly one nonempty ${key}`);
  }
  check(data.canonical.length === 1 && data.canonical[0] === url, "Expected one absolute self-canonical");
  for (const [locale, href] of Object.entries(languages)) {
    const matches = data.alternates.filter((tag) => tag.hreflang.toLowerCase() === locale);
    check(matches.length === 1 && matches[0].href === href, `Incorrect or duplicate ${locale} hreflang`);
  }
  const xDefault = data.alternates.filter((tag) => tag.hreflang.toLowerCase() === "x-default");
  check(xDefault.length <= 1 && (!xDefault.length || xDefault[0].href === languages.en), "Incorrect x-default hreflang");
  check(![...data.robots, xRobotsTag].some((value) => /\b(noindex|none)\b/i.test(value)), "Public page is noindex");
  check(!data.h1.some((value) => /^(404(?:\b.*)?|not found|page not found|страница не найдена|página no encontrada)$/i.test(value)), "Possible soft 404");
  check(data.schemaErrors.length === 0, "Invalid JSON-LD");
  const types = data.jsonLd.flatMap(schemaTypes);
  check(types.includes("WebSite"), "Missing public WebSite JSON-LD");
  if (new URL(url).pathname.endsWith("/academy/reiki/tantra-reiki/free-initiation")) {
    check(types.includes("WebPage") && types.includes("BreadcrumbList"), "Missing Tantra WebPage/BreadcrumbList JSON-LD");
  }
  return { ok: failures.length === 0, failures, title: data.titles[0], schemaTypes: types };
}

// Includes root-level and localized private route families, not only priority pages.
export function isPrivateSeoPath(path) {
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return true; }
  return /^\/(?:en\/|ru\/|es\/)?(?:api|admin|app|client|report|prescriptions|documents|document-preview)(?:\/|$)/i.test(decoded);
}
export function auditLiveSitemap(xml, base) {
  assert.match(xml, /<urlset\b/, "Expected an XML sitemap");
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const locations = blocks.map((block) => [...block.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1])));
  assert.ok(blocks.length >= 15, "Sitemap is unexpectedly incomplete");
  assert.ok(locations.every((urls) => urls.length === 1), "Each sitemap entry needs exactly one loc");
  const found = locations.flat();
  assert.equal(new Set(found).size, blocks.length, "Duplicate sitemap URL");
  for (const url of found) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, base, "Unexpected sitemap origin");
    assert.ok(!parsed.search && !parsed.hash, "Query/fragment URL in sitemap");
    assert.ok(!isPrivateSeoPath(parsed.pathname), "Private URL in sitemap: " + parsed.pathname);
  }
  for (const entry of getPrioritySitemapEntries(base)) {
    const index = found.indexOf(entry.url);
    assert.ok(index >= 0, "Missing public sitemap URL " + entry.url);
    const links = [...blocks[index].matchAll(/<(?:xhtml:)?link\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    for (const [locale, href] of Object.entries(entry.alternates.languages)) {
      const matches = links.filter((tag) => tag.hreflang === locale && tag.rel === "alternate");
      assert.ok(matches.length === 1 && matches[0].href === href, "Missing or incorrect reciprocal alternate " + entry.url + ":" + locale);
    }
  }
  return { urls: found.length, priorityUrls: 15 };
}

export function auditLiveRobots(robots, origin) {
  const groups = [];
  const sitemaps = [];
  let group = null;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "sitemap") { sitemaps.push(value); continue; }
    if (key === "user-agent") {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && ["allow", "disallow"].includes(key)) group.rules.push({ key, value });
  }
  assert.ok(sitemaps.includes(origin + "/sitemap.xml"), "Missing robots sitemap declaration");
  const wildcard = groups.filter((item) => item.agents.includes("*"));
  assert.ok(wildcard.length > 0, "Missing robots wildcard agent policy");
  const disallow = wildcard.flatMap((item) => item.rules.filter((rule) => rule.key === "disallow").map((rule) => rule.value));
  assert.ok(!disallow.includes("/") && !disallow.includes("/*"), "Public website blocked by robots");
  for (const path of ["/api", "/admin", "/document-preview/", ...["en", "ru", "es"].flatMap((locale) => ["app", "client", "report", "prescriptions"].map((route) => `/${locale}/${route}`))]) {
    assert.ok(disallow.some((value) => value.replace(/\/$/, "") === path.replace(/\/$/, "")), "Missing private robots protection: " + path);
  }
  // A literal Disallow is insufficient: more-specific Allow rules and crawler
  // groups can change the effective policy. Check every declared crawler group,
  // including Google/Bing when they inherit the wildcard policy.
  const agents = new Set(["*", "googlebot", "bingbot", ...groups.flatMap((item) => item.agents)]);
  const isAllowed = (path, rules) => {
    let winner = { specificity: -1, allow: true };
    for (const rule of rules) {
      if (!rule.value) continue;
      const end = rule.value.endsWith("$");
      const pattern = end ? rule.value.slice(0, -1) : rule.value;
      const regex = new RegExp("^" + pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (end ? "$" : ""));
      if (!regex.test(path)) continue;
      const specificity = pattern.replace(/\*/g, "").length;
      const allow = rule.key === "allow";
      if (specificity > winner.specificity || (specificity === winner.specificity && allow)) winner = { specificity, allow };
    }
    return winner.allow;
  };
  const privateSamples = ["/api/example", "/admin/example", "/document-preview/example", ...["en", "ru", "es"].flatMap((locale) => ["app", "client", "report", "prescriptions"].map((route) => `/${locale}/${route}/example`))];
  for (const agent of agents) {
    const specific = groups.filter((item) => item.agents.includes(agent));
    const rules = (specific.length ? specific : wildcard).flatMap((item) => item.rules);
    for (const entry of getPrioritySitemapEntries(origin)) {
      assert.ok(isAllowed(new URL(entry.url).pathname, rules), `Public priority path blocked for ${agent}: ${entry.url}`);
    }
    for (const path of privateSamples) assert.ok(!isAllowed(path, rules), `Private robots protection overridden for ${agent}: ${path}`);
  }
  return { ok: true };
}

export async function auditLiveSeo(base, { fetchImpl = fetch } = {}) {
  const parsed = new URL(base);
  assert.equal(parsed.protocol, "https:");
  assert.ok(!parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.pathname === "/", "Expected a public HTTPS origin only");
  const origin = parsed.origin;
  const readPublic = async (path, contentType) => {
    // No automatic retries, authentication or redirect-following. A denied read stops the audit.
    const result = await fetchImpl(origin + path, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(20000) });
    assert.equal(result.status, 200, `Public read failed (${result.status}) at ${path}; do not bypass access restrictions`);
    assert.match(result.headers.get("content-type") || "", contentType, "Unexpected content type at " + path);
    return { text: await result.text(), xRobotsTag: result.headers.get("x-robots-tag") || "" };
  };
  const sitemap = auditLiveSitemap((await readPublic("/sitemap.xml", /(?:application|text)\/xml/i)).text, origin);
  const robots = (await readPublic("/robots.txt", /text\/plain/i)).text;
  auditLiveRobots(robots, origin);
  const pages = [];
  for (const entry of getPrioritySitemapEntries(origin)) {
    const response = await readPublic(new URL(entry.url).pathname, /text\/html/i);
    const report = auditPublicSeoHtml({ html: response.text, url: entry.url, languages: entry.alternates.languages, xRobotsTag: response.xRobotsTag });
    assert.ok(report.ok, report.failures.join("\n"));
    pages.push({ url: entry.url, title: report.title });
  }
  assert.equal(new Set(pages.map((page) => page.title)).size, 15, "Duplicate titles across priority pages");
  return { ok: true, sitemap, pages, checkedAt: new Date().toISOString() };
}

async function main() {
  const report = auditSeoSources();
  assert.ok(report.ok, report.failures.join("\n"));
  console.log(`PASS: SEO map, ${report.checked.prioritySitemapEntries} public locale URLs, sitemap integration, public metadata/H1 and private noindex contracts (source checks only)`);
  const liveArg = process.argv.find((arg) => arg.startsWith("--live-base="));
  if (liveArg) {
    const live = await auditLiveSeo(liveArg.slice("--live-base=".length));
    console.log(`PASS: live sitemap, robots, ${live.pages.length}/15 HTML pages, canonical/hreflang/metadata/JSON-LD at ${live.checkedAt}; this is not proof of Google indexing`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error("FAIL:", error.message); process.exitCode = 1; });
}
