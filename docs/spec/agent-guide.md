# Agent authoring guide

Decided in [Agent authoring guide](https://github.com/Suharevillya/matheos/issues/17).

## What ships

One `SKILL.md` in the Agent Skills format (front matter `name`, `description`; plain Markdown
body) at `skills/matheos-authoring/SKILL.md`, so Claude Code, Codex and other agents can load it.
A root `CLAUDE.md` / `AGENTS.md` points at it. The same file is packaged in `@matheos/cli` and
printed by `matheos guide`, so an agent with only the CLI installed gets it.

## Content, one page, in this order

1. Front matter keys.
2. The statement table from `grammar.md`.
3. Identifiers and Greek.
4. The unit table and the `to` rule; the scope-wins rule; what a dimension error looks like.
5. `check` and η.
6. `if` / `else if` / `else` / `end`.
7. `{expr}` and `{name =}`.
8. Modifiers `;` `:` and block options `hide` / `results`.
9. Not in v1.
10. Six mistakes that cost a round-trip: `kN/m2` without `^`, ternary `? :`, a comparison
    without the `check` keyword, number + quantity, an unknown unit spelling, and `a / b c`
    meaning a/(b·c) (implicit multiplication binds tighter than `/`; write `a / b * c`).
11. Engineering guidance, five lines: SI inputs with a unit on every literal; `to` on every
    resistance; a `check` for every demand/capacity pair; captions carry clause numbers; prose
    explains, math computes.
12. The feedback loop: write `.mth` → `matheos check --json <file>` → fix every error, then
    every failed check that is not intended → `matheos render <file>`. Exit codes 0/1/2/3.
    Agents never read the PDF; the JSON is the loop.
13. `examples/steel-beam.mth` as the canonical template, included by reference; "start from the
    closest file in `examples/`".

## Keeping it true

CI runs `matheos check` on every example, so the template the skill points at cannot drift
from the grammar. The skill never restates a rule the specs own; it links them.
