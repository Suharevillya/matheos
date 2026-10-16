// Expression tree -> LaTeX, docs/spec/latex-printer.md.
import type { MathNode, Unit } from 'mathjs';
import { math, isUnit, displayUnit, unitLatex } from './units.js';

export type Mode = 'formula' | 'subst';
export interface Ctx {
  isVar: (name: string) => boolean;
  /** result-line LaTeX of a bound symbol, for the substituted line */
  value?: (name: string) => string | undefined;
  /** numeric literals as typed, in source order */
  literals?: string[];
}

// ---- identifiers ----

const GREEK: Record<string, string> = Object.fromEntries(
  ['alpha', 'beta', 'gamma', 'delta', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi',
    'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega', 'varphi'].map((g) => [g, `\\${g}`]),
);
GREEK.eps = '\\varepsilon'; GREEK.epsilon = '\\varepsilon';
const UNICODE_GREEK = 'αβγδεζηθικλμνξοπρστυφχψω';
const UNICODE_NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega'];
const UNICODE_CAPS = 'ΓΔΘΛΞΠΣΦΨΩ';
const UNICODE_CAP_NAMES = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega'];

function segment(s: string, base = false): string {
  if (GREEK[s]) return GREEK[s]!;
  const g = UNICODE_GREEK.indexOf(s); if (s.length === 1 && g >= 0) return `\\${UNICODE_NAMES[g]}`;
  const c = UNICODE_CAPS.indexOf(s); if (s.length === 1 && c >= 0) return `\\${UNICODE_CAP_NAMES[c]}`;
  return base && /^[A-Za-z]{2,}$/.test(s) ? `\\mathit{${s}}` : s;
}

/** `W_pl_y` -> `W_{pl,y}`; Greek per segment; multi-letter base names kerned as a word with \mathit. */
export function identifier(name: string): string {
  const primes = /'+$/.exec(name)?.[0] ?? '';
  const [base = '', ...subs] = name.slice(0, name.length - primes.length).split('_');
  let out = segment(base, true);
  if (subs.length) out += `_{${subs.map((s) => segment(s)).join(',')}}`;
  return out + primes;
}

// ---- numbers and values ----

export function formatNumber(v: number, digits = 4): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e6) return String(Number(v.toPrecision(digits)));
  const [m, e] = v.toExponential(digits - 1).split('e');
  return `${Number(m)}\\cdot10^{${Number(e)}}`;
}

export function formatEta(v: number): string { return v.toFixed(2); }

/** Result-line LaTeX of a value, with the display-unit rule applied. */
export function formatValue(v: unknown, to?: string, digits = 4): string {
  if (typeof v === 'number') return formatNumber(v, digits);
  if (typeof v === 'boolean') return `\\mathrm{${v}}`;
  if (isUnit(v)) {
    const unit = displayUnit(v, to);
    const n = v.toNumber(unit);
    return `${formatNumber(n, digits)}\\,${unitLatex(unit)}`;
  }
  if (Array.isArray(v) || (typeof v === 'object' && v !== null && 'toArray' in v)) {
    const rows = (Array.isArray(v) ? v : (v as { toArray(): unknown[] }).toArray()) as unknown[];
    const row = (r: unknown) => (Array.isArray(r) ? r : [r]).map((x) => formatValue(x, undefined, digits)).join(' & ');
    return `\\begin{bmatrix} ${rows.map(row).join(' \\\\ ')} \\end{bmatrix}`;
  }
  return String(v);
}

// ---- operators ----

const CMP: Record<string, string> = { '<=': '\\le', '>=': '\\ge', '==': '=', '<': '<', '>': '>', '!=': '\\ne' };
const FN: Record<string, (a: string[]) => string> = {
  sqrt: ([x]) => `\\sqrt{${x}}`,
  abs: ([x]) => `\\left\\lvert ${x} \\right\\rvert`,
  floor: ([x]) => `\\lfloor ${x} \\rfloor`,
  ceil: ([x]) => `\\lceil ${x} \\rceil`,
  log: ([x]) => `\\ln\\left(${x}\\right)`,
  log10: ([x]) => `\\log\\left(${x}\\right)`,
};
for (const f of ['min', 'max', 'sin', 'cos', 'tan', 'exp']) FN[f] = (a) => `\\${f}\\left(${a.join(', ')}\\right)`;

