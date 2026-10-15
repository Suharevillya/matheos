# PDF pipeline research: Markdown + math calculation docs → print-quality PDF (CLI + browser/PWA)

Researched 2026-10-15 against primary sources only (official docs, GitHub source/README, npm registry API, vendor CDNs). Version/size numbers were read from the npm registry JSON (`registry.npmjs.org/<pkg>`), jsDelivr's file listing, or `HEAD` requests on the vendors' own download URLs on that date. Where a source could not be reached, it is said so.

Context recap: TypeScript app (web/PWA editor + Node CLI). Input = Markdown prose + math statements with units. Output = (a) live inline results in the editor, (b) a clean PDF with KaTeX-style math, headers/footers, page numbers, optional logo + metadata block. Must run from CLI (CI/agents) and from the browser (ideally offline), ideally pixel-identical.

---

## 1. HTML + KaTeX → headless Chromium (Puppeteer / Playwright) → PDF

### What the engine gives you

| Capability | Status | Source |
|---|---|---|
| Header/footer via `headerTemplate` / `footerTemplate` (HTML with classes `date`, `title`, `url`, `pageNumber`, `totalPages`); `displayHeaderFooter` is off by default | Supported, Chromium-only API | Puppeteer `PDFOptions` – https://pptr.dev/api/puppeteer.pdfoptions ; Playwright `page.pdf` – https://playwright.dev/docs/api/class-page#page-pdf |
| Template limits: "Script tags inside templates are not evaluated." "Page styles are not visible inside templates." (you must inline the CSS in the template string) | Limitation | https://playwright.dev/docs/api/class-page#page-pdf |
| `preferCSSPageSize` – CSS `@page { size }` wins over `format`/`width`/`height`; `printBackground`; `format` defaults to Letter; `tagged` (experimental, default on) = accessible PDF; `outline` (experimental, default off) = PDF bookmarks | Supported | https://pptr.dev/api/puppeteer.pdfoptions |
| Default media is `print`; colors are adjusted for print unless `-webkit-print-color-adjust: exact` | Behaviour to know | https://pptr.dev/api/puppeteer.page.pdf ; https://playwright.dev/docs/api/class-page#page-pdf |
| CSS `@page` margin boxes (`@top-center`, `@bottom-right`, … 16 boxes) with `counter(page)` and `counter(pages)` | Shipped in **Chrome 131** (Oct 2024): "From Chrome 131 you can use CSS to add content to the margins of pages when they are printed." | https://developer.chrome.com/blog/print-margins ; https://developer.chrome.com/blog/new-in-chrome-131 |
| `string-set` / `string()` (running headers that copy the current `h2` text) | **Not** in Chromium; listed under "Future possibilities" with a Chromium bug link | https://developer.chrome.com/blog/print-margins |
| `break-inside: avoid` (+ `page-break-inside` alias) | Baseline "Widely available" since Jan 2019 | https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside |
| `@page` (size, margin, named pages, `:first/:left/:right`) | Baseline 2024 "Newly available" (Dec 2024); caniuse: Chrome ≥15, Firefox ≥95, Safari ≥18.2 | https://developer.mozilla.org/en-US/docs/Web/CSS/@page ; https://caniuse.com/css-paged-media |
| `marks`/`bleed` | "no browsers support these" | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_paged_media |

Takeaway: since Chrome 131 you can put page numbers, a title and a logo (as `content: url(...)` / background) in margin boxes **with pure CSS**, which is the only header/footer mechanism that also works in the browser's own print dialog. Puppeteer's `headerTemplate` is a CLI-only extra. Running headers that change per section (`string-set`) are not available in either path without Paged.js.

### KaTeX in this pipeline

- KaTeX `output` option values: `html`, `mathml`, `htmlAndMathml` (default). No SVG output. https://katex.org/docs/options
- Browser/print needs the CSS + font files; "The fonts/ directory must stay alongside the CSS file." https://katex.org/docs/browser
- katex 0.19.0, MIT, 20 WOFF2 fonts totalling ~254 KiB (jsDelivr listing of `katex@0.19.0`). https://registry.npmjs.org/katex ; https://data.jsdelivr.com/v1/packages/npm/katex@0.19.0?structure=flat
- Rendering KaTeX HTML in Chromium's PDF output embeds the fonts as real text (selectable/searchable) – this is simply Chromium printing HTML; nothing math-specific is required.

