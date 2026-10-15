# Statement grammar

Decided in [Statement grammar, by example](https://github.com/Suharevillya/matheos/issues/6).
The documents in `examples/` are the ground truth; this note describes what they use.

## Document

A `.mth` file: optional YAML front matter, then Markdown. Prose is CommonMark. Math lives in
fenced blocks tagged `calc`. Everything a Markdown renderer does not understand degrades to a
code block, so the file still reads on GitHub.

Front matter keys the report uses: `title`, `project`, `author`, `date`, `revision`, `code`,
`logo` (path). Unknown keys are kept and ignored.

## Calc block

````
```calc [option ...]
<statement>
<statement>
```
````

One statement per line. Blank lines allowed. Options in the info string: `hide` (evaluate,
print nothing), `results` (print result lines only, as `:` on every line).

Each statement is one of:

| Form | Example | Prints |
|---|---|---|
| Input | `L = 6.0 m` | `L = 6.0 m` |
| Derived | `M_Ed = q_Ed * L^2 / 8` | formula, substituted, result (three-line render) |
| Bare expression | `c_f / t_f` | `c_f / t_f = 5.28` (three-line render, no name) |
| Check | `check M_Ed <= M_c_Rd` | `M_Ed = 112.5 kN·m ≤ M_c,Rd = 223.1 kN·m  ✓  η = 0.50` |
| Conditional | `if … / else if … / else / end` | the taken branch only, its evaluated condition first |
| Comment | `# text` | nothing on its own line; a right-aligned caption when trailing |

A statement is an **input** when its right-hand side is a literal number with or without a
unit; it prints as one line. Anything else is **derived** and prints three lines.

### Modifiers

- Trailing `;` — evaluate, print nothing.
- Trailing `:` — print the result line only.
- `to <unit>` at the end of an expression — the display unit of that statement. Does not
  change the value stored.

### Expressions

math.js syntax: `^` power, implicit multiplication (`q_Ed L`, `5 q_ser L^4`, `9 eps`),
`sqrt`, `min`, `max`, `pi`, `e`, comparison operators in checks and conditions, function
definition `f(x) = …`, matrices `[1, 2; 3, 4]`. Units are written after numbers (`25 kN/m`,
`8356e4 mm^4`) and combine through arithmetic. A bare unit name after a number is a unit
unless the document has bound that name above: scope wins (see `units.md`). `kNm` and
`kNm/m` are predefined derived units.

### Identifiers

`[A-Za-z_][A-Za-z0-9_]*` plus unicode letters. Rendering: first `_` opens a subscript, each
further `_` becomes a comma inside it (`W_pl_y` → W_{pl,y}, `M_c_Rd` → M_{c,Rd}). Spelled
Greek (`gamma_M0`, `alpha_cc`, `eps`, `lambda`, `eta`, `phi`, `delta`) renders as the letter;
unicode Greek is accepted as-is. `'` is a prime.

### Checks

`check <expr> <op> <expr>` with `<=`, `>=`, `<`, `>`, `==`. Prints both sides with their
values, the verdict badge, and the utilization `η = left / right` (or `right / left` for
`>=`). The keyword is required; a bare comparison is a boolean value, not a check.

### Conditionals

```
if <condition>
  <statements>
else if <condition>
  <statements>
else
  <statements>
end
```

Inside a calc block only; conditions are numeric. Only the taken branch prints, preceded by
the evaluated condition (`c_f / t_f = 5.28 ≤ 9ε = 7.32`). Conditional prose is not supported
in v1. Nesting, negation for `else`, compound conditions: `conditionals.md`.

## Inline values in prose

`{expr}` in prose prints the value with its display unit (`{cls}` → `1`,
`{M_Ed / M_c_Rd}` → `0.5043`). `{name =}` prints `name = value` (`{F_v_Ed =}` → F_{v,Ed} = 50 kN).

## Not in v1

Loops, imports, catalogs (`IPE300.W_pl_y`), conditional prose, `|` as a `to` alias, plots
syntax (own ticket), tables with computed cells.