type N = MathNode & { op?: string; fn?: string | { name: string }; args?: MathNode[]; implicit?: boolean; content?: MathNode; name?: string; value?: unknown; items?: MathNode[] };

const unwrap = (n: N): N => (n.type === 'ParenthesisNode' ? unwrap(n.content as N) : n);
const isOp = (n: N, ...ops: string[]) => n.type === 'OperatorNode' && ops.includes(n.op!);
const isNeg = (n: N) => isOp(n, '-') && n.args!.length === 1 || (n.type === 'ConstantNode' && typeof n.value === 'number' && n.value < 0);

function prec(n: N): number {
  n = unwrap(n);
  if (n.type !== 'OperatorNode') return 5;
  if (n.args!.length === 1) return 3;
  if (n.op === '^') return 4;
  if (['*', '/', '.*', './'].includes(n.op!)) return 2;
  if (['+', '-'].includes(n.op!)) return 1;
  return 0;
}

const paren = (s: string) => `\\left(${s}\\right)`;

function products(n: N): { factor: N; sep: 'implicit' | 'explicit' }[] {
  n = unwrap(n);
  if (isOp(n, '*') ) {
    const [a, b] = n.args as [N, N];
    return [...products(a), { factor: b, sep: n.implicit ? 'implicit' : 'explicit' }];
  }
  return [{ factor: n, sep: 'explicit' }];
}

function fractions(n: N): { num: N; dens: N[] } {
  n = unwrap(n);
  if (isOp(n, '/')) {
    const [a, b] = n.args as [N, N];
    const inner = fractions(a);
    return { num: inner.num, dens: [...inner.dens, b] };
  }
  return { num: n, dens: [] };
}

export function print(node: MathNode, mode: Mode, ctx: Ctx): string {
  const lits = ctx.literals ? [...ctx.literals] : undefined;
  return px(node as N, mode, ctx, lits);
}

