// .mth text -> Document, docs/spec/grammar.md and docs/spec/architecture.md.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import YAML from 'yaml';
import type { Root, RootContent, Text } from 'mdast';
import type { Block, Branch, CmpOp, Document, FrontMatter, Inline, Modifier, Pos, Statement } from './model.js';

const IDENT = /^([A-Za-z_Ͱ-Ͽ][\wͰ-Ͽ']*)\s*=(?!=)\s*(.+)$/;
const LITERAL = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(\s+[A-Za-z][\w^/*.-]*)?$/i;
const CMP = /(<=|>=|==|<|>)/;
const TO = /\s+to\s+(\S+)$/;

export function parse(text: string): Document {
  const root = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(text) as Root;
  const lineStart = [0]; // offset of each line start, 0-based line index
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStart.push(i + 1);
  const lineOf = (line: number, col = 1) => ({ line, column: col, offset: (lineStart[line - 1] ?? 0) + col - 1 });

  let frontMatter: FrontMatter = {};
  const blocks: Block[] = [];
  for (const node of root.children) {
    if (node.type === 'yaml') { frontMatter = (YAML.parse(node.value) as FrontMatter) ?? {}; continue; }
    const pos = node.position as Pos;
    if (node.type === 'code' && node.lang === 'calc') {
      const opts = (node.meta ?? '').split(/\s+/);
      const lines = node.value.split('\n');
      const first = pos.start.line + 1;
      const posOf = (i: number): Pos => ({ start: lineOf(first + i), end: lineOf(first + i, (lines[i]?.length ?? 0) + 1) });
      const statements = parseStatements(lines, 0, lines.length, posOf);
      blocks.push({ kind: 'calc', options: { hide: opts.includes('hide'), results: opts.includes('results') }, statements, pos });
    } else {
      blocks.push({ kind: 'prose', mdast: node as RootContent, inlines: inlinesOf(node as RootContent), pos });
    }
  }
  return { frontMatter, blocks, mdast: root };
}

function inlinesOf(node: RootContent): Inline[] {
  const out: Inline[] = [];
  const visit = (n: RootContent) => {
    if (n.type === 'text') {
      const t = n as Text;
      for (const m of t.value.matchAll(/\{([^{}]+)\}/g)) {
        const body = m[1]!.trim();
        const showName = /\s*=$/.test(body);
        const expr = body.replace(/\s*=$/, '').trim();
        const start = t.position!.start.offset! + m.index!;
        out.push({ raw: m[0], expr, showName, pos: { start: { ...t.position!.start, offset: start } as Inline['pos']['start'], end: { ...t.position!.start, offset: start + m[0].length } as Inline['pos']['end'] } });
      }
    } else if ('children' in n) (n.children as RootContent[]).forEach(visit);
  };
  visit(node);
  return out;
}

/** Statement lines of one calc block; recursive so `if` consumes its own `end`. */
function parseStatements(lines: string[], from: number, to: number, posOf: (i: number) => Pos): Statement[] {
  const out: Statement[] = [];
  let i = from;
  while (i < to) {
    const raw = lines[i]!;
    const s = raw.trim();
    const pos = posOf(i);
    if (s === '') { i++; continue; }
    if (s.startsWith('#')) { out.push({ kind: 'comment', raw, pos }); i++; continue; }
    if (/^if\s/.test(s)) {
      const branches: Branch[] = [];
      let cond: string | undefined = s.slice(3).trim();
      let bStart = i + 1, bPos = pos, depth = 0, j = i + 1;
      for (; j < to; j++) {
        const t = lines[j]!.trim();
        if (/^if\s/.test(t)) depth++;
        else if (t === 'end') { if (depth === 0) break; depth--; }
        else if (depth === 0 && (/^else if\s/.test(t) || t === 'else')) {
          branches.push({ condition: cond, pos: bPos, statements: parseStatements(lines, bStart, j, posOf) });
          cond = t === 'else' ? undefined : t.slice(8).trim();
          bStart = j + 1; bPos = posOf(j);
        }
      }
      branches.push({ condition: cond, pos: bPos, statements: parseStatements(lines, bStart, j, posOf) });
      out.push({ kind: 'if', raw, pos, branches });
      i = j + 1; continue;
    }
    out.push(parseStatement(raw, pos));
    i++;
  }
  return out;
}

function parseStatement(raw: string, pos: Pos): Statement {
  let s = raw;
  let caption: string | undefined;
  const hash = s.indexOf('#');
  if (hash >= 0) { caption = s.slice(hash + 1).trim(); s = s.slice(0, hash); }
  s = s.trim();
  let modifier: Modifier | undefined;
  if (s.endsWith(';') || s.endsWith(':')) { modifier = s.slice(-1) as Modifier; s = s.slice(0, -1).trim(); }
  const base = { raw, pos, ...(caption !== undefined && { caption }), ...(modifier && { modifier }) };

  if (s.startsWith('check ')) {
    const body = s.slice(6);
    const m = CMP.exec(body);
    if (!m) return { kind: 'bare', ...base, expr: body };
    return { kind: 'check', ...base, left: body.slice(0, m.index).trim(), op: m[1] as CmpOp, right: body.slice(m.index + m[1]!.length).trim() };
  }
  let to: string | undefined;
  const tm = TO.exec(s);
  if (tm) { to = tm[1]; s = s.slice(0, tm.index).trim(); }

  const am = IDENT.exec(s);
  if (am && !s.includes('(') || (am && s.indexOf('(') > s.indexOf('='))) {
    const [, name, rhs] = am as unknown as [string, string, string];
    if (!to && LITERAL.test(rhs)) return { kind: 'input', ...base, name, expr: rhs };
    return { kind: 'derived', ...base, name, expr: rhs, ...(to && { to }) };
  }
  return { kind: 'bare', ...base, expr: s, ...(to && { to }) };
}
