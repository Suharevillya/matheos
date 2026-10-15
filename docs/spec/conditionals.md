# Block-level conditionals

Decided in [Block-level conditionals](https://github.com/Suharevillya/matheos/issues/9).
Syntax from the grammar; this note fixes the semantics and the print rules.

## Syntax

```
if <condition>
  <statements>
else if <condition>
  <statements>
else
  <statements>
end
```

- Inside a calc block only. `end` is required and closes the innermost `if`.
- Nesting is unlimited. Indentation is ignored.
- The `if` line takes no modifier; `;` and `:` on statements inside branches work as usual.
- `a ? b : c` is rejected: `use if / else`.

## Conditions

A condition is a comparison (`<=`, `>=`, `<`, `>`, `==`), or `and` / `or` / `not` of
comparisons. Anything else is an error: `condition must be a comparison`. Units in a comparison
follow the units policy (`cannot compare kN·m with kN`).

## Evaluation

Top to bottom; the first true branch runs, the rest are skipped. A name bound only in a skipped
branch is undefined afterwards (`undefined name "x"` when used). Branches need not bind the same
names. Rebinding an existing name is allowed anywhere; last wins.

## Printing

Only the taken branch prints, preceded by one **condition line**:

| Taken branch | Condition line |
|---|---|
| `if` / `else if` | its own condition, evaluated: `c_f/t_f = 5.28 ≤ 9ε = 7.32` |
| `else` | the last condition above it, operator negated: `c_f/t_f = 12.0 > 10ε = 8.13` |

Negation: `<=`→`>`, `<`→`≥`, `>=`→`<`, `>`→`≤`, `==`→`≠`; a compound condition is wrapped as
`not (…)`.

Each side prints as `formula = value` with no substitution step (printer rule for checks); a
literal side prints once. `==` against a literal that equals the other side prints that side
once: `if cls == 1` → `cls = 1`. Compounds print with the words `and`, `or`, `not`.

Block options: `results` omits the condition line and prints result-only statements; `hide`
prints nothing.
