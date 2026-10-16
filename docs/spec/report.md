# Report design

Decided in [Report design](https://github.com/Suharevillya/matheos/issues/11) against the prototype
on branch `prototype/report` (`docs/prototypes/report/`, variant A of three). One print theme;
editor themes are separate.

## Page

- A4 only. Margins 22 mm top, 18 mm right, 20 mm bottom, 22 mm left. Text width 170 mm.
- `@page` margin boxes (Chrome ≥ 131), so the browser print dialog and the CLI produce the same
  pages: top-left `title`, top-right `project · Rev <revision>`, bottom-left
  `author · date · code`, bottom-right `Page x of y`.
- First page opens with a title block: `# heading` and `title · project` left, `logo` and
  `author · date · Rev` plus `code` right, under a 1.5 pt rule. The logo is not in the running
  header.

## Typography

- Prose and headings: Figtree, 10.5 pt / 1.45. Captions, inline values in prose, badges, η,
  header and footer: JetBrains Mono, 8–8.5 pt. Math: KaTeX fonts at body size.
- All fonts bundled (`@fontsource/figtree`, `@fontsource/jetbrains-mono`, KaTeX), so CLI and
  offline browser output are identical. No network fonts.
- `h2` with a thin bottom rule; prose is CommonMark rendered plainly.

## Statements

- Single column, math indented 6 mm, left-aligned, display-mode KaTeX (full-size fractions).
- Input: one per line, always. Caption right-aligned on the same line, mono, grey.
- Derived: the three-line render on one line when it fits, caption right-aligned on its first
  line. Clause references like `(6.13)` are ordinary captions.
- Check: both sides on the left; on the right edge of the line, a pill badge `✓ OK` (green) or
  `✗ FAIL` (red) with glyph and word so greyscale print still reads, `η = 0.50` in mono, then the
  caption (badges right-aligned since the editor review, 2026-10-16).
- Conditional: condition line (`condition → evaluated`, with the same badge on the right), taken
  branch indented with a thin left rule.
- `hide` / `results` / `;` / `:` as the grammar says.

## Page breaks

- Never inside a statement, a check, or a condition line with its branch.
- A heading keeps with the block after it.
- A math block may split between statements.
- Tables may split; the header row repeats.

## Out of this note

Verdict wording and colours are fixed here; where errors appear on a printed page is the
validation strategy's decision. Localisation of header strings is still fog.
