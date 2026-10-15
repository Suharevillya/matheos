// Rows of docs/spec/latex-printer.md as tests.
import { describe, expect, test } from 'vitest';
import { math, identifier, formatNumber, unitLatex, print, literalsOf } from '../src/index.js';

const vars = new Set(['L', 'q_Ed', 'W_pl_y', 'f_y', 'A_v', 'gamma_M0', 'b', 't_w', 'r', 'eps', 'E', 'I_y', 'q_ser', 'a', 'c', 'x', 'd']);
const formula = (src: string) => print(math.parse(src), 'formula', { isVar: (n) => vars.has(n), literals: literalsOf(src) });

describe('identifiers', () => {
  test.each([
    ['W_pl_y', 'W_{pl,y}'], ['M_Ed', 'M_{Ed}'], ['gamma_M0', '\\gamma_{M0}'], ['sigma_x_eps', '\\sigma_{x,\\varepsilon}'],
    ['eps', '\\varepsilon'], ['Delta_T', '\\Delta_{T}'], ['γ_M0', '\\gamma_{M0}'], ['cls', '\\mathit{cls}'],
    ['A_s_min', 'A_{s,min}'], ['I_y', 'I_{y}'], ['e_1', 'e_{1}'], ["f_y'", "f_{y}'"],
  ])('%s -> %s', (src, tex) => expect(identifier(src)).toBe(tex));
});

describe('operators', () => {
  test.each([
    ['W_pl_y * f_y', 'W_{pl,y} \\cdot f_{y}'],
    ['q_Ed L', 'q_{Ed}\\,L'],
    ['2 r', '2r'],
    ['9 eps', '9\\varepsilon'],
    ['384 E I_y', '384\\,E\\,I_{y}'],
    ['L / 250', '\\frac{L}{250}'],
    ['A_v f_y / sqrt(3) / gamma_M0', '\\frac{A_{v}\\,f_{y}}{\\sqrt{3}\\,\\gamma_{M0}}'],
    ['a / b * c', '\\frac{a}{b} \\cdot c'],
    ['a / b c', '\\frac{a}{b\\,c}'],   // implicit multiplication binds tighter than /
    ['x^(1/2)', 'x^{1/2}'],
    ['L^2', 'L^{2}'],
    ['(b - t_w - 2 r) / 2', '\\frac{b - t_{w} - 2r}{2}'],
    ['(a + b) c', '\\left(a + b\\right)\\,c'],
    ['sqrt(235 MPa / f_y)', '\\sqrt{\\frac{235\\,\\mathrm{MPa}}{f_{y}}}'],
    ['5 q_ser L^4 / (384 E I_y)', '\\frac{5\\,q_{ser}\\,L^{4}}{384\\,E\\,I_{y}}'],
    ['min(a, b)', '\\min\\left(a, b\\right)'],
    ['abs(x)', '\\left\\lvert x \\right\\rvert'],
    ['8356e4 mm^4', '8356\\cdot10^{4}\\,\\mathrm{mm}^{4}'],
    ['[1, 2; 3, 4]', '\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}'],
  ])('%s', (src, tex) => expect(formula(src)).toBe(tex));
});

describe('numbers and units', () => {
  test.each([[112.5, '112.5'], [7.3215, '7.322'], [0.5, '0.5'], [50, '50'], [8.356e7, '8.356\\cdot10^{7}'], [0.0005, '5\\cdot10^{-4}']])(
    '%s -> %s', (v, s) => expect(formatNumber(v)).toBe(s));
  test.each([['kN/m', '\\mathrm{kN}/\\mathrm{m}'], ['kNm', '\\mathrm{kN{\\cdot}m}'], ['mm^2', '\\mathrm{mm}^{2}'], ['kNm/m', '\\mathrm{kN{\\cdot}m}/\\mathrm{m}'], ['kN m', '\\mathrm{kN}{\\cdot}\\mathrm{m}']])(
    '%s', (u, tex) => expect(unitLatex(u)).toBe(tex));
});
