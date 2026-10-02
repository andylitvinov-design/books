import type { ReactNode } from 'react';
// Render the entire translated source as safe React text, never raw HTML.
function Blocks({ value }: { value: string }) {
  const lines = value.split('\n');
  const result: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const current = lines[index].trim();
    if (!current) { index++; continue; }
    const heading = current.match(/^(#{2,6})\s+(.+)$/);
    if (heading) { const H = heading[1].length === 2 ? 'h2' : 'h3'; result.push(<H key={index}>{heading[2]}</H>); index++; continue; }
    if (/^[-*•]\s+/.test(current)) {
      const start = index; const items = [];
      while (index < lines.length && /^[-*•]\s+/.test(lines[index].trim())) { items.push(lines[index].trim().replace(/^[-*•]\s+/, '')); index++; if (lines[index] === '' && /^[-*•]\s+/.test(lines[index + 1]?.trim() || '')) index++; }
      result.push(<ul key={start}>{items.map((item, i) => <li key={i}>{item}</li>)}</ul>); continue;
    }
    const start = index; const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^#{2,6}\s+|^[-*•]\s+/.test(lines[index].trim())) { paragraph.push(lines[index]); index++; }
    result.push(<p className="whitespace-pre-line" key={start}>{paragraph.join('\n')}</p>);
  }
  return <>{result}</>;
}
export function SpanishRemedyContent({ description }: { description: string }) {
  const marker = /^##\s+Materiales (?:y observaciones adicionales|adicionales del autor en Telegram)\s*$/im.exec(description);
  const primary = marker ? description.slice(0, marker.index) : description;
  const supplementary = marker ? description.slice(marker.index + marker[0].length) : '';
  return <div className="remedy-content-body remedy-content-body--standalone"><div className="remedy-content-intro"><Blocks value={primary} /></div>{supplementary && <details className="remedy-supplementary"><summary>Materiales y observaciones adicionales</summary><div><Blocks value={supplementary} /></div></details>}</div>;
}
