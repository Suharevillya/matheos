# Editor interaction model

Decided in [Editor interaction model](https://github.com/Suharevillya/matheos/issues/12) against
the prototype on branch `prototype/editor` (`docs/prototypes/editor/`, variants B and C).
CodeMirror 6, one document, Markdown mode plus a decoration field for math blocks.

## Modes

Four view modes, toggled in the toolbar and remembered with the theme:

| Mode | Layout |
|---|---|
| editor | source centred (max 980 px), results inline (below) |
| live | as editor, but a math block renders as the report block while the cursor is outside it; click or arrow in to edit (added 2026-10-16 on the editor review) |
| split | editor left, report preview right, fixed 50/50, no drag handle |
| preview | the report full width, same renderer as print |

Under 700 px the split becomes `edit` / `view` tabs. Scrollbars are thin everywhere.

## Results in the editor

Source is never hidden. Every math block line gets a tinted background; fence lines are muted.

| Statement | Shown |
|---|---|
| input | nothing (the literal is the value) |
| derived | a rendered line directly below the statement, indented, display-mode KaTeX, the full three-line render |
| check | at line end: `✓ OK` / `✗ FAIL` badge and `η = 0.50` |
| condition line | at line end: badge and the evaluated comparison |
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
- `Ctrl+P` opens the preview for printing; `Tab` in a math block inserts two spaces; `Ctrl+/`
  toggles a `#` comment. Everything else is CodeMirror default.

## Mobile

Same inline layout; captions and line numbers hidden; preview as a full-screen tab. Nothing
else dropped. File handling and offline are the PWA ticket's decisions.
