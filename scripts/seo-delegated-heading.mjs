import ts from "typescript";

export const delegatedHeadingPage = "app/[locale]/services/free-situation-review/page.tsx";
export const delegatedHeadingComponent = "components/free-entry-landing.tsx";

// A bounded, fail-closed source proof, not a browser/rendering or indexing claim.
// Follow the returned JSX's real import/export binding. Comments, unused JSX,
// metadata titles and headings in an unmounted component cannot satisfy it.
export function auditDelegatedHeading(pageSource, componentSource) {
  const fail = (message) => { throw new Error(message); };
  const require = (condition, message) => { if (!condition) fail(message); };
  const parse = (name, source) => {
    const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    require(file.parseDiagnostics.length === 0, `Invalid TSX in ${name}`);
    return file;
  };
  const unwrap = (node) => {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
    return node;
  };
  const nameOf = (node) => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : null;
  const hasModifier = (node, kind) => node.modifiers?.some((modifier) => modifier.kind === kind);
  const bindingNames = (node) => ts.isIdentifier(node) ? [node] :
    ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node)
      ? node.elements.flatMap((item) => ts.isOmittedExpression(item) ? [] : bindingNames(item.name)) : [];
  const bindingCount = (root, name) => {
    let count = 0;
    const visit = (node) => {
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.name) count += bindingNames(node.name).filter((item) => item.text === name).length;
      else if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node) ||
        ts.isClassExpression(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportClause(node)) && node.name?.text === name) count++;
      ts.forEachChild(node, visit);
    };
    visit(root);
    return count;
  };
  const requireNamedImport = (file, name, module) => require(file.statements.some((node) =>
    ts.isImportDeclaration(node) && node.moduleSpecifier.text === module && !node.importClause?.isTypeOnly &&
    node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) &&
    node.importClause.namedBindings.elements.some((item) => !item.isTypeOnly && item.name.text === name && (item.propertyName || item.name).text === name)) &&
    bindingCount(file, name) === 1, `Missing unique ${name} import`);
  const requireReadOnlyBindings = (root) => {
    const visit = (node) => {
      require(!(ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.Const)), "Heading flow bindings must be const");
      require(!(ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment), "Unsupported mutation in heading flow");
      require(!((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)), "Unsupported mutation in heading flow");
      require(!ts.isDeleteExpression(node) && !ts.isThrowStatement(node), "Unsupported mutation or abrupt exit in heading flow");
      ts.forEachChild(node, visit);
    };
    visit(root);
  };
  const soleReturn = (fn) => {
    const returns = [];
    const visit = (node) => {
      if (node !== fn && ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node)) returns.push(node);
      ts.forEachChild(node, visit);
    };
    visit(fn);
    require(returns.length === 1 && fn.body?.statements.includes(returns[0]), "Expected one unconditional component return");
    return unwrap(returns[0].expression);
  };
  const bindings = (statements) => {
    const result = new Map();
    for (const statement of statements) {
      if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
        require(!result.has(statement.name.text), "Duplicate heading binding");
        result.set(statement.name.text, statement);
        continue;
      }
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        require(statement.declarationList.flags & ts.NodeFlags.Const, "Heading bindings must be const");
        for (const name of bindingNames(declaration.name)) {
          require(!result.has(name.text), "Duplicate heading binding");
          // Destructuring is accounted for but never guessed to equal the outer value.
          result.set(name.text, ts.isIdentifier(declaration.name) ? declaration.initializer : declaration);
        }
      }
    }
    return result;
  };
  try {
    const page = parse(delegatedHeadingPage, pageSource);
    const component = parse(delegatedHeadingComponent, componentSource);
    requireReadOnlyBindings(page);
    requireReadOnlyBindings(component);
    const imports = page.statements.filter((node) => ts.isImportDeclaration(node) &&
      node.moduleSpecifier.text === "@/components/free-entry-landing" && !node.importClause?.isTypeOnly);
    require(imports.length === 1, "Missing actual free-entry-landing import");
    const named = imports[0].importClause?.namedBindings;
    require(named && ts.isNamedImports(named), "Expected a named FreeEntryLanding import");
    const imported = named.elements.filter((node) => !node.isTypeOnly && (node.propertyName || node.name).text === "FreeEntryLanding");
    require(imported.length === 1, "Missing actual FreeEntryLanding import binding");
    const pages = page.statements.filter((node) => ts.isFunctionDeclaration(node) && hasModifier(node, ts.SyntaxKind.DefaultKeyword));
    require(pages.length === 1, "Missing default page function");
    const mount = soleReturn(pages[0]);
    require(mount && ts.isJsxSelfClosingElement(mount) && nameOf(mount.tagName) === imported[0].name.text,
      "Default page must return the imported FreeEntryLanding mount");
    const props = mount.attributes.properties;
    require(props.length === 2 && props.every(ts.isJsxAttribute), "Expected only locale/kind mount props, without spreads");
    const localeProp = props.find((prop) => prop.name.text === "locale")?.initializer;
    const kindProp = props.find((prop) => prop.name.text === "kind")?.initializer;
    require(localeProp && ts.isJsxExpression(localeProp) && nameOf(localeProp.expression) === "locale", "Mount must pass the route locale");
    require(kindProp && ts.isStringLiteral(kindProp) && kindProp.text === "situation", "Mount must select the situation heading");
    const pageParams = pages[0].parameters[0]?.name;
    require(pages[0].parameters.length === 1 && pageParams && ts.isObjectBindingPattern(pageParams) && pageParams.elements.length === 1 && pageParams.elements.some((item) =>
      nameOf(item.name) === "params" && nameOf(item.propertyName || item.name) === "params"), "Missing route params binding");
    const localeDeclarations = pages[0].body.statements.filter(ts.isVariableStatement).flatMap((node) => [...node.declarationList.declarations]).filter((node) =>
      ts.isObjectBindingPattern(node.name) && node.name.elements.some((item) => nameOf(item.name) === "locale" && nameOf(item.propertyName || item.name) === "locale"));
    require(localeDeclarations.length === 1 && ts.isAwaitExpression(localeDeclarations[0].initializer) &&
      nameOf(localeDeclarations[0].initializer.expression) === "params", "Locale must come from awaited route params");
    require(!bindings(page.statements).has(imported[0].name.text) &&
      !bindings(pages[0].body.statements).has(imported[0].name.text) && bindingCount(page, imported[0].name.text) === 1, "Mounted import is shadowed");
    require(bindingCount(pages[0], "params") === 1 && bindingCount(pages[0], "locale") === 1, "Route props are shadowed");
    const body = pages[0].body.statements;
    const guard = body[1];
    const guardCall = guard && ts.isIfStatement(guard) && ts.isPrefixUnaryExpression(guard.expression) &&
      guard.expression.operator === ts.SyntaxKind.ExclamationToken ? guard.expression.operand : null;
    const stopCall = guard && ts.isIfStatement(guard) && ts.isExpressionStatement(guard.thenStatement) ? guard.thenStatement.expression : null;
    require(body.length === 3 && ts.isVariableStatement(body[0]) && body[0].declarationList.declarations.length === 1 &&
      body[0].declarationList.declarations[0] === localeDeclarations[0] && localeDeclarations[0].name.elements.length === 1 &&
      guardCall && ts.isCallExpression(guardCall) && nameOf(guardCall.expression) === "isPublicLocale" &&
      guardCall.arguments.length === 1 && nameOf(guardCall.arguments[0]) === "locale" && !guard.elseStatement &&
      stopCall && ts.isCallExpression(stopCall) && nameOf(stopCall.expression) === "notFound" && stopCall.arguments.length === 0 &&
      ts.isReturnStatement(body[2]), "Unsupported wrapper statement grammar");
    requireNamedImport(page, "isPublicLocale", "@/data/academy/catalog");
    requireNamedImport(page, "notFound", "next/navigation");

    const leaves = component.statements.filter((node) => ts.isFunctionDeclaration(node) &&
      nameOf(node.name) === "FreeEntryLanding" && hasModifier(node, ts.SyntaxKind.ExportKeyword));
    require(leaves.length === 1, "Missing actual exported FreeEntryLanding function");
    const leaf = leaves[0];
    const parameter = leaf.parameters[0]?.name;
    require(leaf.parameters.length === 1 && parameter && ts.isObjectBindingPattern(parameter) && parameter.elements.length === 2, "Expected only locale/kind component prop bindings");
    for (const prop of ["locale", "kind"]) require(parameter.elements.some((item) =>
      nameOf(item.name) === prop && nameOf(item.propertyName || item.name) === prop && !item.initializer), `Missing ${prop} component binding`);
    for (const prop of ["locale", "kind"]) require(bindingCount(leaf, prop) === 1, "Component props are shadowed");
    const tree = soleReturn(leaf);
    const headings = [];
    const unconditional = [];
    const visit = (node) => {
      if (ts.isJsxElement(node) && nameOf(node.openingElement.tagName) === "h1") headings.push(node);
      ts.forEachChild(node, visit);
    };
    require(tree, "Missing component return markup");
    visit(tree);
    const visitRendered = (node) => {
      node = unwrap(node);
      if (ts.isJsxFragment(node)) node.children.forEach(visitRendered);
      else if (ts.isJsxElement(node)) {
        const tag = nameOf(node.openingElement.tagName);
        // Unknown components may drop children; conditionals may not mount them.
        if (!tag || !/^[a-z]/.test(tag) || ["template", "script", "style"].includes(tag)) return;
        if (node.openingElement.attributes.properties.some((attribute) => ts.isJsxSpreadAttribute(attribute) ||
          ["hidden", "aria-hidden", "style", "dangerouslySetInnerHTML"].includes(nameOf(attribute.name)))) return;
        if (tag === "h1") unconditional.push(node);
        node.children.forEach(visitRendered);
      }
    };
    visitRendered(tree);
    require(headings.length === 1 && unconditional.length === 1 && headings[0] === unconditional[0],
      "Expected exactly one unconditional H1 in the mounted component return");
    const heading = headings[0];
    require(!heading.openingElement.attributes.properties.some((attribute) => ts.isJsxSpreadAttribute(attribute) ||
      ["hidden", "aria-hidden", "dangerouslySetInnerHTML"].includes(nameOf(attribute.name))), "Heading visibility/content is not statically established");
    const content = heading.children.filter((child) => !ts.isJsxText(child) || child.text.trim());
    require(content.length === 1 && ts.isJsxExpression(content[0]) && content[0].expression &&
      ts.isPropertyAccessExpression(unwrap(content[0].expression)) && unwrap(content[0].expression).name.text === "title" &&
      ts.isIdentifier(unwrap(content[0].expression).expression), "Expected a direct localized title read in H1");
    const titleBinding = unwrap(content[0].expression).expression.text;
    const lookup = unwrap(bindings(leaf.body.statements).get(titleBinding));
    require(lookup && ts.isElementAccessExpression(lookup) && nameOf(lookup.argumentExpression) === "kind" &&
      ts.isElementAccessExpression(lookup.expression) && nameOf(lookup.expression.argumentExpression) === "locale" &&
      ts.isIdentifier(lookup.expression.expression), "Heading must depend on both the mounted locale and kind through a direct lookup");
    const copyBinding = lookup.expression.expression.text;
    require(bindingCount(component, copyBinding) === 1 && bindingCount(component, titleBinding) === 1,
      "Heading data binding is shadowed or aliased");
    const literal = unwrap(bindings(component.statements).get(copyBinding));
    const data = (node) => {
      node = unwrap(node);
      require(node, "Missing literal heading data");
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
      if (ts.isNumericLiteral(node)) return Number(node.text);
      if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return node.kind === ts.SyntaxKind.NullKeyword ? null : node.kind === ts.SyntaxKind.TrueKeyword;
      if (ts.isArrayLiteralExpression(node)) return node.elements.map(data);
      require(ts.isObjectLiteralExpression(node), "Heading data must be literal, without aliases or opaque initializers");
      const result = Object.create(null);
      for (const property of node.properties) {
        require(ts.isPropertyAssignment(property) && nameOf(property.name) !== null && !Object.hasOwn(result, nameOf(property.name)), "Unsupported or duplicate literal heading property");
        result[nameOf(property.name)] = data(property.initializer);
      }
      return result;
    };
    const copy = data(literal);
    // Modules may declare imports/types/functions and literal data, not execute
    // opaque initializers or statements before the supported page/leaf flow.
    for (const file of [page, component]) for (const statement of file.statements) {
      if (ts.isImportDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isFunctionDeclaration(statement)) continue;
      require(ts.isVariableStatement(statement), "Unsupported source module statement grammar");
      for (const declaration of statement.declarationList.declarations) {
        require(ts.isIdentifier(declaration.name), "Unsupported module destructuring");
        data(declaration.initializer);
      }
    }
    const identifierUses = (root, name, accept) => {
      const visit = (node) => {
        if (ts.isIdentifier(node) && node.text === name) require(accept(node), `Unsupported heading-data use: ${name}; aliases, writes and opaque calls are not proven`);
        ts.forEachChild(node, visit);
      };
      visit(root);
    };
    identifierUses(component, copyBinding, (node) => {
      if (ts.isVariableDeclaration(node.parent) && node.parent.name === node && unwrap(node.parent.initializer) === literal) return true;
      if (node === lookup.expression.expression) return true;
      // The existing common-copy read selects a distinct literal subtree; it
      // cannot leak the root object or the selected situation-title object.
      const first = node.parent;
      const second = first?.parent;
      return first && ts.isElementAccessExpression(first) && first.expression === node && nameOf(first.argumentExpression) === "locale" &&
        second && ts.isPropertyAccessExpression(second) && second.expression === first && second.name.text === "common" &&
        ts.isVariableDeclaration(second.parent) && second.parent.initializer === second && ts.isIdentifier(second.parent.name) &&
        leaf.body.statements.some((statement) => ts.isVariableStatement(statement) && statement.declarationList.declarations.includes(second.parent));
    });
    identifierUses(component, titleBinding, (node) => {
      if (ts.isVariableDeclaration(node.parent) && node.parent.name === node && unwrap(node.parent.initializer) === lookup) return true;
      const access = node.parent;
      if (!ts.isPropertyAccessExpression(access) || access.expression !== node) return false;
      const values = ["en", "ru", "es"].map((locale) => copy[locale]?.situation?.[access.name.text]);
      if (values.every((value) => ["string", "number", "boolean"].includes(typeof value) || value === null)) {
        // Selected primitive copy may be rendered, including conditional JSX,
        // but is not an opaque call argument, assignment target or new alias.
        let value = access;
        while (ts.isConditionalExpression(value.parent)) value = value.parent;
        return ts.isJsxExpression(value.parent) && value.parent.expression === value;
      }
      const method = access.parent;
      return values.every(Array.isArray) && ts.isPropertyAccessExpression(method) && method.expression === access && method.name.text === "map" &&
        ts.isCallExpression(method.parent) && method.parent.expression === method;
    });
    require(leaf.body.statements.slice(0, -1).every(ts.isVariableStatement) && ts.isReturnStatement(leaf.body.statements.at(-1)), "Unsupported leaf statement grammar");
    const prelude = (expression) => {
      const node = unwrap(expression);
      if (!node) return false;
      if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.NullKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(node.kind)) return true;
      if (ts.isPropertyAccessExpression(node)) return prelude(node.expression);
      if (ts.isElementAccessExpression(node)) return prelude(node.expression) && prelude(node.argumentExpression);
      if (ts.isBinaryExpression(node)) return prelude(node.left) && prelude(node.right);
      if (ts.isConditionalExpression(node)) return prelude(node.condition) && prelude(node.whenTrue) && prelude(node.whenFalse);
      if (ts.isArrayLiteralExpression(node)) return node.elements.every(prelude);
      if (ts.isObjectLiteralExpression(node)) return node.properties.every((property) => ts.isPropertyAssignment(property) && nameOf(property.name) !== null && prelude(property.initializer));
      if (!ts.isCallExpression(node)) return false;
      if (nameOf(node.expression) === "getServiceVideoMedia") return node.arguments.length === 2 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "overview" && nameOf(node.arguments[1]) === "locale";
      return ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "slice" &&
        ts.isElementAccessExpression(node.expression.expression) && nameOf(node.expression.expression.expression) === "testimonialVideos" &&
        nameOf(node.expression.expression.argumentExpression) === "locale" && node.arguments.length === 2 && node.arguments.every(ts.isNumericLiteral);
    };
    require(leaf.body.statements.slice(0, -1).every((statement) => statement.declarationList.declarations.every((declaration) =>
      ts.isIdentifier(declaration.name) && prelude(declaration.initializer))), "Unsupported leaf prelude grammar");
    requireNamedImport(component, "getServiceVideoMedia", "@/data/service-video-library");
    const localized = [];
    for (const locale of ["en", "ru", "es"]) {
      const text = copy[locale]?.situation?.title;
      require(typeof text === "string", `Missing literal ${locale} heading`);
      require(text.trim().length > 0, `Empty ${locale} heading`);
      localized.push({ locale, text: text.trim() });
    }
    return { ok: true, failures: [], headings: localized };
  } catch (error) {
    return { ok: false, failures: [`Delegated H1 source contract: ${error.message}`], headings: [] };
  }
}
