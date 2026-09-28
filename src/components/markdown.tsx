import { Fragment, type ReactNode } from "react";

/** Minimal, safe Markdown renderer (headings, lists, bold/italic, paragraphs). No raw HTML is ever rendered. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    list = [];
    para = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      blocks.push(lvl <= 2 ? <h2 key={blocks.length}>{inline(h[2])}</h2> : <h3 key={blocks.length}>{inline(h[2])}</h3>);
      continue;
    }
    const li = line.match(/^[-*•]\s+(.*)$/);
    if (li) {
      if (para.length) { const p = para; para = []; blocks.push(<p key={blocks.length}>{inline(p.join(" "))}</p>); }
      list.push(li[1]);
      continue;
    }
    if (list.length) flush();
    para.push(line);
  }
  flush();
  return <div className={className ?? "prose-hirely text-sm"}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
