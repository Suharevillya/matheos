---
name: matheos-authoring
description: Write and verify Matheos `.mth` calculation documents (Markdown prose + unit-aware calc blocks for structural engineering checks). Use when asked to produce a calculation, a Eurocode check, or a report in Matheos format, or to fix a `.mth` file that `matheos check` rejects.
---

# Writing Matheos documents

A `.mth` file is CommonMark with YAML front matter and fenced `calc` blocks. Statements run top
to bottom; every derived statement prints formula, substituted values and result; every `check`
prints a verdict and the utilization η. Start from the closest file in
`examples/` (https://github.com/Suharevillya/matheos/tree/main/examples); `steel-beam.mth` is
the canonical template.

## 1. Front matter

```yaml
---
title: Simply supported floor beam
project: Example building, axis B
author: Name
date: 2026-10-15
revision: A
code: EN 1993-1-1 + Finnish NA
---
```

## 2. Statements, one per line inside ```` ```calc ```` fences

| Form | Example | Prints |
|---|---|---|
| input | `L = 6.0 m        # span` | `L = 6.0 m` + caption |
| derived | `M_Ed = q_Ed * L^2 / 8` | formula = substituted = result |
| bare expression | `c_f / t_f` | the three stages, no name |
| check | `check M_Ed <= M_c_Rd` | both sides with values, ✓/✗, η |
| conditional | `if c_f / t_f <= 9 eps` … `else if` … `else` … `end` | taken branch only, after its condition |
| comment | `# own line` or trailing `# caption` | nothing / right-aligned caption |

An input is a literal number with an optional unit. Anything else is derived. `check` needs the
keyword; a bare comparison is just a boolean. Rebinding a name is allowed; last wins.

## 3. Identifiers

`[A-Za-z_][A-Za-z0-9_]*`. First `_` opens a subscript, later `_` become commas:
`W_pl_y` → W_{pl,y}, `M_c_Rd` → M_{c,Rd}. Spelled Greek renders as the letter:
`gamma_M0`, `alpha_cc`, `eps`, `lambda`, `eta`, `phi`, `delta`, `sigma`. Trailing `'` is a prime.

## 4. Units

Write the unit after the number: `25 kN/m`, `355 MPa`, `8356e4 mm^4`, `60 kNm/m`. Available:
`mm cm m km`, `g kg t`, `s`, `N kN MN`, `Nm kNm MNm`, `Pa kPa MPa GPa`, `rad deg`, `K`,
`J kJ W kW`, and compounds with `^`, `*`, `/` (`kN/m^2`, `N/mm^2`). Units combine through
arithmetic; a result prints in a sensible default (mm, kN, kN·m, kN/m, MPa) unless you end the
statement with `to <unit>`: `M_c_Rd = W_pl_y * f_y / gamma_M0 to kNm`. `to` never changes the
stored value. A bound name wins over a unit of the same spelling (`t = 10 mm` makes `t` a
variable from then on). Adding a number to a quantity, or comparing them, is an error.

## 5. Checks and η

`check <expr> <op> <expr>` with `<=`, `>=`, `<`, `>`, `==`. η = left / right (right / left for
`>=` and `>`). Write one check per demand/capacity pair.

## 6. Conditionals

```
if c_f / t_f <= 9 eps
  cls = 1
else if c_f / t_f <= 10 eps
  cls = 2
else
  cls = 3
end
```

Conditions are comparisons, optionally joined with `and`, `or`, `not`. Only inside calc blocks.

## 7. Inline values in prose

`{cls}` prints the value, `{M_Ed / M_c_Rd}` a computed ratio, `{F_v_Ed =}` prints `F_v,Ed = 50 kN`.

## 8. Modifiers and block options

Trailing `;` evaluates silently, trailing `:` prints the result line only. Fence options:
```` ```calc hide ```` (evaluate, print nothing), ```` ```calc results ```` (result lines only).

## 9. Not in v1

Loops, imports, section catalogs (`IPE300.W_pl_y`), ternary `? :`, `solve`, `derivative`,
`integrate`, plots, tables with computed cells, custom units, `%`, imperial units.

## 10. Six mistakes that cost a round-trip

1. `kN/m2` — write `kN/m^2`.
2. `a / b c` means a/(b·c): implicit multiplication binds tighter than `/`. Write `a / b * c`
   when you mean (a/b)·c.
3. A comparison without `check` prints a boolean, not a verdict.
4. `L + 5` — a number plus a quantity is an error; give the literal a unit.
5. Unit spelling: `kpa`, `Mpa`, `kN.m` are unknown; use `kPa`, `MPa`, `kNm` or `kN m`.
6. `x = a ? b : c` — not supported; use `if` / `else` / `end`.

## 11. Engineering guidance

SI inputs with a unit on every literal. `to` on every resistance so the report reads in kN and
kN·m. A `check` for every demand/capacity pair. Captions carry clause numbers (`# (6.13)`).
Prose explains; calc computes.

## 12. The feedback loop

```
matheos check doc.mth --json      # errors with line/column, checks with verdict and eta, values
matheos render doc.mth            # doc.pdf beside the source; -o doc.html for HTML
```

Exit codes: 0 ok · 1 document errors · 2 a check failed · 3 usage, missing file or no Chromium.
Fix every error first, then every failed check that is not intended, then render. Never read
the PDF to verify; the JSON is the loop.

## 13. Template

Copy `examples/steel-beam.mth` from the repository and replace section by section.
