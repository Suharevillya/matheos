# Validation cases

Hand-verified numbers for `examples/*.mth`, the source of truth for `core/test/golden.test.ts`
(docs/spec/validation.md). One line per derived statement: value, then the derivation.

## steel-beam.mth (IPE 300, S355, L = 6.0 m, q_Ed = 25 kN/m, q_ser = 18 kN/m)

| Statement | Value | Derivation |
|---|---|---|
| M_Ed | 112.5 kN·m | 25 · 6² / 8 |
| V_Ed | 75 kN | 25 · 6 / 2 |
| ε | 0.8136 | √(235/355) |
| c_f | 56.45 mm | (150 − 7.1 − 2·15) / 2 |
| c_f / t_f | 5.276 | 56.45 / 10.7 |
| 9ε | 7.323 | 9 · 0.81362 = 7.3225 → 7.323 |
| M_c,Rd | 223.1 kN·m | 628.4e3 · 355 / 1.0 = 223.08e6 N·mm |
| η bending | 0.50 | 112.5 / 223.1 = 0.5043 |
| V_pl,Rd | 526.3 kN | 2568 · 355 / √3 / 1.0 = 526.3e3 N |
| η shear | 0.14 | 75 / 526.3 |
| 0.5 V_pl,Rd | 263.2 kN | |
| η | 0.28 | 75 / 263.2 |
| δ | 17.31 mm | 5 · 18 · 6000⁴ / (384 · 210 000 · 8356e4) N/mm, mm, N/mm², mm⁴ |
| δ_lim | 24 mm | 6000 / 250 |
| η deflection | 0.72 | 17.31 / 24 |

## concrete-slab.mth, bolted-connection.mth

Snapshot-tested; hand verification pending (owner). Calcpad twins: pending.
