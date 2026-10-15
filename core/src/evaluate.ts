// Document -> Rendered, docs/spec/architecture.md (evaluation), latex-printer.md (three lines), conditionals.md.
import type { MathNode, Unit } from 'mathjs';
import { math, isUnit, wording, unitLatex } from './units.js';
import { print, identifier, formatValue, formatEta, literalsOf, negate, type Ctx } from './printer.js';
import type { Branch, CalcOptions, Document, Pos, Rendered, RenderedError, RenderedStatement, Statement } from './model.js';

type N = MathNode & { op?: string; args?: MathNode[]; implicit?: boolean; type: string; name?: string; content?: MathNode };
const CMP_FN: Record<string, string> = { '<=': 'smallerEq', '>=': 'largerEq', '<': 'smaller', '>': 'larger', '==': 'equal', '!=': 'unequal' };
const CMP_TEX: Record<string, string> = { '<=': '\\le', '>=': '\\ge', '<': '<', '>': '>', '==': '=', '!=': '\\ne' };

class DependsError extends Error { constructor(dep: string) { super(`depends on ${dep}`); } }

export function evaluate(doc: Document): Rendered {
  const scope = new Map<string, unknown>();
  const display = new Map<string, string>();   // result-line LaTeX per bound name
  const failed = new Set<string>();
  const errors: RenderedError[] = [];
  const digits = typeof doc.frontMatter.digits === 'number' ? doc.frontMatter.digits : 4;
  const ctx: Ctx = { isVar: (n) => scope.has(n), value: (n) => display.get(n) };

  const parseExpr = (expr: string): N => {
    const node = math.parse(expr) as N;
    for (const sym of node.filter((x) => x.type === 'SymbolNode') as N[]) if (failed.has(sym.name!)) throw new DependsError(sym.name!);
    return node;
  };
  const run = (node: N): unknown => node.compile().evaluate(scope);
  const convert = (v: unknown, to?: string): unknown => {
    if (!to) return v;
    if (!isUnit(v)) throw new Error(`cannot convert a number to ${to}`);
    try { return v.to(to); } catch (e) { throw new Error(`cannot convert ${v.formatUnits()} to ${to}`); }
  };
  const fmt = (v: unknown, to?: string) => formatValue(v, to, digits);
  const isLiteral = (n: N): boolean => {
    const u = n.type === 'ParenthesisNode' ? (n.content as N) : n;
    return u.type === 'ConstantNode' || (u.type === 'OperatorNode' && u.op === '*' && !!u.implicit
      && (u.args![0] as N).type === 'ConstantNode' && (u.args![1] as N).type === 'SymbolNode' && !scope.has((u.args![1] as N).name!));
  };
  const collapse = (pieces: string[]) => pieces.filter((p, i) => i === 0 || p !== pieces[i - 1]);

  /** `formula = value` for one side of a check or condition; a literal side prints once. */
  const side = (expr: string): { latex: string; value: unknown } => {
    const node = parseExpr(expr);
    const value = run(node);
    const v = fmt(value);
    if (isLiteral(node)) return { latex: v, value };
    return { latex: collapse([print(node, 'formula', { ...ctx, literals: literalsOf(expr) }), v]).join(' = '), value };
  };

  const condLine = (cond: string, negated: boolean): { latex: string; value: boolean } => {
    const node = parseExpr(cond);
    const value = Boolean(run(node));
    if (node.type === 'OperatorNode' && CMP_FN[node.op!] && !negated || (negated && node.type === 'OperatorNode' && CMP_FN[node.op!])) {
      const [a, b] = node.args as [N, N];
      const op = negated ? negate(node.op!) : node.op!;
      const L = side(a.toString()), R = side(b.toString());
      if (op === '==' && (isLiteral(b) && R.latex === fmt(L.value) || isLiteral(a) && L.latex === fmt(R.value))) return { latex: isLiteral(b) ? L.latex : R.latex, value };
      return { latex: `${L.latex} ${CMP_TEX[op]} ${R.latex}`, value };
    }
    const latex = print(node, 'formula', { ...ctx, literals: literalsOf(cond) });
    return { latex: negated ? `\\text{not } \\left(${latex}\\right)` : latex, value };
  };

  const fail = (st: Statement, e: unknown, items: RenderedStatement[], indent: boolean) => {
    const message = e instanceof DependsError ? e.message : wording(e);
    if (st.kind === 'input' || st.kind === 'derived') { failed.add(st.name); scope.delete(st.name); }
    if (!(e instanceof DependsError)) errors.push({ message, pos: st.pos });
    if (st.kind !== 'comment' && st.kind !== 'if') items.push({ kind: st.kind, latex: '', error: message, pos: st.pos, ...(st.caption !== undefined && { caption: st.caption }), ...(indent && { indent }) });
  };

  const renderStatements = (statements: Statement[], opts: CalcOptions, items: RenderedStatement[], indent = false) => {
    for (const st of statements) {
      try {
        const cap = st.kind !== 'comment' && st.kind !== 'if' && st.caption !== undefined ? { caption: st.caption } : {};
        const ind = indent ? { indent } : {};
        const silent = opts.hide || (st.kind !== 'comment' && st.kind !== 'if' && st.modifier === ';');
        const resultOnly = opts.results || (st.kind !== 'comment' && st.kind !== 'if' && st.modifier === ':');
        switch (st.kind) {
          case 'comment': break;
          case 'input': {
            const node = parseExpr(st.expr);
            const value = run(node);
            // echo the literal as typed: number, then the unit text upright
            const m = /^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(.*)$/i.exec(st.expr)!;
            const latex = m[1]!.replace(/e\+?(-?\d+)/i, '\\cdot10^{$1}') + (m[2] ? `\\,${unitLatex(m[2])}` : '');
            scope.set(st.name, value); failed.delete(st.name); display.set(st.name, latex);
            if (!silent) items.push({ kind: 'input', latex: `${identifier(st.name)} = ${latex}`, pos: st.pos, ...cap, ...ind });
            break;
          }
          case 'derived': case 'bare': {
            const node = parseExpr(st.expr);
            const value = run(node);
            const shown = convert(value, st.to);
            const result = fmt(value, st.to);
            if (st.kind === 'derived') { scope.set(st.name, value); failed.delete(st.name); display.set(st.name, result); }
            if (silent) break;
            const lits = literalsOf(st.expr);
            const pieces = resultOnly ? [result] : collapse([print(node, 'formula', { ...ctx, literals: lits }), print(node, 'subst', { ...ctx, literals: lits }), result]);
            const head = st.kind === 'derived' ? [identifier(st.name)] : [];
            items.push({ kind: st.kind, latex: [...head, ...pieces].join(' = '), pos: st.pos, ...cap, ...ind });
            void shown;
            break;
          }
          case 'check': {
            const L = side(st.left), R = side(st.right);
            const verdict = Boolean((math as unknown as Record<string, (a: unknown, b: unknown) => unknown>)[CMP_FN[st.op]!]!(L.value, R.value));
            const ratio = st.op === '>=' || st.op === '>' ? math.divide(R.value as number, L.value as number) : math.divide(L.value as number, R.value as number);
            const eta = formatEta(typeof ratio === 'number' ? ratio : isUnit(ratio) ? (ratio as Unit).toNumber('') : NaN);
            if (!silent) items.push({ kind: 'check', latex: `${L.latex} ${CMP_TEX[st.op]} ${R.latex}`, verdict, eta, pos: st.pos, ...cap, ...ind });
            break;
          }
          case 'if': {
            let taken: Branch | undefined, last: string | undefined, line: { latex: string; value: boolean } | undefined;
            for (const b of st.branches) {
              if (b.condition === undefined) { taken = b; line = last !== undefined ? condLine(last, true) : undefined; break; }
              const c = condLine(b.condition, false); last = b.condition;
              if (c.value) { taken = b; line = c; break; }
            }
            if (!taken) break;
            if (line && !silent && !resultOnly) items.push({ kind: 'cond', latex: line.latex, verdict: line.value, pos: taken.pos, ...ind });
            renderStatements(taken.statements, opts, items, true);
            break;
          }
        }
      } catch (e) { fail(st, e, items, indent); }
    }
  };

  const blocks: Rendered['blocks'] = [];
  for (const block of doc.blocks) {
    if (block.kind === 'calc') {
      const items: RenderedStatement[] = [];
      renderStatements(block.statements, block.options, items);
      blocks.push({ kind: 'calc', items });
    } else {
      const inlines = block.inlines.map((inl) => {
        try {
          const node = parseExpr(inl.expr);
          const v = fmt(run(node));
          return { raw: inl.raw, latex: inl.showName ? `${identifier(inl.expr)} = ${v}` : v, pos: inl.pos };
        } catch (e) {
          const message = e instanceof DependsError ? e.message : wording(e);
          errors.push({ message, pos: inl.pos });
          return { raw: inl.raw, latex: '?', error: message, pos: inl.pos };
        }
      });
      blocks.push({ kind: 'prose', mdast: block.mdast, inlines });
    }
  }
  return { frontMatter: doc.frontMatter, blocks, errors, scope };
}

export type { Pos };
