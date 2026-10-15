# One renderer: HTML + KaTeX, printed to PDF by Chromium

The editor already needs an HTML/KaTeX view for live results, so the report is the same HTML
with print CSS (`@page` margin boxes, Chrome ≥ 131), printed by `window.print()` in the browser
and by headless Chromium in the CLI. Typst, LaTeX, pandoc and pdfmake were rejected because each
adds a second rendering stack whose look must be kept in sync with the editor by hand. The cost
accepted: Chromium in CI, and non-Chromium browsers print with their own engine. See
`docs/research/pdf-pipeline.md` and `docs/spec/report.md`.
