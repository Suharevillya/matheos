# Matheos

Calculation documents for structural engineers: prose and unit-aware math in one plain-text
file, evaluated top to bottom, shown live and printed as a report.

## Language

**Document**:
One plain-text `.mth` file: YAML front matter, Markdown prose, and calc
blocks. The unit of editing, evaluation and printing.
_Avoid_: Sheet, notebook, script, worksheet

**Front matter**:
The YAML header of a document carrying its metadata (title, project, author, date,
revision). Feeds the report header and footer.

**Calc block**:
A fenced block inside a document holding statements, one per line. The editor presents it
as a cell; evaluation runs its lines in order.
_Avoid_: Cell, code block, math block

**Statement**:
One line of a calc block: an assignment, a bare expression, or a check. Evaluated once,
in document order, against the variables defined above it.
_Avoid_: Formula, equation, expression (an expression is only the right-hand side)

**Assignment**:
A statement that binds a name to a value: an input (`f_y = 355 MPa`) or a derived value
(`M_Rd = W_pl * f_y / gamma_M0`).

**Check**:
A statement asserting a comparison between two quantities, printed with its verdict and
utilization. What turns a calculation into a verification.
_Avoid_: Assert, test, verification (the whole document is the verification)

**Utilization**:
The ratio demand / capacity reported by a check.
_Avoid_: Ratio, usage, UR

**Inline value**:
A braced expression inside prose (`{M_Ed / M_Rd}`) replaced by its evaluated value when
rendered.

**Display unit**:
The unit a quantity is printed in, chosen per statement with `to` or by the app's default
for that dimension. Never changes the value.
_Avoid_: Output unit, target unit

**Render**:
The three-line presentation of a derived assignment: the symbolic formula, the formula with
values substituted, the result. The default for derived assignments.
_Avoid_: Expand, show steps

**Report**:
The printed form of a document: paged, with header and footer from the front matter, prose
and rendered statements in order.
_Avoid_: Output, export, PDF (the PDF is one carrier of a report)

**Input**:
An assignment whose right-hand side is a literal number, with or without a unit. Prints as one
line.

**Derived**:
An assignment whose right-hand side is an expression. Prints as a render.

**Bare expression**:
A statement with no name, printed as a render without a left-hand side, for intermediate
ratios the engineer wants to see but not keep.

**Caption**:
The text of a trailing comment on a statement, printed beside it (a label or a clause
reference). A comment on its own line prints nothing.

**Conditional**:
An `if` / `else if` / `else` / `end` group inside a calc block. Only the taken branch prints,
after its evaluated condition.

**Modifier**:
A trailing `;` (silent) or `:` (result only) on a statement, or `hide` / `results` on a calc
block.
