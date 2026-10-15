# Validation strategy

Decided in [Validation strategy](https://github.com/Suharevillya/matheos/issues/16). vitest,
`test/` per package, FrameLab conventions.

## Layers

| Layer | Where | What |
|---|---|---|
| printer | `core/test/printer.test.ts` | every row of the tables in `latex-printer.md` and `conditionals.md` as `source → LaTeX` |
| units | `core/test/units.test.ts` | unit table, display-unit rule, every error wording in `units.md` |
| golden documents | `core/test/golden.test.ts` | each `examples/*.mth` → Rendered JSON snapshot (LaTeX strings, values, verdicts), checked against `docs/validation/cases.md` |
| CLI smoke | `cli/test/` | `check --json` on the examples; exit codes 0/1/2/3 using `core/test/fixtures/invalid.mth` |
| PDF smoke | `cli/test/pdf.test.ts` | render one example with `chrome-headless-shell`; assert page count and key values in the extracted text (also proves `@page` margin boxes work in the shell) |

## Golden numbers

`docs/validation/cases.md` lists, per example and per derived statement, the hand-verified value
and its one-line derivation. Calcpad twins of the examples (`docs/validation/calcpad/*.cpd`) are
run once through the local Calcpad CLI; the comparison is recorded in the same note, not in CI.

## Comparison rules

- Formatted result strings compared exactly (the number rule is under test).
- Raw values with relative tolerance 1e-9.
- Rendered JSON snapshots checked in; no HTML snapshots, only HTML smoke assertions on key
  strings.

## CI

GitHub Actions on push and pull request: typecheck, test, build, `matheos check examples/*.mth`
(examples must stay valid), PDF smoke with the headless shell cached by `actions/cache`.

## Fixtures

Deliberately broken documents live in `core/test/fixtures/`, never in `examples/`.
