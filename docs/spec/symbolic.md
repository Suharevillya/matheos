# Symbolic operations and the extension point

Decided in [Numeric solve and the symbolic extension point](https://github.com/Suharevillya/matheos/issues/10).

## v1

Nothing symbolic and no numeric method: no `solve`, `derivative`, `integrate`, `simplify`,
`roots`. The names are reserved; using one errors with `solve is not available in v1`. An
engineer finds a required dimension by editing the input and watching the live result.

## Extension point

Every future symbolic or numeric-method operation is a **function call in expression position**:

```
h = solve(M_Rd(h) == M_Ed, h, 100 mm .. 600 mm)
```

No new statement forms, ever. A later engine (math.js `derivative`, a bracketed root finder,
compute-engine or nerdamer as a CAS) only grows the function table; documents and the grammar
do not change.

## User functions

`f(x) = …` binds late: a call uses the scope at the call line, parameters shadow scope names
inside the body. Rendering is fixed by the printer: definition prints one line, calls are not
expanded.
