# Matheos

Calculation documents for structural engineers: a plain-text `.mth` file mixing Markdown prose
with unit-aware math statements, evaluated top to bottom, shown live in a minimal editor and
printed as a clean report with KaTeX math.

Status: **walking skeleton**. The v1 spec is complete (`docs/spec/README.md`); the core
evaluates the three example documents, the CLI checks and renders them to HTML, the web app is
a textarea with a live preview. PDF, the CodeMirror editor and the PWA come next.

```
npm install
npm run build          # core, cli, web
npm test
node cli/dist/main.js check examples/steel-beam.mth
node cli/dist/main.js check examples/steel-beam.mth --json
node cli/dist/main.js render examples/steel-beam.mth -o beam.html
npm run dev -w web     # http://localhost:5173
```

- `examples/` — the ground truth for the format.
- `docs/spec/` — the v1 spec, one note per decision; `docs/adr/` — the three architecture decisions.
- `docs/research/` — primary-source research the spec rests on.
- `CONTEXT.md` — the glossary.

License: MIT.
