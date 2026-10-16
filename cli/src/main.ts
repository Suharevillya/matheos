#!/usr/bin/env node
// matheos CLI, docs/spec/cli.md. Commands: check, render, install-chrome, guide.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, evaluate, toHtml, plainText, type Rendered } from '@matheos/core';
import { inlineHead } from './assets.js';
import { findChrome, installChrome } from './chrome.js';
import { renderPdf } from './pdf.js';

const USAGE = `usage:
  matheos check  <file.mth>... [--json]
  matheos render <file.mth>... [-o <out.pdf|out.html|dir>] [--chrome <path>]
  matheos install-chrome
  matheos guide`;

export const EXIT = { ok: 0, errors: 1, failed: 2, usage: 3 } as const;

function load(file: string): Rendered {
  return evaluate(parse(readFileSync(file, 'utf8')));
}

function findings(file: string, r: Rendered) {
  const checks = r.blocks.flatMap((b) => (b.kind === 'calc' ? b.items.filter((i) => i.kind === 'check') : []));
  const values: Record<string, unknown> = {};
  for (const [k, v] of r.scope) values[k] = typeof v === 'object' && v !== null && 'toString' in v ? String(v) : v;
  return {
    file,
    errors: r.errors.map((e) => ({ message: e.message, line: e.pos.start.line, column: e.pos.start.column })),
    checks: checks.map((c) => ({ line: c.pos.start.line, latex: c.latex, verdict: c.verdict ?? false, eta: Number(c.eta) })),
    values,
  };
}

const codeOf = (r: Rendered): number => {
  if (r.errors.length) return EXIT.errors;
  const failed = r.blocks.flatMap((b) => (b.kind === 'calc' ? b.items : [])).some((i) => i.kind === 'check' && !i.verdict);
  return failed ? EXIT.failed : EXIT.ok;
};

function check(files: string[], json: boolean): number {
  let code: number = EXIT.ok;
  const out: ReturnType<typeof findings>[] = [];
  for (const file of files) {
    if (!existsSync(file)) { console.error(`${file}: not found`); return EXIT.usage; }
    const r = load(file);
    const f = findings(file, r);
    out.push(f);
    code = Math.max(code, codeOf(r));
    if (json) continue;
    const failed = f.checks.filter((c) => !c.verdict);
    for (const e of f.errors) console.log(`${file}:${e.line}:${e.column} error: ${e.message}`);
    for (const c of failed) console.log(`${file}:${c.line} check failed: ${plain(c.latex)}  η = ${c.eta.toFixed(2)}`);
    console.log(`${file}: ${f.checks.length} checks, ${failed.length} failed, ${f.errors.length} error${f.errors.length === 1 ? '' : 's'}`);
  }
  if (json) console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
  return code;
}

const plain = plainText;

async function render(files: string[], out: string | undefined, chromeFlag: string | undefined): Promise<number> {
  let code: number = EXIT.ok;
  const outIsDir = out !== undefined && existsSync(out) && statSync(out).isDirectory();
  if (out && files.length > 1 && !outIsDir) { console.error('-o must be a directory when rendering several files'); return EXIT.usage; }
  for (const file of files) {
    if (!existsSync(file)) { console.error(`${file}: not found`); return EXIT.usage; }
    const target = out && !outIsDir ? out : join(out ?? dirname(file), basename(file, extname(file)) + '.pdf');
    const r = load(file);
    const html = toHtml(r, { head: inlineHead() });
    if (extname(target).toLowerCase() === '.html') {
      writeFileSync(target, html);
    } else {
      let chrome = findChrome(chromeFlag);
      if (!chrome) {
        if (process.env.MATHEOS_OFFLINE) { console.error('no Chromium found; run `matheos install-chrome` or set MATHEOS_CHROME'); return EXIT.usage; }
        try { chrome = await installChrome((s) => console.error(s)); }
        catch (e) { console.error(`no Chromium found and the download failed (${(e as Error).message}); set MATHEOS_CHROME or --chrome`); return EXIT.usage; }
      }
      await renderPdf(html, target, chrome);
    }
    code = Math.max(code, codeOf(r));
    const failed = r.blocks.flatMap((b) => (b.kind === 'calc' ? b.items : [])).filter((i) => i.kind === 'check' && !i.verdict).length;
    console.log(`${file} -> ${target}${r.errors.length ? ` (${r.errors.length} errors)` : ''}${failed ? ` (${failed} checks failed)` : ''}`);
  }
  return code;
}

function guide(): number {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const p of [join(here, '..', 'SKILL.md'), join(here, '..', '..', 'skills', 'matheos-authoring', 'SKILL.md')]) {
    if (existsSync(p)) { process.stdout.write(readFileSync(p, 'utf8')); return EXIT.ok; }
  }
  console.error('SKILL.md not packaged yet; see docs/spec/agent-guide.md in the repository.');
  return EXIT.usage;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const flags = new Set(rest.filter((a) => a.startsWith('--') && !a.startsWith('--chrome')));
  const valueOf = (name: string) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
  const skip = new Set(['-o', '--chrome'].flatMap((n) => { const i = rest.indexOf(n); return i >= 0 ? [i, i + 1] : []; }));
  const files = rest.filter((a, i) => !a.startsWith('-') && !skip.has(i)).map((f) => resolve(f));
  switch (cmd) {
    case 'check': return files.length ? check(files, flags.has('--json')) : (console.error(USAGE), EXIT.usage);
    case 'render': return files.length ? render(files, valueOf('-o'), valueOf('--chrome')) : (console.error(USAGE), EXIT.usage);
    case 'install-chrome': { const c = await installChrome((s) => console.error(s)); console.log(c.path); return EXIT.ok; }
    case 'guide': return guide();
    default: console.error(USAGE); return EXIT.usage;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(String(e instanceof Error ? e.message : e)); process.exit(EXIT.usage); });
