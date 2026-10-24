import ts from 'typescript';

// Parse JSX first, preserve every token (including strings, regexps, template
// text and JSX text), and inspect only the parser-proven trivia gaps.
export function withoutSourceComments(source) {
  const file = ts.createSourceFile('storage-contract.jsx', source,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  if (file.parseDiagnostics.length) throw new Error('Storage contract source must parse without diagnostics');
  const tokens = [];
  function visit(node) {
    // JSDoc nodes are parsed comment metadata, not executable source tokens.
    if (ts.isJSDoc(node)) return;
    const children = node.getChildren(file);
    if (children.length) children.forEach(visit);
    else if (node.end > node.getStart(file)) tokens.push([node.getStart(file), node.end]);
  }
  visit(file);
  tokens.sort((a, b) => a[0] - b[0]);
  const comments = [];
  function inspectGap(start, end) {
    if (start === end) return;
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false,
      ts.LanguageVariant.JSX, source.slice(start, end),
      () => { throw new Error('Invalid trivia in storage contract source'); });
    for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
      if (kind === ts.SyntaxKind.SingleLineCommentTrivia || kind === ts.SyntaxKind.MultiLineCommentTrivia)
        comments.push([start + scanner.getTokenPos(), start + scanner.getTextPos()]);
      else if (kind !== ts.SyntaxKind.WhitespaceTrivia && kind !== ts.SyntaxKind.NewLineTrivia)
        throw new Error('Non-trivia gap in storage contract source');
    }
  }
  let cursor = 0;
  for (const [start, end] of tokens) {
    if (start < cursor) throw new Error('Overlapping tokens in storage contract source');
    inspectGap(cursor, start);
    cursor = end;
  }
  inspectGap(cursor, source.length);
  let result = source;
  for (const [start, end] of comments.reverse())
    result = result.slice(0, start) + result.slice(start, end).replace(/[^\r\n\u2028\u2029]/g, ' ') + result.slice(end);
  return result;
}

