# CLAUDE.md

Matheos: plain-text `.mth` calculation documents for structural engineers (Markdown prose +
unit-aware calc blocks), evaluated by `@matheos/core`, checked and rendered by `@matheos/cli`,
edited in `@matheos/web`. npm workspaces, TypeScript strict, vitest.

## Where things are decided

- `docs/spec/README.md` is the entry point: one note per decision, the v1 scope fence, the
  build order. The specs own the rules; code follows them. If code and spec disagree, fix one
  and say which.
- `docs/adr/` holds the three architecture decisions (engine, PDF pipeline, parser).
- `examples/*.mth` are the ground truth for the format; `docs/validation/cases.md` holds the
  hand-verified numbers behind the golden tests.
- `CONTEXT.md` is the glossary; use its terms.
- To write or fix a `.mth` document, read `skills/matheos-authoring/SKILL.md`.

## Working rules

- Laziest working solution: stdlib and existing helpers before new code; no speculative
  abstractions. Mark deliberate shortcuts with a `ponytail:` comment naming the upgrade path.
- Every non-trivial change leaves a test behind (`core/test`, `cli/test`). Spec tables are the
  test fixtures.
- `npm run build && npm run typecheck && npm test && npm run check:examples` must pass before a
  commit. CI runs the same.
- math.js gotcha: implicit multiplication binds tighter than `/` (`a / b c` = a/(b·c)).
