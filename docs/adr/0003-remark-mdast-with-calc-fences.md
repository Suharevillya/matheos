# remark / mdast as the parser, calc blocks as fenced code

Documents are CommonMark with calc blocks as ```` ```calc ```` fences and `{expr}` inlines, so
`remark-parse` + `remark-frontmatter` already tokenise everything with `line/column/offset`
positions (needed to map results and errors back into the editor); fences also degrade to code
blocks on GitHub. `remark-directive` (`:::calc`) and `remark-math` were rejected as unneeded, and
markdown-it because it lacks inline positions. Statement lines and `{expr}` get two tiny own
parsers; math.js parses expressions. See `docs/research/pdf-pipeline.md` (parser section) and
`docs/spec/architecture.md`.
