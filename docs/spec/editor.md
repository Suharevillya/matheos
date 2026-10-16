# Editor interaction model

Decided in [Editor interaction model](https://github.com/Suharevillya/matheos/issues/12) against
the prototype on branch `prototype/editor` (`docs/prototypes/editor/`, variants B and C).
CodeMirror 6, one document, Markdown mode plus a decoration field for math blocks.

## Modes

One layout and two toggles, both remembered (changed 2026-10-16 on the editor review from four
modes):

| Toggle | Options |
|---|---|
| preview | off: editor centred (max 980 px); on: report preview slides in on the right, 50/50, no drag handle, same renderer as print |
| editor style | **source**: plain text only, results as text at line end (no KaTeX inside math blocks); **rendered**: a math block renders as the report block while the cursor is outside it, click or arrow in to edit, the full KaTeX render below each derived line while inside |

Under 700 px the preview, when on, replaces the editor. Scrollbars are thin everywhere. The
preview keeps its scroll position across re-evaluations; editor and preview scroll
independently (coupling removed on review, 2026-10-16). The block under the cursor is outlined
in the preview.

## Results in the editor

Source is never hidden. Every math block line gets a tinted background; fence lines are muted.

| Statement | Shown |
|---|---|
| input | nothing (the literal is the value) |
| derived | source style: `= 112.5 kN·m` as text at line end; rendered style (cursor inside the block): the full three-line KaTeX render below the statement, on the math-block background with the accent line at the left |
| check | at line end: `✓ OK 50%` / `✗ FAIL 107%` badge with the utilization as a percent |
| condition line | at line end: badge and the evaluated comparison as text |
| error | wavy underline on the line, message in red at line end, gutter dot |
| depends on a failed statement | `…` in place of the value |

`{expr}` in prose is replaced by a mono chip with the value while the cursor is outside it, raw
text while inside. An unknown name shows `?` in red.

Evaluation is live on every edit, debounced about 100 ms. No run key. No fence toolbar: block
options are typed in the info string, blocks move by cut and paste.

## Preview pane

Rendered with the report renderer. It scrolls to the top visible editor line; the block under
the cursor is highlighted; an error prints in red inside its block. No problems panel in v1.

## Theme and keys

- Follows the system theme by default; manual light/dark toggle, remembered. Print is always
  the light report theme. A colour input in the toolbar overrides the editor background
  (remembered, with a reset); the other tokens stay with the theme.
- Markdown tokens are coloured from the theme tokens, never CodeMirror defaults, so both themes
  read.
- `Ctrl+P` and the `pdf` button print the report pane (the browser dialog saves it as PDF; on
  Firefox and Safari a notice points to Chrome, Edge or the CLI); `Ctrl+S` saves; `Tab` in a
  math block inserts two spaces; `Ctrl+/` toggles a `#` comment. Everything else is CodeMirror
  default.

## Mobile

Same inline layout; captions and line numbers hidden; preview as a full-screen tab. Nothing
else dropped. File handling and offline are the PWA ticket's decisions.
