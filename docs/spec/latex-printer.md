# Expression-to-LaTeX printer

Decided in [Expression-to-LaTeX printer rules](https://github.com/Suharevillya/matheos/issues/7).
Matheos owns the printer: math.js parses, the printer walks the node tree. Every rule below is a
test case. Output targets KaTeX.

## Identifiers

| Rule | Source | LaTeX |
|---|---|---|
| First `_` opens the subscript, later `_` become commas | `W_pl_y` | `W_{pl,y}` |
| Subscript text is italic, like the base (KaTeX default) | `M_Ed` | `M_{Ed}` |
| Greek lookup runs on the base and on every subscript segment | `gamma_M0`, `sigma_x_eps` | `\gamma_{M0}`, `\sigma_{x,\varepsilon}` |
| Aliases: `eps`/`epsilon` → `\varepsilon`, `phi` → `\phi`, `varphi` → `\varphi` | `eps` | `\varepsilon` |
| Capitals: `Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega` | `Delta_T` | `\Delta_{T}` |
| Unicode Greek normalised to the command | `γ_M0` | `\gamma_{M0}` |
| Multi-letter non-Greek segment → `\mathit{}` (kerned word, still italic) | `cls`, `A_s_min` | `\mathit{cls}`, `A_{s,\mathit{min}}` |
| Single letters and digits as-is | `I_y`, `e_1` | `I_{y}`, `e_{1}` |
| Trailing `'` is a prime | `f_y'` | `f_{y}'` |
| Symbol bound in scope at that line → variable (italic); unbound → unit (`\mathrm`) | `d` with `d = 20 mm` above | `d` |

Units in the substituted and result lines come from the values, never from symbol names.
Whether a variable may shadow a unit name is the units policy's rule, not the printer's.

## Operators

| Rule | Source | LaTeX |
|---|---|---|
| Explicit `*` → `\cdot` | `W_pl_y * f_y` | `W_{pl,y} \cdot f_{y}` |
| Implicit product → thin space | `q_Ed L` | `q_{Ed}\,L` |
| Number followed by exactly one symbol → glued | `2 r`, `9 eps` | `2r`, `9\varepsilon` |
| Number followed by more factors → thin space | `384 E I_y` | `384\,E\,I_{y}` |
| `/` → `\frac` | `L / 250` | `\frac{L}{250}` |
| A chain of `/` flattens to one fraction | `A_v f_y / sqrt(3) / gamma_M0` | `\frac{A_{v}\,f_{y}}{\sqrt{3}\,\gamma_{M0}}` |
| `/` then `*` keeps the later factor outside | `a / b * c` | `\frac{a}{b}\,c` |
| `/` inside an exponent stays inline | `x^(1/2)` | `x^{1/2}` |
| `^` wraps the exponent | `L^2` | `L^{2}` |
| Parentheses: `auto`, emitted only where LaTeX precedence needs them, as `\left( \right)` | `(b - t_w - 2 r) / 2` | `\frac{b - t_{w} - 2r}{2}` |
| | `(a + b) c` | `\left(a + b\right)\,c` |
| Comparisons | `<=`, `>=`, `==`, `<`, `>` | `\le`, `\ge`, `=`, `<`, `>` |
| Unary minus | `-x` | `-x` |

## Functions and matrices

| Source | LaTeX |
|---|---|
| `sqrt(x)` | `\sqrt{x}` |
| `abs(x)` | `\left\lvert x \right\rvert` |
| `min(a, b)`, `max(a, b)` | `\min\left(a, b\right)`, `\max\left(a, b\right)` |
| `sin cos tan exp ln log` | `\sin\left(x\right)` etc. |
| `floor(x)`, `ceil(x)` | `\lfloor x \rfloor`, `\lceil x \rceil` |
| any other built-in | `\operatorname{name}\left(args\right)` |
| user function `f(x)` | `f\left(x\right)` (italic name, scope rule) |
| `pi`, `e` | `\pi`, `e` (italic) |
| `[1, 2; 3, 4]` | `\begin{bmatrix} 1 & 2 \ 3 & 4 \end{bmatrix}` |
| boolean value | `\mathrm{true}`, `\mathrm{false}` |

A function definition `f(x) = x^2 + 1` prints one line, formula only. A call does not expand the
body in the substituted line: `y = f(3) = 10`.

## The three lines

A derived statement prints formula, substituted, result:

```
M_{Ed} = \frac{q_{Ed}\,L^{2}}{8} = \frac{25\,\mathrm{kN/m} \cdot (6.0\,\mathrm{m})^{2}}{8} = 112.5\,\mathrm{kN{\cdot}m}
```

Substituted line:

| Rule | Example |
|---|---|
| Every product is `\cdot`; no juxtaposition between numbers | `25\,\mathrm{kN/m} \cdot 6.0\,\mathrm{m}` |
| Input symbol → its literal as typed, digits and unit | `6.0\,\mathrm{m}`, `8356\cdot10^{4}\,\mathrm{mm}^{4}` |
| Derived symbol → its result-line text (display unit, result digits) | `526.3\,\mathrm{kN}` |
| Value with a unit under `^` → parenthesised | `(6.0\,\mathrm{m})^{2}` |
| Negative value after an operator → parenthesised | `a \cdot (-3.2\,\mathrm{kN})` |
| Literals in the formula are echoed as typed | `\sqrt{\frac{235\,\mathrm{MPa}}{355\,\mathrm{MPa}}}` |

Collapse: a line identical to the previous one is dropped. `x = 2 * 3` prints `x = 2 \cdot 3 = 6`;
`M = M_Ed` prints `M = M_{Ed} = 112.5\,\mathrm{kN{\cdot}m}`; an input prints one line.

Check and `if` condition lines print each side as `formula = value` with no substitution step,
collapsed per side (a literal side prints once):

```
V_{Ed} = 150\,\mathrm{kN} \le 0.5\,V_{pl,Rd} = 263.2\,\mathrm{kN}
\frac{x}{d} = 0.31 \le 0.45
```

Verdict glyph and colour are report design.

## Numbers

| Rule | Example |
|---|---|
| 4 significant digits, trailing zeros trimmed | `112.5`, `7.32`, `0.5`, `50` |
| Utilisation `η`: fixed 2 decimals | `0.50`, `1.07` |
| `\cdot10^{n}` outside `[1e-3, 1e6)` | `8.356\cdot10^{7}` |
| Document override: front matter `digits: 3` | |
| Decimal separator `.`; locale formats are not in v1 | |
| Per-statement digit override: not in v1 | |

## Units

| Rule | Example |
|---|---|
| Upright, thin space after the number | `25\,\mathrm{kN/m}` |
| Product `\cdot`, division `/`, never negative exponents | `\mathrm{kN{\cdot}m/m}` |
| Exponents outside `\mathrm` | `\mathrm{mm}^{2}` |
| Predefined `kNm` prints by its display name `kN·m` (display names live in the units table) | `112.5\,\mathrm{kN{\cdot}m}` |
| `deg` → `^\circ`, `%` glued | `30^\circ`, `12\%` |

## Inline values in prose

`{expr}` prints the result-line text in KaTeX inline mode. `{name =}` prints `name = value`:
`{F_v_Ed =}` → `F_{v,Ed} = 50\,\mathrm{kN}`.
