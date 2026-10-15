# Core architecture and package boundaries

Decided in [Core architecture and package boundaries](https://github.com/Suharevillya/matheos/issues/13).
ADRs: `docs/adr/0001` engine, `0002` PDF pipeline, `0003` parser.

## Packages

npm workspaces, FrameLab conventions (`main: ./src/index.ts`, `tsc` build, vitest, TypeScript
strict, zod 4, Vite 7 + React 19 + zustand + Tailwind 4 in web):

| Package | Role | Depends on |
|---|---|---|
| `@matheos/core` | parse → Document → evaluate → Rendered → HTML. Zero DOM. | mathjs, remark-parse, remark-frontmatter, yaml, katex, zod |
| `@matheos/cli` | commands over core, headless Chromium for PDF | core |
| `@matheos/web` | CodeMirror editor, preview, PWA | core |

The HTML report renderer is the core subpath `@matheos/core/html`: Rendered → HTML string via
`katex.renderToString`. CLI and web call the same function, so the PDF matches the preview.

Core layout: `src/parse/` (remark pipeline, statement line parser, `{expr}` plugin),
`src/units/` (unit table, math.js instance with `createUnit`, display-unit rule),
`src/printer/` (math.js Node → LaTeX), `src/evaluate/`, `src/html/`. One math.js instance, built
in core with the curated units, numeric type `number`.

## Models

Plain TypeScript types; zod only for the front matter (and later CLI config).

```
Document  { frontMatter, blocks: Block[] }
Block     = Prose { mdast, inlines: Inline[] }
          | Calc  { options: { hide?, results? }, statements: Statement[], pos }
Statement = Input | Derived | Bare | Check | If { branches: { condition?, statements }[] } | Comment
            each { raw, pos, expr?: MathNode, caption?, modifier?: ';' | ':', to?: string }
Inline    { expr, showName: boolean, pos }
Pos       { start: { line, column, offset }, end: { line, column, offset } }   // from mdast
```

```
Rendered  { blocks: RenderedBlock[], errors: { message, pos }[], scope: Map<string, Value> }
per statement { kind, formula?, substituted?, result?, caption, verdict?, eta?, error? }  // LaTeX strings
per inline    { value }                                                                   // LaTeX string
```

## Evaluation

`parse(text): Document`, `evaluate(doc): Rendered`, `toHtml(rendered, frontMatter): string`.
The whole document is re-evaluated on every change (no incremental evaluation in v1). Core
never throws on a bad document: a failed statement is recorded in `errors`, evaluation
continues, and statements that depend on it carry `error: "depends on <name>"` (the editor shows
`…`). Collapse rules, number formatting and display units are applied when Rendered is built,
so renderers only typeset.

## KaTeX

Rendered holds LaTeX strings. `@matheos/core/html` and the editor's inline widgets typeset them;
nothing else in core touches the DOM.

## Not here

CLI commands and Chromium acquisition: CLI surface. Tests and golden documents: validation
strategy. File handling and offline: PWA ticket.