### Chromium download weight (CLI/CI)

Measured with `HEAD` on the URLs listed in Google's own Chrome-for-Testing manifest (`last-known-good-versions-with-downloads.json`), Stable 155.0.8059.79, 2026-10-15:

| Binary | win64 | linux64 | mac-arm64 |
|---|---|---|---|
| `chrome` (full; what Puppeteer's default "new headless" uses) | 197.9 MiB | 189.2 MiB | 183.7 MiB |
| `chrome-headless-shell` (old headless; `headless: 'shell'`) | 119.4 MiB | 118.6 MiB | 97.6 MiB |

Sources: manifest https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json ; Puppeteer headless modes (new headless is default; `chrome-headless-shell` "ships as a separate binary", "more performant for automation tasks where the complete Chrome feature set is not needed") https://pptr.dev/guides/headless-modes ; cache dir `~/.cache/puppeteer` https://pptr.dev/guides/configuration .

Playwright: docs show installed sizes `chromium-XXXXXX: 281M` and offer `npx playwright install --with-deps --only-shell` to download only the headless shell for CI. https://playwright.dev/docs/browsers . Playwright 1.64.1 bundles Chromium build 1248 = 156.0.8078.4 (`browsers.json` in `playwright-core@1.64.1`). Licenses: puppeteer 25.14.0 and playwright 1.64.1 are Apache-2.0 (registry).

### Browser side: `window.print()`

- `window.print()` opens the print dialog for the current document; blocks while open; `beforeprint`/`afterprint` events. Nothing on the page can set the filename or the browser's own header/footer lines. https://developer.mozilla.org/en-US/docs/Web/API/Window/print
- Paged.js's own instructions for getting a clean PDF from the dialog (same applies to any HTML): set Margins "none", untick "Headers and footers", tick "Background graphics". https://pagedjs.org/en/documentation/2-getting-started-with-paged.js/ – these are user-side toggles you cannot automate.
- Because the print dialog uses the same Blink print pipeline as `page.pdf()`, the same HTML+CSS produces the same pagination in Chrome ≥131 **if** the user keeps default scale and the stylesheet sets `@page { size; margin }` and margin boxes. Firefox/Safari users get their engine's rendering (Safari only gained `@page` in 18.2; margin-box support outside Chromium is not documented by Chrome's post, which says only "Chrome and Firefox support the @page at-rule").
- iOS standalone (home-screen) PWA printing: only old Apple forum reports of broken print in fullscreen web apps were found (https://developer.apple.com/forums/thread/22911); no current primary statement. Treat as untested risk; the fallback is "open in Safari and print".
- Offline: works fully offline in a PWA (KaTeX fonts and CSS are static assets; no Chromium download in-browser).

---

## 2. Paged.js (CSS Paged Media polyfill in the browser)

- What: "Display paginated content in the browser and generate print books using web technology"; polyfills Paged Media + Generated Content; Chunker ("Chunks up a document into paged media flows") + Polisher ("Converts @page css to classes, and applies counters and content"). MIT. https://github.com/pagedjs/pagedjs
- Package: `pagedjs` 0.4.3, published **2023-07-06**, MIT, 5.9 MB unpacked, `dist/paged.polyfill.js` 0.88 MiB. https://registry.npmjs.org/pagedjs ; https://data.jsdelivr.com/v1/packages/npm/pagedjs@0.4.3?structure=flat
- Activity: GitHub `main` still receives merges (latest 2026-10-06, "fix(following): preserve nth-child formulas containing plus signs"), ~201 open issues, ~1.5k stars, but no npm release since mid-2023. https://github.com/pagedjs/pagedjs/commits/main ; https://github.com/pagedjs/pagedjs
- Maintainers: Adam Hyde (founder), Julien Taquet, Fred Chasen, Gijs de Heij. https://pagedjs.org/
- Features documented: `counter(page)`, `counter(pages)` (reset only to 1), `string-set` + `string()` with `first/start/last/first-except`, `position: running()` + `element()`, all 16 margin boxes rendered with CSS grid/flexbox, `:blank`. https://pagedjs.org/en/documentation/7-generated-content-in-margin-boxes/
- Supported-feature matrix (page dated 2019): `break-before/after` page/left/right and `break-inside: avoid` supported; `break-inside: avoid-page` **not**; footnotes, leaders, bookmarks, `box-decoration-break` **not**; `:blank`/`:nth()` open issues. https://pagedjs.org/en/documentation/14-supported-feature-of-the-w3c-specifications/
- PDF output: in the browser it only prepares the DOM; you still use the browser's "Save as PDF" with the dialog settings above. It cannot drive the dialog. For automation there is `pagedjs-cli` 0.4.3 (2023-07-20, MIT) = Paged.js + Puppeteer, with `--outline-tags`, `--additional-script`, `--timeout`. https://pagedjs.org/en/documentation/2-getting-started-with-paged.js/ ; https://github.com/pagedjs/pagedjs-cli ; https://registry.npmjs.org/pagedjs-cli . Pandoc also accepts `--pdf-engine=pagedjs-cli`. https://pandoc.org/MANUAL.html
- KaTeX: no documentation either way. A GitHub issue search of `pagedjs/pagedjs` for "katex" and "mathjax" returns a single unrelated issue (#145, TOC page numbers). https://github.com/pagedjs/pagedjs/issues?q=katex . Inference (not a sourced fact): KaTeX HTML is ordinary inline spans, so the Chunker should flow it like any inline content; display math (`.katex-display`) is a block that should get `break-inside: avoid`. Verify with a prototype.
- Consistency: Paged.js removes the dependency on the browser's native pagination (it builds page boxes as normal DOM), so Chrome/Firefox/Safari print the *same* pre-paginated DOM. That is its real value vs. plain `window.print()`; the cost is a 0.9 MB script, a layout pass before every print, and a project whose last npm release is three years old.

---

## 3. Typst as the PDF engine

### Typst itself

- Apache-2.0; latest **v0.15.1** (2026-07-17). Install: brew/winget/cargo/snap/Docker or release binaries; `typst update` self-updates. https://github.com/typst/typst ; https://github.com/typst/typst/releases/latest
- Binary size (HEAD on release assets): `typst-x86_64-pc-windows-msvc.zip` **21.4 MiB**, `typst-x86_64-unknown-linux-musl.tar.xz` **16.7 MiB**. https://github.com/typst/typst/releases/download/v0.15.1/typst-x86_64-pc-windows-msvc.zip
- Fonts: CLI embeds Libertinus Serif, New Computer Modern, New Computer Modern Math, DejaVu Sans Mono; priority `--font-path` > system fonts > embedded; `--ignore-system-fonts` for reproducible CI output; default text font `libertinus serif`; last-resort fallback on by default. https://typst.app/docs/reference/text/text/
- Page model: `page(paper: "a4" default, margin, header, footer, numbering, background)`; `header` "Fills the top margin of each page"; `counter(page).display(...)` in a custom footer; `background` for watermarks/logos. https://typst.app/docs/reference/layout/page/
- Math: `$...$` inline, `$ ... $` (with spaces) display; **own syntax, not LaTeX** (`frac(a,2)`, `mat(1,2;3,4)`, `x_(a -> epsilon)`, auto-scaled delimiters, `/` makes fractions); requires OpenType math fonts (NCM Math embedded). https://typst.app/docs/reference/math/ ; https://typst.app/docs/guides/guide-for-latex-users/
- LaTeX math inside Typst: **MiTeX** (Apache-2.0) parses LaTeX math → Typst; WASM plugin ~185 KB; `#mi(...)` / `#mitex(...)`; limitations around packages and text mode. https://github.com/mitex-rs/mitex
- HTML export: experimental, "still very incomplete and only available for experimentation behind a feature flag" (`--features html`), "Do not use this feature for production use cases." https://typst.app/docs/reference/html/
- Official WASM/npm package: **none**. The typst README mentions only the CLI, the closed web app and Tinymist; the architecture doc describes a `World` trait that abstracts "CLI, web app, etc." but no JS artifact is published. https://github.com/typst/typst ; https://github.com/typst/typst/blob/main/docs/dev/architecture.md . The npm package named `typst` (0.10.0-8, 2023-12-18) is from `typst-community/typst.js`, not the Typst org. https://registry.npmjs.org/typst

### typst.ts (Myriad-Dreamin) – the de-facto JS binding

- Third-party (personal GitHub account), Apache-2.0. Packages: `@myriaddreamin/typst.ts` (wrapper), `typst-ts-web-compiler` (WASM compiler), `typst-ts-renderer` (WASM renderer), `typst.react` / `typst.angular`. Rust crates not on crates.io "since it has the git dependency on typst". https://github.com/Myriad-Dreamin/typst.ts
- Versions: all 0.7.0, published 2026-05-31/06-01; 0.7.0 "Bumped typst to v0.14.2"; pre-release v0.8.0-rc3 tracks Typst 0.15.0-rc.1 (lags the Typst CLI by about one minor). https://registry.npmjs.org/@myriaddreamin/typst.ts ; https://github.com/Myriad-Dreamin/typst.ts/releases
- Bundle sizes (jsDelivr listing): `typst_ts_web_compiler_bg.wasm` **27.0 MiB**; `typst_ts_renderer_bg.wasm` 0.93 MiB; `all-in-one-lite.bundle.js` 0.20 MiB. https://data.jsdelivr.com/v1/packages/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0?structure=flat
- Browser API: `$typst.pdf({ mainContent })`, `$typst.svg(...)`, `$typst.canvas(...)`, `addSource`, `mapShadow` (binary files). `all-in-one.bundle.js` "includes all required resources, so the compiler can run offline after the file is downloaded"; the lite bundle fetches Wasm + fonts from a CDN at runtime. Font-loading options (`preloadFonts`, `loadFonts`, `disableDefaultFontAssets`) exist but their docs section is marked "todo: fully document". README: "all-in-one.bundle.js will download the font assets from GitHub in browser". https://myriad-dreamin.github.io/typst.ts/cookery/guide/all-in-one.html ; https://github.com/Myriad-Dreamin/typst.ts
- Node API: `@myriaddreamin/typst-ts-node-compiler` is an N-API native addon with 11 per-platform optional dependencies; `NodeCompiler.create({ workspace, fontArgs: [{ fontPaths | fontBlobs }] })`, `.pdf()`, `.svg()`; embedded fonts are the final fallback after `fontArgs` and system fonts; call `evictCache()` periodically. https://myriad-dreamin.github.io/typst.ts/cookery/guide/all-in-one-node.html ; https://github.com/Myriad-Dreamin/typst.ts/blob/main/packages/typst.node/README.md ; https://registry.npmjs.org/@myriaddreamin/typst-ts-node-compiler
- Other community binding: `typst-wasm` (org `typst-wasm`, MIT, ~40 stars, fonts shipped separately as `@typst-wasm/fonts`). Not official either. https://github.com/typst-wasm/typst-wasm ; https://forum.typst.app/t/typst-wasm-compile-typst-in-browsers-node-and-serverless-runtimes/9399

### Assessment

Transpiling "Markdown + math statements" → Typst markup is feasible (Pandoc already ships a `-t typst` writer: https://pandoc.org/MANUAL.html). Node side is native and fast; browser side is a 27 MiB WASM plus fonts you must self-host for offline. Output would be byte-identical between CLI and browser because it is the same compiler. Math quality is excellent (OpenType math, NCM Math embedded) but the math must be converted from LaTeX-style to Typst syntax (your own generator, or MiTeX), and the on-screen preview would be Typst SVG rather than HTML – a second rendering stack next to the editor's HTML/KaTeX view.

---

## 4. LaTeX-free JS PDF generators (pdfmake, @react-pdf/renderer, pdf-lib, jsPDF) + math as SVG

| Library | Version / license / size (registry) | SVG support | Verdict for KaTeX-grade math |
|---|---|---|---|
| pdfmake | 0.3.11 (2026-06-12), MIT, 15.3 MB unpacked | `svg:` node takes an SVG **string** (or `SVGElement`, ≥0.2.22); conversion by SVG-to-PDFKit. https://pdfmake.github.io/docs/0.1/document-definition-object/svgs/ | SVG-to-PDFKit: shapes, `text/tspan/textPath`, gradients, clip/mask; **no filters, no `foreignObject`**; fonts matched by name pattern or `fontCallback`; repo "no longer updated", points to a Fidus Writer fork. https://github.com/alafr/SVG-to-PDFKit |
| @react-pdf/renderer | 4.9.0 (2026-08-27), MIT | Component tree only (`Svg`, `Path`, `Text`, `Tspan`, `G`, `Defs`, `ClipPath`, gradients…); no documented raw-string prop. https://react-pdf.org/svg ; https://react-pdf.org/docs/v4/svg/svg | Would need an SVG-string → React-element converter. Fonts: "only TTF and WOFF fonts files are supported" (no WOFF2). https://react-pdf.org/fonts |
| pdf-lib | 1.17.1 (**2021-11-06**), MIT, 279 open issues | `drawSvgPath` (path data only). README: "does not support the use of HTML or CSS when adding content to a PDF" and suggests Puppeteer for that. https://github.com/Hopding/pdf-lib ; https://pdf-lib.js.org/ | Low-level; no text layout/wrapping. Not a document renderer. |
| jsPDF | 4.2.1 (2026-03-17), MIT, 30 MB unpacked | `html()` goes through html2canvas ("image settings when converting HTML to image") → raster; `svg2pdf.js` 2.8.1 (MIT, yWorks) adds `doc.svg(element)` but "supports only a limited part of the SVG specification", needs a real DOM (no JSDOM), fonts must be registered with jsPDF first. https://raw.githack.com/MrRio/jsPDF/master/docs/module-html.html ; https://github.com/yWorks/svg2pdf.js | Vector route exists only in a browser DOM; Node needs a headless browser anyway. |

Math → SVG feed:
- KaTeX cannot emit SVG (options are `html` / `mathml` / `htmlAndMathml`). https://katex.org/docs/options
- MathJax SVG output draws every glyph as **paths** ("uses SVG data instead of font files"), so the SVG is self-contained and needs no fonts in the PDF library; `fontCache: 'local'` (default) keeps each expression standalone, `'none'` inlines every path. Works in Node via `mathjax-full` (3.2.2, Apache-2.0, 34 MB unpacked) or the MathJax v4 Node demos with LiteDOM. https://docs.mathjax.org/en/latest/output/svg.html ; https://docs.mathjax.org/en/latest/options/output/svg.html ; https://github.com/mathjax/MathJax-demos-node
- Consequence: math becomes outlines (not selectable text), the baseline of inline math must be aligned by hand in each library's layout model, and all prose layout (lists, tables, code, headings, page breaks) has to be re-implemented in that library's document model. None of these libraries renders HTML. This path only makes sense if a Chromium/WASM dependency is forbidden.

---

## 5. Pandoc (CLI only)

- pandoc 3.12.1 (released 08 Oct): `pandoc-3.12.1-windows-x86_64.zip` **40.2 MiB**, `linux-amd64.tar.gz` **33.7 MiB** (HEAD on release assets). https://github.com/jgm/pandoc/releases/latest
- PDF: "By default, pandoc will use LaTeX to create the PDF." `--pdf-engine` accepts `pdflatex, lualatex, xelatex, latexmk, tectonic, wkhtmltopdf, weasyprint, pagedjs-cli, prince, context, groff, pdfroff, typst`; default engine is `pdflatex` (LaTeX), `weasyprint` (HTML), `typst` (Typst). Markdown math via `tex_math_dollars` (`$…$`, `$$…$$`). https://pandoc.org/MANUAL.html
- LaTeX dependency weight: recommends MiKTeX (Windows), TeX Live via package manager (Linux), BasicTeX/TinyTeX on macOS "Because a full MacTeX installation uses four gigabytes of disk space". https://pandoc.org/installing.html
- wkhtmltopdf route: project status page (2020) says Qt 4 "hasn't been supported since 2015, the WebKit in it hasn't been updated since 2012" and "Do not use wkhtmltopdf with any untrusted HTML." https://wkhtmltopdf.org/status.html
- Verdict: pandoc + (LaTeX | typst | pagedjs-cli) is a fine CI-only path (Lua filters can handle a custom fenced-div block), but it adds a 35–40 MB binary plus a TeX distribution or Typst, has no browser story, and would give a *different* look from the editor. It does not reduce the number of renderers; it adds one.

---

## 6. Markdown parsing in TypeScript (prose + custom "math statement" block)

| | markdown-it | remark / unified (micromark + mdast) | micromark alone |
|---|---|---|---|
| Version / license | 15.0.2 (2026-09-11), MIT, 1.97 MB unpacked | remark-parse 11.0.0, unified 11.0.5, mdast-util-from-markdown 2.1.0 (2026-10-03), all MIT | 4.0.3 (2026-09-26), MIT, "±14kb" |
| Output | Flat **token stream**, not an AST ("Why not an AST? It's not needed for our tasks"); nested inline tokens in `children` | **mdast** tree; every non-generated node has `position: {start, end}` with `line`, `column`, `offset` (unist spec) | Concrete token events, "every byte is accounted for, with positional info" |
| Source positions | `Token.map` = "Source map info. Format: `[ line_begin, line_end ]`" – **lines only, block tokens only**; `block`: "True for block-level tokens, false for inline tokens." (from `markdown-it@15.0.2/dist/markdown-it.d.mts`) | Line/column/**character offset** on block *and inline* nodes | Same positional info at token level |
| Custom block syntax | Block/inline rules via `md.block.ruler` / `md.inline.ruler`; docs warn the inline parser "skips pieces of texts to optimize speed" and only stops at a fixed set of start characters; `markdown-it-container` 4.0.0 for `:::` blocks | `remark-directive` 4.0.0: `:inline[]`, `::leaf[]`, `:::container{#id .class key=val}` (CommonMark generic-directives proposal) → you map `containerDirective` nodes to whatever; or a micromark syntax extension | Syntax extensions are state-machine tokenizers; README says writing them is complex |
| Math plugins | `markdown-it-katex` 2.0.3 (**2016**); `@vscode/markdown-it-katex` 1.1.2 (2025-07, Microsoft, "used by VS Code", pandoc-style `$` rules); `markdown-it-texmath` 1.0.0 (2022) | `remark-math` 6.0.0 (`micromark-extension-math` + `mdast-util-math`, `singleDollarTextMath` option) + `rehype-katex` 7.0.1 renders at build time | `micromark-extension-math` |
| Sources | https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md ; https://github.com/markdown-it/markdown-it/blob/master/docs/development.md ; https://github.com/microsoft/vscode-markdown-it-katex | https://github.com/syntax-tree/unist#position ; https://github.com/remarkjs/remark-directive ; https://github.com/remarkjs/remark-math/blob/main/packages/remark-math/readme.md | https://github.com/micromark/micromark |

Also relevant: the CodeMirror Markdown mode is built on **@lezer/markdown** 1.8.0 (MIT), an incremental CommonMark parser with its own extension API (`MarkdownConfig` with `defineNodes`, `parseBlock`, `parseInline`); it only parses, no HTML. https://github.com/lezer-parser/markdown . If the math-statement block is a *fenced code block with an info string* (e.g. ```` ```calc ````) or a `:::calc` container, all three parsers (markdown-it, micromark/remark, Lezer) already tokenize it with positions and no custom syntax rule is needed.

---

## 7. Editor technology (brief)

| | CodeMirror 6 | Monaco | ProseMirror / Tiptap |
|---|---|---|---|
| License / size | MIT; `@codemirror/view` 6.43.14 (1.26 MB unpacked), `@codemirror/state` 0.44 MB, `@codemirror/lang-markdown` 0.07 MB | MIT; `monaco-editor` 0.57.0, **101.7 MB unpacked** | ProseMirror MIT (`prosemirror-view` 1.42.6); Tiptap 3.32.0 core MIT, Pro extensions/Cloud paid |
| Inline computed results | Decorations: mark / **widget** ("insert a DOM element at a given position"; "Widgets can be inline elements or blocks") / replace / line; block widgets "must be provided directly" via a `StateField` | Not covered by README; FAQ: mobile browsers "No" | Node views ("miniature UI components for individual nodes") + node/widget/inline decorations |
| Mobile / PWA | "Use the platform's native selection and editing features on phones." | Unsupported on mobile | Site lists desktop browsers; no mobile statement |
| Who uses it for Markdown+math docs | **JupyterLab 4**: "CodeMirror … has been updated to CodeMirror 6", "far more efficient" for many-cell notebooks; **Obsidian**: "Obsidian uses CodeMirror 6 (CM6) to power the Markdown editor" (plugin extensions = plain CM6 extensions) | VS Code's editor extracted; not a document editor | **Quarto visual editor** (`packages/editor` depends on 14 `prosemirror-*` packages) |
| Sources | https://codemirror.net/docs/guide/ ; https://codemirror.net/examples/decoration/ ; https://codemirror.net/ ; https://jupyterlab.readthedocs.io/en/stable/getting_started/changelog.html ; https://docs.obsidian.md/Plugins/Editor/Editor+extensions | https://github.com/microsoft/monaco-editor | https://prosemirror.net/docs/guide/ ; https://prosemirror.net/ ; https://tiptap.dev/docs/editor/getting-started/overview ; https://github.com/quarto-dev/quarto/blob/main/packages/editor/package.json |

Observable: no primary doc found describing its editor stack (only community forum posts saying it is CodeMirror-based); treat as unverified.

Jupyter-style cells vs one document: JupyterLab 4 is many CM6 instances (one per cell) plus output areas. Obsidian "live preview" is one CM6 instance with block/inline widgets. For a *single plain-text document* where results attach to statements, one CM6 instance with block widgets (Obsidian pattern) is the smaller build; a cell UI is only needed if cells must be reordered/executed independently.

---

## Recommendation

### PDF pipeline: one renderer – HTML + KaTeX + print CSS, Chromium in both places

- **CLI:** render the same HTML string, open it in Playwright/Puppeteer Chromium, `page.pdf({ preferCSSPageSize: true, printBackground: true })`. Page headers/footers, page numbers, logo and metadata block come from CSS `@page` margin boxes + `counter(page)` / `counter(pages)` (Chrome ≥131), **not** from `headerTemplate`, so the browser path can reproduce them. Use `--only-shell` / `chrome-headless-shell` (~100–120 MiB) in CI.
- **Browser/PWA:** same HTML + same stylesheet, `window.print()`; KaTeX CSS/fonts are static assets so it works offline. Output matches the CLI when the user is on Chromium ≥131 and leaves scale/margins at the CSS values (the stylesheet sets them; the user only needs to untick "Headers and footers").
- **Deciding reason:** the editor already needs an HTML/KaTeX view for live results; reusing it for print means one layout, one stylesheet, one math renderer, and the only extra dependency is Chromium in CI. Every alternative (Typst, pdfmake + MathJax-SVG, pandoc) adds a second rendering stack whose look must be kept in sync with the editor by hand.
- **Main risk:** non-Chromium browsers (Safari ≥18.2 has `@page`, but margin-box support is not documented outside Chromium) and iOS standalone-PWA printing. Mitigation, in order: (1) tell users to print from Chrome/Edge or download the CLI PDF; (2) if cross-browser identical pagination becomes a real requirement, add **Paged.js** in front of `window.print()` – same HTML, same CSS, plus `string-set` running headers – accepting its 0.9 MB and 2023-era npm release; (3) if print fidelity must beat Blink (true justification, widows/orphans control, footnotes), switch the PDF leg to **Typst** via `typst-ts-node-compiler` (CLI) + the 27 MiB WASM (browser) and generate Typst markup from the same AST; keep the HTML view for editing only.

### Markdown parser: micromark / mdast (`mdast-util-from-markdown` + `remark-math` + `remark-directive`)

- **Deciding reason:** every node, including inline math, carries `line/column/offset` positions (unist spec), which is exactly what mapping computed results back to editor ranges needs; markdown-it only gives block-level line ranges. `remark-math` and `remark-directive` already exist and are current, so the "math statement" block can be a `:::calc` container or a ```` ```calc ```` fence with zero custom tokenizer code; `rehype-katex` renders the same tree to the HTML used for both screen and print.
- **Main risk:** if the statement syntax later needs its own inline grammar, a micromark syntax extension is "complex" by the maintainers' own warning; keep the block syntax fence/directive-based to avoid that. Also note the editor highlights with @lezer/markdown, a different parser – acceptable because both are CommonMark and the block is a fence/directive both recognise.

### Editor: CodeMirror 6 (single document, block widgets for results)

- **Deciding reason:** MIT, ~1.8 MB unpacked across the core packages vs 100 MB for Monaco, explicit mobile support, and the exact pattern (Markdown source + inline/block widgets) is what Obsidian and JupyterLab 4 ship on. Results go in as `Decoration.widget({ block: true })` provided from a `StateField`; no cell framework required.
- **Main risk:** it is a code editor, not WYSIWYG; if the product later needs rich-text editing of prose (tables, drag-and-drop), that is ProseMirror/Tiptap territory (Quarto's choice) and a rewrite of the editing layer, though the parser/renderer/PDF pipeline above would be unaffected.

### Evidence gaps (honest)
- npmjs.com pages return 403 to fetchers; all package facts come from `registry.npmjs.org` JSON and jsDelivr listings instead.
- GitHub REST API was rate-limited during this session; release dates/sizes were taken from the release HTML pages and `HEAD` on the download URLs.
- No primary source documents Paged.js + KaTeX behaviour, Chromium margin-box support in Safari/Firefox, or iOS-PWA printing; each is flagged above as needing a prototype.
