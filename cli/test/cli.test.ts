// CLI smoke: check text and --json, exit codes, HTML and PDF rendering (docs/spec/validation.md).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const bin = join(root, 'cli', 'dist', 'main.js');
const example = (n: string) => join(root, 'examples', `${n}.mth`);
const run = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
const tmp = mkdtempSync(join(tmpdir(), 'matheos-cli-'));

describe('check', () => {
  test('examples are clean, exit 0', () => {
    const r = run('check', example('steel-beam'), example('concrete-slab'), example('bolted-connection'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('steel-beam.mth: 4 checks, 0 failed, 0 errors');
  });
  test('--json', () => {
    const j = JSON.parse(execFileSync(process.execPath, [bin, 'check', example('steel-beam'), '--json'], { encoding: 'utf8' }));
    expect(j.errors).toEqual([]);
    expect(j.checks).toHaveLength(4);
    expect(j.checks[0].eta).toBe(0.5);
    expect(j.values.M_Ed).toBe('112.5 kNm');
  });
  test('exit 1 on errors, 2 on a failed check, 3 on usage', () => {
    const bad = join(tmp, 'bad.mth'); writeFileSync(bad, '```calc\nL = 6 m\nx = L + 5\n```\n');
    const fail = join(tmp, 'fail.mth'); writeFileSync(fail, '```calc\nM_Ed = 300 kNm\nM_Rd = 200 kNm\ncheck M_Ed <= M_Rd\n```\n');
    const r1 = run('check', bad); expect(r1.status).toBe(1); expect(r1.stdout).toMatch(/bad\.mth:3:1 error: cannot add/);
    const r2 = run('check', fail); expect(r2.status).toBe(2); expect(r2.stdout).toMatch(/check failed: M_Ed = 300 kN·m ≤ M_Rd = 200 kN·m\s+η = 1\.50/);
    expect(run('check').status).toBe(3);
    expect(run('check', join(tmp, 'missing.mth')).status).toBe(3);
  });
});

describe('guide', () => {
  test('prints the packaged skill', () => {
    const r = run('guide');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('name: matheos-authoring');
    expect(r.stdout).toContain('matheos check doc.mth --json');
  });
});

describe('render', () => {
  test('self-contained html', () => {
    const out = join(tmp, 'beam.html');
    expect(run('render', example('steel-beam'), '-o', out).status).toBe(0);
    const html = readFileSync(out, 'utf8');
    expect(html).toContain('data:font/woff2;base64,');
    expect(html).not.toContain('cdn.jsdelivr.net');
    expect(html).toContain('✓ OK');
  });
  test('pdf through chromium, with margin boxes', async () => {
    const out = join(tmp, 'beam.pdf');
    const r = run('render', example('steel-beam'), '-o', out);
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    // @ts-expect-error pdf-parse ships no types; the lib entry skips the package's import-time self-test
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as (b: Buffer) => Promise<{ numpages: number; text: string }>;
    const pdf = await pdfParse(readFileSync(out));
    expect(pdf.numpages).toBeGreaterThanOrEqual(2);
    expect(pdf.text).toContain('112.5');
    expect(pdf.text).toMatch(/Page 1 of \d/);
  }, 120_000);
});
