# Matheos v1 spec

Charted and decided on the wayfinder map
[Matheos v1 spec](https://github.com/Suharevillya/matheos/issues/1), 2026-10-15. Each note
links the ticket that decided it; the ticket's resolution comment is the primary source.
`examples/` are the ground truth for the format; `CONTEXT.md` is the glossary; `docs/adr/`
holds the three architecture decisions; `docs/research/` the research notes.

| Note | Decides |
|---|---|
| [grammar.md](grammar.md) | `.mth` files, calc fences, statement forms, identifiers, checks, conditionals, inline values, not-in-v1 list |
| [latex-printer.md](latex-printer.md) | expression tree → LaTeX: identifiers, operators, functions, the three lines, numbers, unit typography |
| [units.md](units.md) | unit table, scope-wins rule, display-unit rule, angles, mixing, error wording |
| [conditionals.md](conditionals.md) | `if` / `else if` / `else` / `end` semantics and the condition line |
| [symbolic.md](symbolic.md) | nothing symbolic in v1; function-call extension point; user functions |
| [report.md](report.md) | A4 page, margin-box header/footer, fonts, statement layout, badges, page breaks |
| [editor.md](editor.md) | CodeMirror modes, inline results, errors, chips, keys, mobile |
| [architecture.md](architecture.md) | `@matheos/core` / `cli` / `web`, parser pipeline, Document and Rendered models, evaluation |
| [cli.md](cli.md) | `render`, `check --json`, `install-chrome`, `guide`, exit codes, Chromium lookup |
| [pwa.md](pwa.md) | file handling, offline, printing outside Chromium, Fly hosting |
| [validation.md](validation.md) | test layers, golden numbers, snapshots, CI |
| [agent-guide.md](agent-guide.md) | the `SKILL.md` for agents and the `check --json` loop |

## v1 scope fence

Out of v1 (v1.1 candidates, in the map's Out of scope section): loops, imports and catalogs,
conditional prose, `|` as a `to` alias, plots, computed tables and images, ternary, numeric
solve and symbolic functions, localisation, a template library, custom units, the FrameLab
exporter, mobile printing, cloud sync and collaboration.

## Build order

1. `core`: units table and math.js instance → statement parser → printer → evaluate → golden
   tests on `examples/`.
2. `core/html` + `cli`: `check`, `render` to HTML, then PDF through the headless shell.
3. `web`: CodeMirror editor with inline results, preview, PWA, Fly deploy.
4. `skills/matheos-authoring/SKILL.md` and CI.
