# math.js as the engine, with an app-owned LaTeX printer and units layer

math.js is the only small (≈200 KB gzip), maintained, Apache-2.0, browser-and-Node engine with an
expression tree, units and matrices in one package. Its `toTex` and unit formatter are not
report-grade (`M_Ed` → `M\_Ed`, `kN·m` prints as `kJ`), so Matheos keeps math.js for parsing
and evaluation only and owns the Node → LaTeX printer (`docs/spec/latex-printer.md`) and the
unit table with its display rule (`docs/spec/units.md`). A CAS (compute-engine, nerdamer) was
rejected for v1: 1.2 MB gzip or no units, and nothing symbolic is in the v1 scope. See
`docs/research/math-engines.md`.
