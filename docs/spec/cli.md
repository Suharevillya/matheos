# CLI surface

Decided in [CLI surface](https://github.com/Suharevillya/matheos/issues/14). Package
`@matheos/cli`, binary `matheos`, Node ≥ 20, `npm i -g @matheos/cli` or `npx @matheos/cli`.

## Commands

```
matheos render <file.mth>... [-o <out>] [--chrome <path>]
matheos check  <file.mth>... [--json]
matheos install-chrome
```

- `render`: format by the `-o` extension, `.pdf` or `.html`; default `<name>.pdf` beside the
  source. With several inputs `-o` must be a directory.
- `check`: parse and evaluate, report errors and failed checks, write nothing.
- No `watch` in v1. Inputs are a plain list; no glob expansion.

## Output

Human output of `check`, compiler style, one finding per line, then a summary per file:

```
beam.mth:18:1 error: cannot add m and a number
beam.mth:52 check failed: V_Ed ≤ 0.5 V_pl,Rd  η = 1.07
beam.mth: 4 checks, 1 failed, 1 error
```

`check --json` prints one object per file:

```json
{ "file": "beam.mth",
  "errors": [{ "message": "cannot add m and a number", "line": 18, "column": 1 }],
  "checks": [{ "line": 52, "left": "V_Ed", "right": "0.5 V_pl_Rd", "verdict": false, "eta": 1.07 }],
  "values": { "M_Ed": { "value": 112.5, "unit": "kN·m" } } }
```

`render` has no `--json`.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | document has errors (parse, units, evaluation) |
| 2 | document valid, at least one check failed (`render` still writes the file) |
| 3 | usage or I/O error: missing file, no Chromium |

## HTML

Self-contained single file: CSS, KaTeX, Figtree and JetBrains Mono fonts inlined as data URIs
(about 600 KB). The PDF path renders that same file from a temporary path with
`page.pdf({ preferCSSPageSize: true, printBackground: true })`.

## Chromium

`puppeteer-core` + `@puppeteer/browsers`. Lookup order: `--chrome <path>`, `MATHEOS_CHROME`,
the cache in `~/.cache/matheos/`, a system Chrome or Edge. `install-chrome` downloads
`chrome-headless-shell` into the cache (CI); `render` downloads it on the first PDF with a
one-line notice. Offline with nothing found: exit 3 with the install instruction.

Build-time check: confirm `chrome-headless-shell` honours `@page` margin boxes; if not, download
full Chrome for Testing instead.
