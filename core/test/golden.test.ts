// Golden documents: examples/*.mth evaluate without errors and match hand-verified numbers (docs/validation/cases.md).
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse, evaluate, toHtml } from '../src/index.js';

const load = (name: string) => evaluate(parse(readFileSync(new URL(`../../examples/${name}.mth`, import.meta.url), 'utf8')));
const lines = (r: ReturnType<typeof evaluate>) => r.blocks.flatMap((b) => (b.kind === 'calc' ? b.items : []));

describe('steel-beam', () => {
  const r = load('steel-beam');
  test('no errors', () => expect(r.errors).toEqual([]));
  test('three-line render', () => {
    expect(lines(r).find((l) => l.latex.startsWith('M_{Ed}'))?.latex)
      .toBe('M_{Ed} = \\frac{q_{Ed} \\cdot L^{2}}{8} = \\frac{25\\,\\mathrm{kN}/\\mathrm{m} \\cdot \\left(6.0\\,\\mathrm{m}\\right)^{2}}{8} = 112.5\\,\\mathrm{kN{\\cdot}m}');
  });
  test('checks', () => {
    const checks = lines(r).filter((l) => l.kind === 'check');
    expect(checks.map((c) => [c.verdict, c.eta])).toEqual([[true, '0.50'], [true, '0.14'], [true, '0.28'], [true, '0.72']]);
  });
  test('condition line and branch', () => {
    const cond = lines(r).find((l) => l.kind === 'cond');
    expect(cond?.latex).toBe('\\frac{c_{f}}{t_{f}} \\le 9\\varepsilon \\;\\rightarrow\\; 5.276 \\le 7.323');
    expect(lines(r).find((l) => l.indent)?.latex).toBe('\\mathit{cls} = 1');
  });
  test('inline values', () => {
    const prose = r.blocks.filter((b) => b.kind === 'prose').flatMap((b) => b.inlines.map((i) => i.latex));
    expect(prose).toEqual(['1', '0.5043', '0.1425', '0.7213']);
  });
  test('html renders', () => {
    const html = toHtml(r);
    expect(html).toContain('✓ OK');
    expect(html).toContain('katex');
  });
  test('snapshot', () => expect(lines(r).map((l) => [l.kind, l.latex, l.verdict, l.eta, l.error])).toMatchSnapshot());
});

describe('concrete-slab', () => {
  const r = load('concrete-slab');
  test('no errors', () => expect(r.errors).toEqual([]));
  test('all checks pass', () => expect(lines(r).filter((l) => l.kind === 'check').every((c) => c.verdict)).toBe(true));
  test('snapshot', () => expect(lines(r).map((l) => [l.kind, l.latex, l.verdict, l.eta, l.error])).toMatchSnapshot());
});

describe('bolted-connection', () => {
  const r = load('bolted-connection');
  test('no errors', () => expect(r.errors).toEqual([]));
  test('snapshot', () => expect(lines(r).map((l) => [l.kind, l.latex, l.verdict, l.eta, l.error])).toMatchSnapshot());
});

describe('display units follow the name', () => {
  const r = evaluate(parse('```math\nL = 6 m\nt = 10 mm\na = 25 t:\nb = L / 250 to mm\ncheck b >= 20 mm\n```\n\n{b =} and {a}\n'));
  test('a literal times a bound name is a product, not a unit', () => {
    expect(r.errors).toEqual([]);
    expect(lines(r)[2]?.latex).toBe('a = 250\\,\\mathrm{mm}');
  });
  test('`to` sets the display unit of the name in checks and inline values', () => {
    expect(lines(r).find((l) => l.kind === 'check')?.latex).toBe('b = 24\\,\\mathrm{mm} \\ge 20\\,\\mathrm{mm}');
    const inl = r.blocks.filter((b) => b.kind === 'prose').flatMap((b) => b.inlines.map((i) => i.latex));
    expect(inl).toEqual(['b = 24\\,\\mathrm{mm}', '250\\,\\mathrm{mm}']);
  });
});

describe('unit table', () => {
  test('units outside the table are unknown, bound names still win', () => {
    const r = evaluate(parse('```math\nT = 2 h\nh = 300 mm\nd = 2 h\nx = 5 kpa\ny = 3 m to ft\n```\n'));
    expect(lines(r).map((l) => l.error)).toEqual(['unknown unit "h"', undefined, undefined, 'undefined name "kpa"', 'unknown unit "ft"']);
  });
});

describe('errors', () => {
  test('a failed statement does not stop evaluation, dependants show the dependency', () => {
    const r = evaluate(parse('```math\nL = 6 m\nx = L + 5\ny = 2 x\nz = 2 L\n```\n'));
    expect(r.errors.map((e) => e.message)).toEqual(['cannot add a number and a quantity']);
    const items = lines(r);
    expect(items.map((i) => i.error)).toEqual([undefined, 'cannot add a number and a quantity', 'depends on x', undefined]);
  });
});
