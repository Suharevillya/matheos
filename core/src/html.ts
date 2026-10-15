// Rendered -> self-contained HTML report, docs/spec/report.md.
import katex from 'katex';
import { toHast } from 'mdast-util-to-hast';
import { toHtml as hastToHtml } from 'hast-util-to-html';
import type { Rendered, RenderedStatement } from './model.js';

// ponytail: fonts and KaTeX CSS come from CDNs for now; the spec wants them inlined for offline CLI output.
// Upgrade path: read the woff2 files from node_modules at build time and embed as data URIs.
const CSS = `
@page { size: A4; margin: 22mm 18mm 20mm 22mm;
  @top-left { content: var(--h-title); font: 8.5pt/1 "JetBrains Mono", monospace; color: #555; vertical-align: bottom; padding-bottom: 3mm; }
  @top-right { content: var(--h-project); font: 8.5pt/1 "JetBrains Mono", monospace; color: #555; vertical-align: bottom; padding-bottom: 3mm; }
  @bottom-left { content: var(--f-left); font: 7.5pt/1 "JetBrains Mono", monospace; color: #777; vertical-align: top; padding-top: 3mm; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7.5pt/1 "JetBrains Mono", monospace; color: #777; vertical-align: top; padding-top: 3mm; }
}
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: #111; font: 10.5pt/1.45 Figtree, "Segoe UI", sans-serif; }
.page { max-width: 170mm; margin: 0 auto; }
@media screen { body { background: #e9e9e9; } .page { background: #fff; padding: 22mm 18mm 20mm 22mm; margin: 10mm auto; box-shadow: 0 2px 10px rgba(0,0,0,.2); } }
h1 { font-size: 18pt; font-weight: 700; margin: 0 0 2mm; }
h2 { font-size: 12pt; font-weight: 600; margin: 7mm 0 2.5mm; border-bottom: .6pt solid #aaa; padding-bottom: .5mm; break-after: avoid; }
.head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5pt solid #111; padding-bottom: 3mm; margin-bottom: 6mm; }
.meta { font: 8.5pt/1.45 "JetBrains Mono", monospace; text-align: right; color: #333; }
.logo { max-width: 34mm; max-height: 12mm; }
.calc { margin: 2mm 0 3mm 6mm; }
.st { display: flex; justify-content: space-between; align-items: baseline; padding: 1mm 0; break-inside: avoid; }
.st.input { padding: .4mm 0; }
.cap { font: 8pt "JetBrains Mono", monospace; color: #666; margin-left: 6mm; white-space: nowrap; }
.badge { font: bold 9pt "JetBrains Mono", monospace; padding: .5mm 2mm; border-radius: 2mm; margin-left: 4mm; }
.badge.ok { background: #e2f3e8; color: #0a7a2f; } .badge.fail { background: #fbe1e5; color: #b00020; }
.eta { font: 8.5pt "JetBrains Mono", monospace; color: #444; margin-left: 3mm; }
.cond { color: #333; }
.branch { border-left: 1.2pt solid #bbb; padding-left: 4mm; margin: 1mm 0 1mm 1mm; }
.err { font: 9pt "JetBrains Mono", monospace; color: #b00020; }
.katex-display { margin: 0; display: inline-block; text-align: left; }
.inline { font: 9.5pt "JetBrains Mono", monospace; }
`;

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cssStr = (s: unknown) => `"${String(s ?? '').replace(/["\\]/g, '\\$&')}"`;
const tex = (latex: string, display = true) => katex.renderToString(latex, { throwOnError: false, displayMode: display });

function statement(it: RenderedStatement): string {
  if (it.error) return `<div class="st"><span class="err">✗ ${esc(it.error)}</span>${it.caption ? `<span class="cap">${esc(it.caption)}</span>` : ''}</div>`;
  let body = tex(it.latex, it.kind !== 'input');
  if (it.kind === 'check') body += `<span class="badge ${it.verdict ? 'ok' : 'fail'}">${it.verdict ? '✓ OK' : '✗ FAIL'}</span><span class="eta">η = ${it.eta}</span>`;
  return `<div class="st ${it.kind}"><span>${body}</span>${it.caption ? `<span class="cap">${esc(it.caption)}</span>` : ''}</div>`;
}

export function toHtml(r: Rendered): string {
  const fm = r.frontMatter;
  const parts: string[] = [];
  for (const block of r.blocks) {
    if (block.kind === 'prose') {
      let html = hastToHtml(toHast(block.mdast));
      let i = 0;
      html = html.replace(/\{[^{}]+\}/g, (m) => {
        const inl = block.inlines[i++];
        if (!inl) return m;
        return inl.error ? `<span class="err">?</span>` : `<span class="inline">${tex(inl.latex, false)}</span>`;
      });
      parts.push(html);
    } else {
      let out = '<div class="calc">', open = false;
      for (const it of block.items) {
        if (it.indent && !open) { out += '<div class="branch">'; open = true; }
        if (!it.indent && open) { out += '</div>'; open = false; }
        out += statement(it);
      }
      parts.push(out + (open ? '</div>' : '') + '</div>');
    }
  }
  const meta = [[fm.author, fm.date, fm.revision && `Rev ${fm.revision}`].filter(Boolean).join(' · '), fm.code].filter(Boolean);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(fm.title ?? 'Matheos')}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,400..700&family=JetBrains+Mono:ital,wght@0,400..800;1,400..700&display=swap" rel="stylesheet">
<style>:root { --h-title: ${cssStr(fm.title)}; --h-project: ${cssStr([fm.project, fm.revision && `Rev ${fm.revision}`].filter(Boolean).join(' · '))}; --f-left: ${cssStr([fm.author, fm.date, fm.code].filter(Boolean).join(' · '))}; }${CSS}</style>
</head><body><div class="page">
<div class="head"><div><h1>${esc(fm.title ?? '')}</h1><div style="font-size:10pt;color:#444">${esc(fm.project ?? '')}</div></div>
<div class="meta">${fm.logo ? `<img class="logo" src="${esc(fm.logo)}" alt=""><br>` : ''}${meta.map(esc).join('<br>')}</div></div>
${parts.join('\n')}
</div></body></html>`;
}