function px(n: N, mode: Mode, ctx: Ctx, lits: string[] | undefined, inExp = false): string {
  const go = (m: N) => px(m, mode, ctx, lits, inExp);
  switch (n.type) {
    case 'ParenthesisNode': return go(n.content as N);
    case 'ConstantNode': {
      const lit = lits?.shift();
      if (typeof n.value === 'number') return lit ? lit.replace(/e\+?(-?\d+)/i, '\\cdot10^{$1}') : formatNumber(n.value);
      if (typeof n.value === 'boolean') return `\\mathrm{${n.value}}`;
      return String(n.value);
    }
    case 'SymbolNode': {
      const name = n.name!;
      if (ctx.isVar(name)) return (mode === 'subst' && ctx.value?.(name)) || identifier(name);
      if (math.Unit.isValuelessUnit(name)) return unitLatex(name);
      if (name === 'pi') return '\\pi';
      return identifier(name);
    }
    case 'FunctionNode': {
      const name = typeof n.fn === 'string' ? n.fn : n.fn!.name;
      const args = n.args!.map((a) => go(a as N));
      if (ctx.isVar(name)) return `${identifier(name)}\\left(${args.join(', ')}\\right)`;
      return FN[name] ? FN[name]!(args) : `\\operatorname{${name}}\\left(${args.join(', ')}\\right)`;
    }
    case 'ArrayNode': {
      const rows = (n.items as N[]).map((r) => (r.type === 'ArrayNode' ? (r.items as N[]).map(go).join(' & ') : go(r)));
      return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    }
    case 'OperatorNode': {
      const args = n.args as N[];
      if (args.length === 1) {
        const a = args[0]!;
        const s = go(a);
        return n.op === '-' ? `-${prec(a) < 3 ? paren(s) : s}` : `${n.op}${s}`;
      }
      const [a, b] = args as [N, N];
      switch (n.op) {
        case '+': return `${go(a)} + ${go(b)}`;
        case '-': return `${go(a)} - ${prec(b) <= 1 || isNeg(unwrap(b)) ? paren(go(b)) : go(b)}`;
        case '*': {
          const fs = products(n);
          const parts = fs.map(({ factor }, i) => {
            let s = go(factor);
            const u = unwrap(factor);
            if (prec(u) < 2 || (i > 0 && isNeg(u)) || (i > 0 && mode === 'subst' && s.startsWith('-'))) s = paren(s);
            return s;
          });
          // a literal with its unit (`235 MPa`) stays glued with a thin space in both modes
          const unitAfterNumber = (i: number) => i > 0 && fs[i]!.sep === 'implicit' && unwrap(fs[i - 1]!.factor).type === 'ConstantNode'
            && unwrap(fs[i]!.factor).type === 'SymbolNode' && !ctx.isVar(unwrap(fs[i]!.factor).name!) && math.Unit.isValuelessUnit(unwrap(fs[i]!.factor).name!);
          if (mode === 'subst') return parts.map((p, i) => (i === 0 ? p : (unitAfterNumber(i) ? '\\,' : ' \\cdot ') + p)).join('');
          const [f0, f1] = fs;
          if (fs.length === 2 && f1!.sep === 'implicit' && unwrap(f0!.factor).type === 'ConstantNode'
            && unwrap(f1!.factor).type === 'SymbolNode' && ctx.isVar(unwrap(f1!.factor).name!)) return parts.join('');
          return parts.map((p, i) => (i === 0 ? p : (fs[i]!.sep === 'implicit' || unitAfterNumber(i) ? '\\,' : ' \\cdot ') + p)).join('');
        }
        case '/': {
          const { num, dens } = fractions(n);
          const numTex = go(num);
          const d = dens.map((x) => {
            const s = go(x);
            return prec(unwrap(x)) < 2 && dens.length > 1 ? paren(s) : s;
          });
          if (inExp) return `${numTex}/${d.join('/')}`;
          return `\\frac{${numTex}}{${d.join(mode === 'subst' ? ' \\cdot ' : '\\,')}}`;
        }
        case '^': {
          let base = go(a);
          const ub = unwrap(a);
          const substUnit = mode === 'subst' && ub.type === 'SymbolNode' && ctx.isVar(ub.name!) && base.includes('\\mathrm');
          if (prec(ub) < 5 || isNeg(ub) || substUnit) base = paren(base);
          const exp = px(b, mode, ctx, lits, true);
          return `${base}^{${exp}}`;
        }
        case 'and': return `${go(a)} \\text{ and } ${go(b)}`;
        case 'or': return `${go(a)} \\text{ or } ${go(b)}`;
        default: {
          const sym = CMP[n.op!] ?? n.op!;
          return `${go(a)} ${sym} ${go(b)}`;
        }
      }
    }
    default: return n.toString();
  }
}

/** Numeric literals of an expression in source order, so the printer can echo them as typed. */
export function literalsOf(expr: string): string[] {
  return (expr.match(/(?<![A-Za-z_\d.])\d+\.?\d*(?:e[-+]?\d+)?/gi) ?? []);
}

/** LaTeX -> readable plain text (terminal output, source-style editor results). */
export function plainText(latex: string): string {
  return latex.replace(/\{\\cdot\}|\\cdot/g, '·').replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\(le|ge|ne)\b/g, (m) => ({ '\\le': '≤', '\\ge': '≥', '\\ne': '≠' })[m]!)
    .replace(/\\;\\rightarrow\\;/g, '→').replace(/\\,/g, ' ').replace(/_\{([^}]*)\}/g, '_$1')
    .replace(/\\(mathit|text)\{([^}]*)\}/g, '$2').replace(/\\left\(|\\right\)/g, (m) => (m === '\\left(' ? '(' : ')'))
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)').replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\^\{([^}]*)\}/g, '^$1').replace(/\\varepsilon/g, 'ε').replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ').replace(/\\eta/g, 'η')
    .replace(/\\lambda/g, 'λ').replace(/\\alpha/g, 'α').replace(/\\phi/g, 'φ').replace(/\\sigma/g, 'σ').replace(/\\pi/g, 'π')
    .replace(/\\[a-zA-Z]+/g, (m) => m.slice(1)).replace(/\s+/g, ' ').trim();
}

/** Utilization as the badge shows it: `50%`. */
export function percent(eta: string | undefined): string {
  const n = Number(eta);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : '';
}

export function negate(op: string): string {
  return ({ '<=': '>', '<': '>=', '>=': '<', '>': '<=', '==': '!=', '!=': '==' } as Record<string, string>)[op] ?? op;
}

export type { Unit };
