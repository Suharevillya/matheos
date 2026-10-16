// Document and Rendered models, docs/spec/architecture.md.
import type { Root, RootContent } from 'mdast';

export interface Point { line: number; column: number; offset: number }
export interface Pos { start: Point; end: Point }

export interface FrontMatter {
  title?: string; project?: string; author?: string; date?: string; revision?: string;
  code?: string; logo?: string; digits?: number;
  [key: string]: unknown;
}

export type Modifier = ';' | ':';
export type CmpOp = '<=' | '>=' | '<' | '>' | '==';

interface Base { raw: string; pos: Pos; caption?: string; modifier?: Modifier }
export interface Input extends Base { kind: 'input'; name: string; expr: string }
export interface Derived extends Base { kind: 'derived'; name: string; expr: string; to?: string }
export interface Bare extends Base { kind: 'bare'; expr: string; to?: string }
export interface Check extends Base { kind: 'check'; left: string; op: CmpOp; right: string }
export interface Comment extends Base { kind: 'comment' }
export interface Branch { condition?: string; pos: Pos; statements: Statement[] }
export interface If extends Base { kind: 'if'; branches: Branch[] }
export type Statement = Input | Derived | Bare | Check | Comment | If;

export interface Inline { raw: string; expr: string; showName: boolean; pos: Pos }
export interface Prose { kind: 'prose'; mdast: RootContent; inlines: Inline[]; pos: Pos }
export interface CalcOptions { hide?: boolean; results?: boolean }
export interface Calc { kind: 'calc'; options: CalcOptions; statements: Statement[]; pos: Pos }
export type Block = Prose | Calc;

export interface Document { frontMatter: FrontMatter; blocks: Block[]; mdast: Root }

// ---- Rendered: LaTeX strings only ----

export interface RenderedStatement {
  kind: 'input' | 'derived' | 'bare' | 'check' | 'cond';
  latex: string;          // the whole line, pieces joined with " = "
  caption?: string;
  verdict?: boolean;      // checks and condition lines
  eta?: string;           // checks, 2 decimals
  error?: string;
  indent?: boolean;       // inside a taken branch
  pos: Pos;
}
export interface RenderedInline { raw: string; latex: string; error?: string; pos: Pos }
export interface RenderedProse { kind: 'prose'; mdast: RootContent; inlines: RenderedInline[]; pos: Pos }
export interface RenderedCalc { kind: 'calc'; items: RenderedStatement[]; pos: Pos }
export type RenderedBlock = RenderedProse | RenderedCalc;

export interface RenderedError { message: string; pos: Pos }
export interface Rendered {
  frontMatter: FrontMatter;
  blocks: RenderedBlock[];
  errors: RenderedError[];
  scope: Map<string, unknown>;
}
