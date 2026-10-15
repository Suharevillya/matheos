# Units policy

Decided in [Units policy](https://github.com/Suharevillya/matheos/issues/8). math.js carries the
values and dimensions; Matheos owns the unit table, the display rule and the error wording.

## Unit table (v1)

| Dimension | Units | Notes |
|---|---|---|
| length | `mm cm m km` | area, volume, moduli via `^`: `mm^2`, `mm^3`, `mm^4` |
| mass | `g kg t` | `t` = tonne |
| time | `s` | |
| force | `N kN MN` | |
| moment | `Nm kNm MNm` | predefined products; `kN m`, `kN*m` parse to the same unit |
| pressure / stress | `Pa kPa MPa GPa` | `N/mm^2`, `kN/m^2` accepted as compounds |
| angle | `rad deg` | |
| temperature | `K` | no offset units |
| energy / power | `J kJ W kW` | |

Not in v1: `%`, imperial, custom units (`units:` front matter or a `unit` statement), `kN/m2`
without `^`. Any other spelling is `unknown unit "…"`.

Display names (printer): `kNm` → `kN·m`, `kNm/m` → `kN·m/m`, otherwise the spelling as typed.

## Names

Scope wins. A name bound in the document is a variable from that line on, also directly
after a literal (`t = 10 mm` then `25 t` is 25·t). Nothing is reserved; the table is curated so
that day, hour, ampere, litre and other colliding units do not exist.

## Display unit

A statement with `to <unit>` prints in that unit. Without `to`:

1. If the result carries a single table unit (any exponent), keep it: `a = L` prints `6.0 m`.
2. Otherwise convert to the default of its dimension:

| Dimension | Default |
|---|---|
| length | mm |
| area | mm² |
| volume, section modulus | mm³ |
| second moment of area | mm⁴ |
| force | kN |
| moment | kN·m |
| line load | kN/m |
| pressure, stress, area load | MPa |
| mass | kg |
| density | kg/m³ |
| angle | deg |
| dimensionless | plain number |
| anything else | math.js SI simplification |

Display units are fixed: no automatic prefix. `0.0005 kN·m` prints `5·10⁻⁴ kN·m`.

## Angles

Angle is a dimension (math.js). Trig functions take `deg`, `rad` or a bare number (radians);
inverse trig returns `rad`, displayed as `deg` by default. An angle inside a product keeps its
dimension; convert with `to` or divide by `1 rad`. Nothing is stripped silently.

## Mixing numbers and quantities

math.js semantics, no coercion: number × quantity is fine; number ± quantity, comparing a
number with a quantity, and a quantity in an exponent are errors. A result whose units cancel
is a plain number for every purpose.

## Errors

Lowercase, display names, attached to the statement:

```
cannot add kN and m
cannot subtract kN·m and kN
cannot compare kN·m with kN
cannot convert kN·m to kN
exponent must be a number, got mm
sin expects an angle or a number, got kN
unknown unit "kpa"
```

Where errors appear in the editor and the report is the validation strategy's decision.

## Precision

No per-dimension precision; the printer's number rule applies (4 significant digits, η with
2 decimals).
