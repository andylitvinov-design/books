import { classifyReleaseRisk } from './specialist-aggregate.mjs';

// Fail closed unless both complete sources are simple public components and
// differ only in static markup or a verified local boolean toggle.
const sensitive = /auth|login|logout|password|account|session|user|client|crm|pay|billing|checkout|price|consent|privacy|private|secret|token|admin|role|rls|submit|send|save|fetch|request|document|window|navigator|process|globalThis|localStorage|sessionStorage|XMLHttpRequest|WebSocket|eval|require|dangerouslySetInnerHTML|agree|accept|terms|cart|purchase|booking|paid|order|email|phone|address|medical|patient|contact|subscription|supabase|database|оплат|плат[её]ж|соглас|парол|конфиденц|пользоват|клиент|данн|цен[аыу]|заказ|контакт|покуп|pago|precio|tarifa|datos|usuario|cuenta|consentimiento|contraseñ|privacidad/i;
const unsafeSource = /`|\/\*|\\\r?\n|\bimport\s*\(|\bexport\s+(?:\*|\{[^}]*\})\s+from|\{\s*\.\.\.|\b(?:useEffect|useLayoutEffect|useRef)\b|https?:\/\/|\burl\s*\(/i;
const markup = /^(\s*<(p|h[1-6]|span|strong|em|li)(?:\s+className=(?:"[^"<>]*"|'[^'<>]*'))?\s*>)([^<>{}\\&\d$€£]*)(<\/\2>\s*)$/;
const stateLine = /^const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState\(\s*(true|false|"[A-Za-z_-]+")\s*\);?$/;
const stateImport = /^import\s*\{\s*useState\s*\}\s*from\s*['"]react['"];?$/;
const toggleLine = /^<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*([A-Za-z_$][\w$]*)\(!([A-Za-z_$][\w$]*)\)\}>([^<>{}\\&\d$€£]+)<\/button>$/;
const conditionalLine = /^\{\s*([A-Za-z_$][\w$]*)\s*&&\s*<(p|span)>([^<>{}\\&\d$€£]+)<\/\2>\s*\}$/;
const selectLine = /^<button\s+type="button"\s+onClick=\{\(\)\s*=>\s*([A-Za-z_$][\w$]*)\("[A-Za-z_-]+"\)\}>([^<>{}\\&\d$€£]+)<\/button>$/;
const selectedLine = /^\{\s*([A-Za-z_$][\w$]*)\s*===\s*"[A-Za-z_-]+"\s*&&\s*<(p|span)>([^<>{}\\&\d$€£]+)<\/\2>\s*\}$/;
const criticalContext = /auth(?:entication|enticate|enticated|orization|orize|orized|provider|status|client|gate|z)?\b|log\s*in|login|logout|password|account|session|payment|billing|checkout|price|consent|privacy|private|secret|token|admin|rls|purchase|booking|paid|medical|healthcare|diagnos|treatment|оплат|плат[её]ж|соглас|парол|конфиденц|медицин|диагноз|лечени|pago|precio|consentimiento|contraseñ|privacidad|salud|tratamiento/i;
const staticTags = new Set(['main','div','section','article','header','footer','h1','h2','h3','h4','h5','h6','p','span','strong','em','ul','ol','li','br','hr','figure','figcaption','blockquote','button']);

function onlyStaticTags(source) {
  for (const match of source.matchAll(/<\s*\/?\s*([A-Za-z][\w.-]*)\b/g)) {
    if (!staticTags.has(match[1])) return false;
  }
  return true;
}

// Deliberately accept only a single parameterless static component. Unknown
// declarations, expressions, props, callbacks and embedded data stay STRICT.
function staticComponentShape(source) {
  let functions=0, returns=0, phase='pre';
  const states=new Map();
  for (const raw of source.split(/\r?\n/)) {
    const state=raw.trim().match(stateLine);
    if (state) {
      if (state[1] === state[2] || states.has(state[1]) || [...states.values()].some(value=>value.setter === state[2])) return false;
      states.set(state[1],{setter:state[2],kind:state[3].startsWith('"') ? 'literal' : 'boolean'});
    }
  }
  if (states.size && (!/^\s*['"]use client['"];?\s*$/m.test(source) ||
      !source.split(/\r?\n/).some(line=>stateImport.test(line.trim())))) return false;
  const tags='(?:main|div|section|article|header|footer|h[1-6]|p|span|strong|em|ul|ol|li|br|hr|figure|figcaption|blockquote)';
  const attr='(?:\\s+className=(?:"[^"<>]*"|\'[^\'<>]*\'))?';
  const wrapper=new RegExp('^<\\/?'+tags+attr+'\\s*\\/?>[);;]*$');
  const returning=new RegExp('^return\\s+<'+tags+attr+'\\s*>$');
  for (const raw of source.split(/\r?\n/)) {
    const line=raw.trim();
    if (!line) continue;
    if (/^['"]use client['"];?$/.test(line) || /^import\b/.test(line)) { if (phase !== 'pre') return false; continue; }
    if (/^export\s+default\s+function\s+[A-Za-z_$][\w$]*\s*\(\s*\)\s*\{$/.test(line)) {
      if (phase !== 'pre') return false;
      functions++; phase='body'; continue;
    }
    if (stateLine.test(line)) { if (phase !== 'body') return false; continue; }
    if (/^return\s*\(?\s*$/.test(line) || returning.test(line)) {
      if (phase !== 'body') return false;
      returns++; phase='jsx'; continue;
    }
    if (/^};?$/.test(line)) { if (phase !== 'jsx') return false; phase='done'; continue; }
    if (phase !== 'jsx') return false;
    const toggle=line.match(toggleLine);
    if (toggle) { const state=states.get(toggle[2]); if (state?.kind !== 'boolean' || state.setter !== toggle[1]) return false; continue; }
    const conditional=line.match(conditionalLine);
    if (conditional) { if (states.get(conditional[1])?.kind !== 'boolean') return false; continue; }
    const select=line.match(selectLine);
    if (select) { if (![...states.values()].some(value=>value.kind === 'literal' && value.setter === select[1])) return false; continue; }
    const selected=line.match(selectedLine);
    if (selected) { if (states.get(selected[1])?.kind !== 'literal') return false; continue; }
    if (markup.test(raw) || wrapper.test(line) || /^\);?$/.test(line)) continue;
    return false;
  }
  return functions === 1 && returns === 1 && phase === 'done';
}

function safeImports(source) {
  return source.split(/\r?\n/).every(line => !/^\s*import\b/.test(line) ||
    /^\s*import\s+(?:type\s+)?[^;]+\s+from\s+['"](?:react|next\/(?:image|link)|\.\/[\w.-]+\.css)['"];?\s*$/.test(line));
}

export function scopedCssIsSafe(rows, readSource) {
  if (!Array.isArray(rows) || typeof readSource !== 'function') return false;
  try {
    for (const row of rows) {
      const path=row?.filename;
      if (typeof path !== 'string') return false;
      if (!/\.css$/i.test(path)) continue;
      if (row.previous_filename || !['modified','added'].includes(row.status) ||
          classifyReleaseRisk([path]) !== 'FAST') return false;
      const sides=row.status === 'added' ? ['head'] : ['base','head'];
      for (const side of sides) {
        const source=readSource(side,path);
        if (typeof source !== 'string' || source.length > 1_000_000 || source.includes('\\') || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(source)) return false;
        const css=source.replace(/\/\*[\s\S]*?\*\//g,'');
        if (/\/\*|\*\//.test(css) || /:global\b|:export\b|:root\b|@(?:import|font-face|namespace|value)\b|\b(?:url|image-set)\s*\(|\bcomposes\s*:/i.test(css) ||
            /(?:^|[^\w])(?:auth|login|payment|billing|checkout|consent|privacy|private|secret|token|crm|client)(?:[^\w]|$)/i.test(css)) return false;
      }
    }
    return true;
  } catch { return false; }
}

function textOnly(before, after) {
  const code = source => typeof source === 'string' ? source.replace(/^\s*['"]use client['"];?\s*$/gm,'') : '';
  if (typeof before !== 'string' || typeof after !== 'string' || before.length > 1_000_000 || after.length > 1_000_000 ||
      sensitive.test(code(before)) || sensitive.test(code(after)) || unsafeSource.test(before) || unsafeSource.test(after) ||
      !safeImports(before) || !safeImports(after) || !onlyStaticTags(before) || !onlyStaticTags(after) ||
      !staticComponentShape(before) || !staticComponentShape(after)) return false;
  if (before === after) return false;
  let count=0;
  const stripStaticMarkup = source => source.split('\n').filter(line => {
    const trimmed=line.trim();
    if (stateLine.test(trimmed) || stateImport.test(trimmed) || toggleLine.test(trimmed) || conditionalLine.test(trimmed) || selectLine.test(trimmed) || selectedLine.test(trimmed)) { count++; return false; }
    const item=line.match(markup);
    if (!item || !item[3].trim()) return true;
    count++;
    return false;
  }).join('\n');
  const oldCode=stripStaticMarkup(before), newCode=stripStaticMarkup(after);
  return count > 0 && oldCode === newCode;
}

function jsxTextOnly(before, after, path, ts) {
  if (!ts || typeof ts.createSourceFile !== 'function' || typeof before !== 'string' || typeof after !== 'string' ||
      before.length > 1_000_000 || after.length > 1_000_000 || before === after || criticalContext.test(before) || criticalContext.test(after)) return false;
  const safeTags=new Set(['main','div','section','article','header','footer','h1','h2','h3','h4','h5','h6','p','span','strong','em','ul','ol','li','blockquote']);
  const leafTags=new Set(['h1','h2','h3','h4','h5','h6','p','span','strong','em','li']);
  const create = source => ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  function masked(source) {
    const file=create(source);
    if (file.parseDiagnostics.length) return null;
    let unknownAuth=false;
    function checkAuthIdentifiers(node) {
      if (ts.isIdentifier(node) && /auth/i.test(node.text) && !/^authors?(?:name|links?|ship|edition)?$/i.test(node.text)) unknownAuth=true;
      ts.forEachChild(node,checkAuthIdentifiers);
    }
    checkAuthIdentifiers(file);
    if (unknownAuth) return null;
    const cssBindings=new Set();
    const localeDefinitions=new Map();
    for (const stmt of file.statements) {
      if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier) &&
          /^(?:\.\/|@\/)[\w./-]+\.module\.css$/.test(stmt.moduleSpecifier.text) && stmt.importClause?.name) {
        cssBindings.add(stmt.importClause.name.text);
      }
    }
    const ranges=[], values=[];
    function collectLocaleDefinitions(node) {
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
          ts.isIdentifier(node.name) && ['en','ru','es'].includes(node.name.text)) {
        const name=node.name.text, list=localeDefinitions.get(name) || [];
        list.push(node); localeDefinitions.set(name,list);
      }
      ts.forEachChild(node,collectLocaleDefinitions);
    }
    collectLocaleDefinitions(file);
    function localeCondition(node) {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
          ts.isIdentifier(node.left) && node.left.text === 'locale' && ts.isStringLiteral(node.right) &&
          ['en','ru','es'].includes(node.right.text)) return true;
      if (!ts.isIdentifier(node) || !['en','ru','es'].includes(node.text)) return false;
      const definitions=localeDefinitions.get(node.text) || [];
      if (definitions.length !== 1 || !ts.isVariableDeclaration(definitions[0]) ||
          !(definitions[0].parent.flags & ts.NodeFlags.Const)) return false;
      const initial=definitions[0].initializer;
      return !!initial && ts.isBinaryExpression(initial) && initial.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
        ts.isIdentifier(initial.left) && initial.left.text === 'locale' && ts.isStringLiteral(initial.right) && initial.right.text === node.text;
    }
    function safeText(text, jsx) {
      const value=text.trim();
      return value.length >= 5 && value.length <= 500 && !sensitive.test(value) &&
        !/[\d$€£\\{}<>\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value) && (!jsx || !value.includes('&')) &&
        /^[\p{Script=Latin}\p{Script=Cyrillic}\s\p{P}\u00b7]+$/u.test(value);
    }
    function localeStrings(node) {
      if (ts.isStringLiteral(node)) return !node.getText(file).includes('\\') && safeText(node.text,false) ? [node] : null;
      if (!ts.isConditionalExpression(node) || !localeCondition(node.condition)) return null;
      const yes=localeStrings(node.whenTrue), no=localeStrings(node.whenFalse);
      return yes && no ? [...yes,...no] : null;
    }
    function safeAttributes(opening) {
      for (const prop of opening.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) return false;
        const name=prop.name.getText(file), value=prop.initializer;
        if (name === 'className' && value && ts.isStringLiteral(value) && !sensitive.test(value.text)) continue;
        if (name === 'className' && value && ts.isJsxExpression(value) && value.expression &&
            ts.isPropertyAccessExpression(value.expression) && ts.isIdentifier(value.expression.expression) &&
            cssBindings.has(value.expression.expression.text) && !sensitive.test(value.expression.name.text)) continue;
        if (name === 'lang' && value && ts.isJsxExpression(value) && value.expression &&
            ts.isIdentifier(value.expression) && value.expression.text === 'locale') continue;
        if (name === 'id' && value && ts.isStringLiteral(value) && !sensitive.test(value.text)) continue;
        return false;
      }
      return true;
    }
    function allowedContext(node) {
      let current=node.parent, first=true;
      while (current) {
        if (ts.isJsxExpression(current) || ts.isJsxFragment(current)) return false;
        if (ts.isJsxElement(current)) {
          const name=current.openingElement.tagName.getText(file);
          if (!safeTags.has(name) || (first && !leafTags.has(name)) || !safeAttributes(current.openingElement)) return false;
          first=false;
        }
        if (ts.isFunctionLike(current)) {
          return !first && ts.isFunctionDeclaration(current) && !!current.modifiers?.some(x=>x.kind===ts.SyntaxKind.DefaultKeyword) &&
            !!current.modifiers?.some(x=>x.kind===ts.SyntaxKind.ExportKeyword);
        }
        current=current.parent;
      }
      return false;
    }
    function walk(node) {
      if (ts.isJsxText(node)) {
        if (safeText(node.text,true) && allowedContext(node)) {
          ranges.push([node.pos,node.end]); values.push(node.text);
        }
      }
      if (ts.isJsxExpression(node) && node.expression && allowedContext(node)) {
        const strings=localeStrings(node.expression);
        if (strings) {
          for (const item of strings) { ranges.push([item.getStart(file),item.end]); values.push(item.text); }
          return;
        }
      }
      ts.forEachChild(node,walk);
    }
    walk(file);
    let result=source;
    for (let i=ranges.length-1;i>=0;i--) result=result.slice(0,ranges[i][0])+'__HH_STATIC_UI_TEXT__'+result.slice(ranges[i][1]);
    return {result,values};
  }
  try {
    const old=masked(before), next=masked(after);
    return !!old && !!next && old.values.length > 0 && old.values.length === next.values.length &&
      old.result === next.result && old.values.some((value,index)=>value !== next.values[index]);
  } catch { return false; }
}

export function classifyStaticUiText(rows, readSource, options={}) {
  if (!Array.isArray(rows) || !rows.length || typeof readSource !== 'function' || !scopedCssIsSafe(rows,readSource)) return 'STRICT';
  const ui=[];
  try {
    for (const row of rows) {
      const path=row?.filename;
      if (typeof path !== 'string' || /[\x00-\x1f\x7f]/.test(path) || row.previous_filename) return 'STRICT';
      if (classifyReleaseRisk([path]) === 'FAST') {
        if (row.status !== 'modified' && row.status !== 'added') return 'STRICT';
        continue;
      }
      if (row.status !== 'modified' || !/^app\/\[locale\]\/(?:about|articles|books|events|explore|install)\/[\w.\[\]/-]+\.(?:jsx|tsx)$/.test(path) ||
          classifyReleaseRisk([path.replace(/\.(?:jsx|tsx)$/,'.module.css')]) !== 'FAST') return 'STRICT';
      ui.push(path);
    }
    if (!ui.length) return 'STRICT';
    for (const path of ui) {
      const before=readSource('base',path), after=readSource('head',path);
      if (textOnly(before,after)) continue;
      if (typeof before !== 'string' || typeof after !== 'string' || criticalContext.test(before) || criticalContext.test(after) ||
          !jsxTextOnly(before,after,path,options.typescript ?? options.loadTypescript?.())) return 'STRICT';
    }
  } catch { return 'STRICT'; }
  return 'FAST';
}
