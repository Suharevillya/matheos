#!/usr/bin/env node
// matheos CLI, docs/spec/cli.md. Commands: check, render, guide. (install-chrome and PDF: next session.)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, evaluate, toHtml, type Rendered } from '@matheos/core';

const USAGE = `usage:
  matheos check  <file.mth>... [--json]
  matheos render <file.mth>... [-o <out.html>]
  matheos guide`;

const EXIT = { ok: 0, errors: 1, failed: 2, usage: 3 } as const;

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

function check(files: string[], json: boolean): number {
  let code: number = EXIT.ok;
  const out: ReturnType<typeof findings>[] = [];
  for (const file of files) {
    if (!existsSync(file)) { console.error(`${file}: not found`); return EXIT.usage; }
    const f = findings(file, load(file));
    out.push(f);
    const failed = f.checks.filter((c) => !c.verdict);
    if (f.errors.length) code = Math.max(code, EXIT.errors);
    else if (failed.length) code = Math.max(code, EXIT.failed);
    if (json) continue;
    for (const e of f.errors) console.log(`${file}:${e.line}:${e.column} error: ${e.message}`);
    for (const c of failed) console.log(`${file}:${c.line} check failed: ${plain(c.latex)}  η = ${c.eta.toFixed(2)}`);
    console.log(`${file}: ${f.checks.length} checks, ${failed.length} failed, ${f.errors.length} error${f.errors.length === 1 ? '' : 's'}`);
  }
  if (json) console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
  return code;
}

/** LaTeX -> readable text for the terminal. */
function plain(latex: string): string {
  return latex.replace(/\\mathrm\{([^}]*)\}/g, '$1').replace(/\\(le|ge)\b/g, (m) => (m === '\\le' ? '≤' : '≥'))
    .replace(/\\,/g, ' ').replace(/\{\\cdot\}|\\cdot/g, '·').replace(/_\{([^}]*)\}/g, '_$1').replace(/\\(mathit|text)\{([^}]*)\}/g, '$2')
    .replace(/\\left\(|\\right\)/g, (m) => (m === '\\left(' ? '(' : ')')).replace(/\^\{([^}]*)\}/g, '^$1').replace(/\\[a-zA-Z]+/g, (m) => m.slice(1));
}

function render(files: string[], out: string | undefined): number {
  let code: number = EXIT.ok;
  for (const file of files) {
    if (!existsSync(file)) { console.error(`${file}: not found`); return EXIT.usage; }
    const target = out && files.length === 1 ? out : join(out ?? dirname(file), basename(file, extname(file)) + '.html');
    if (extname(target).toLowerCase() === '.pdf') {
      console.error('PDF rendering is not built yet; render to .html and print it from Chrome, or wait for the next session.');
      return EXIT.usage;
    }
    const r = load(file);
    writeFileSync(target, toHtml(r));
    const failed = r.blocks.flatMap((b) => (b.kind === 'calc' ? b.items : [])).filter((i) => i.kind === 'check' && !i.verdict).length;
    if (r.errors.length) code = Math.max(code, EXIT.errors); else if (failed) code = Math.max(code, EXIT.failed);
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

const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const oIdx = rest.indexOf('-o');
const outArg = oIdx >= 0 ? rest[oIdx + 1] : undefined;
const files = rest.filter((a, i) => !a.startsWith('-') && !(oIdx >= 0 && i === oIdx + 1)).map((f) => resolve(f));

let code: number;
switch (cmd) {
  case 'check': code = files.length ? check(files, flags.has('--json')) : (console.error(USAGE), EXIT.usage); break;
  case 'render': code = files.length ? render(files, outArg) : (console.error(USAGE), EXIT.usage); break;
  case 'guide': code = guide(); break;
  default: console.error(USAGE); code = EXIT.usage;
}
process.exit(code);
