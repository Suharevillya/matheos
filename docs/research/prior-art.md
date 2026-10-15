# Prior art: literate engineering-calculation tools

Research date: 2026-10-15. Primary sources only (vendor sites, docs, repos, package registries). Where a vendor page was unreachable (HTTP 403/404) or silent, the gap is stated instead of guessed.

Target idea being compared against: **a plain-text file mixing Markdown prose with math statements (variables, unit-aware formulas, results), edited in a minimalist web app/PWA with Jupyter-style blocks, runnable from a CLI, printable to a clean KaTeX-style PDF, and authorable by AI agents.**

---

## 1. Calcpad

| | |
|---|---|
| What | "Free and open source software for mathematical and engineering calculations"; a programmable calculator plus HTML report generator. C#/.NET. Created 2014 by Nedelcho Ganchovski, Proektsoft EOOD. ([Wikipedia](https://en.wikipedia.org/wiki/Calcpad), [README on Codeberg](https://codeberg.org/proektsoft/Calcpad)) |
| Source location | **The GitHub repo `Proektsoftbg/Calcpad` now returns 404** (GitHub API `NotFound`; the user profile shows 0 public repos). Canonical source is the Codeberg mirror [codeberg.org/proektsoft/Calcpad](https://codeberg.org/proektsoft/Calcpad), last commit 2026-04-29 ("Update vscode package"). Forks of the old GitHub repo exist (e.g. [ComputationalLogic/Calcpad](https://github.com/ComputationalLogic/Calcpad)). |
| File format | Plain text `.cpd` / `.txt`, plus binary `.cpdz`. ([README fork](https://github.com/ComputationalLogic/Calcpad), [calcpad.eu/help](https://calcpad.eu/help)) |
| Syntax | Line-oriented. `"double quotes"` = title/heading, `'single quotes'` = comment text; comments may contain HTML/CSS/JS/SVG and, with `#md on`, Markdown. Variables are case-sensitive, Latin/Greek, with subscripts/primes. Units inline: `3ft + 12in|cm` (the `|` sets target units). Custom units `.Name = expression`. Control flow `#if / #else if / #else / #end if`, loops `#repeat…#loop`, `#for…#loop`, `#while…#loop`, `#break`, `#continue`. Numerical methods `$Root`, `$Find`, `$Sup`, `$Inf`, `$Area`, `$Integral`, `$Slope`, `$Sum`, `$Product`, `$Repeat`, `$Plot`. Vectors/matrices `[a; b | c; d]` with `lsolve`, `eigen`, `inverse`. Output directives `#hide/#show/#pre/#post/#val/#equ/#noc/#nosub/#novar/#varsub/#round n/#format`. Input forms via `?`. Modules via `#include filename`; macros. ([README fork](https://github.com/ComputationalLogic/Calcpad), [Codeberg README](https://codeberg.org/proektsoft/Calcpad/raw/branch/main/README.md), [help/36](https://calcpad.eu/help/36/conditional-execution), [help/59](https://calcpad.eu/help/59/modules-include)) |
| Math engine | Own numeric engine: real + complex numbers, phasors, units, vectors/matrices, numerical root-finding/integration/optimisation, plotting. **No symbolic/CAS.** calcpad.eu makes no symbolic claim; `#noc`/`#nosub` only control *display* of equations. ([calcpad.eu](https://calcpad.eu/), [Codeberg README](https://codeberg.org/proektsoft/Calcpad/raw/branch/main/README.md)) |
| Units | SI, Imperial, USCS, custom; dimensional checking; angle/dimensionless units. ([Codeberg README](https://codeberg.org/proektsoft/Calcpad/raw/branch/main/README.md)) |
| Editor UX | Windows WPF desktop app (Win 10/11 x64, .NET Desktop Runtime 10). Online IDE at [calcpad.eu/Ide](https://calcpad.eu/Ide). **Official VS Code extension** `ProektsoftEOOD.proektsoft-calcpad` (named in Calcpad's own AI setup readme; source in `Setup/Syntax-for-external-editors/calcpad-vscode`). Syntax files also for Notepad++, Sublime, CudaText. ([Setup/AI/Readme.md](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Setup/AI/Readme.md), [Setup folder](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Setup)) |
| PDF/report | Renders an HTML report (MathType-style equations); export to HTML, PDF, Word `.docx`. ([calcpad.eu](https://calcpad.eu/), README) |
| CLI/headless | `Calcpad.Cli` project: an interactive REPL (`NEW OPEN SAVE LIST …`) **and** a batch mode `calcpad input.cpd output.(html|docx|pdf) [-s]` (silent). Program.cs validates "Invalid input file extension. Must be 'cpd' or 'txt'" / "Invalid output extension. Must be 'html', 'docx' or 'pdf'". Also `Calcpad.Api` with `PyCalcpad` Python wrapper (`PyCalcpadRun.py`, `PyCalcpadParse.py`, `PyCalcpadConvert.py`). ([Calcpad.Cli/Program.cs](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Calcpad.Cli/Program.cs), [Calcpad.Cli/Messages.resx](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Calcpad.Cli/Messages.resx), [Calcpad.Api](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Calcpad.Api)) |
| AI authoring | Calcpad ships `Setup/AI/Work/CALCPAD_CLAUDE_INSTRUCTIONS.txt` and `CALCPAD_LANGUAGE_REFERENCE_FOR_CLAUDE.md` plus a how-to for Claude Code in VS Code ("Give Claude prompts, e.g.: Create a Calcpad program for analysis of a simply supported beam"). ([Setup/AI/Readme.md](https://codeberg.org/proektsoft/Calcpad/src/branch/main/Setup/AI/Readme.md)) |
| License / price | MIT, "free for commercial and non-commercial use". Developer's sponsor page reportedly says new feature updates go to sponsors/contributors (third-party summary; the sponsor page itself redirected to an empty profile). ([Codeberg README](https://codeberg.org/proektsoft/Calcpad), [Wikipedia](https://en.wikipedia.org/wiki/Calcpad)) |
| Maintenance | Stable 7.7.2, 2026-08-31 per Wikipedia; Codeberg last commit 2026-04-29. Active but single-maintainer, and the GitHub repo disappearing is a bus-factor flag. |
| Closeness | **High on concept** (plain text + units + report + CLI + AI prompts), **low on UX** (WPF, line-oriented quoted-string prose instead of Markdown-first, HTML-report styling), **zero symbolic**. Exactly the user's complaint. |

## 2. EngineeringPaper.xyz

| | |
|---|---|
| What | "A web app that makes it easy to create, save, and share engineering calculations." Single-author (Michael Greminger). ([GitHub](https://github.com/mgreminger/EngineeringPaper.xyz)) |
| Architecture | Svelte 5 + TypeScript front end. Math cells parsed by **ANTLR 4.12** (pinned), evaluated by **SymPy running in Pyodide (WASM)** in a web worker: "SymPy: core computation engine"; "All calculations run on your own device". **Math.js for unit parsing**. MathLive (forked) for the equation editor, Quill 2 for documentation cells, MathJax 3 for display, Plotly for plots, CodeMirror 6 for Python code cells, CoolProp for fluid properties, SheetJS for xlsx import. Deployed on Cloudflare Workers (`wrangler`); static `public/` folder can be self-hosted. ([README](https://raw.githubusercontent.com/mgreminger/EngineeringPaper.xyz/main/README.md), [package.json](https://raw.githubusercontent.com/mgreminger/EngineeringPaper.xyz/main/package.json)) |
| Document model | Linear sheet of cells: math cells, documentation (rich text) cells, plot cells, data tables, selector tables, Python code cells, page-break cells, multiple "sheets". **Not plain text**: files are `.epxyz` (string present in `src/App.svelte`); content is app JSON, not a human-editable text format. ([App.svelte](https://github.com/mgreminger/EngineeringPaper.xyz/blob/main/src/App.svelte), [releases](https://github.com/mgreminger/EngineeringPaper.xyz/releases)) |
| Math engine / symbolic | SymPy: unit checking, solving systems of equations, numerical and symbolic results. (README) |
| Units | Automatic conversion and checking via Math.js unit tables + SymPy dimension tracking. (README) |
| Editor UX | WYSIWYG math (MathLive) in cells; rich-text docs; runs in all major browsers, Microsoft Store wrapper; **PWA** (`vite-plugin-pwa`, `workbox-window` in deps). ([package.json](https://raw.githubusercontent.com/mgreminger/EngineeringPaper.xyz/main/package.json)) |
| PDF/report | **PDF and DOCX export** exist and are actively worked on (releases 2026-07-30 … 2026-09-26 fix PDF/DOCX export issues; page-break cell added 2026-09-13; SVG figures scale in PDF). Issue #215 "Export to PDF" closed 2024-01-11. ([releases](https://github.com/mgreminger/EngineeringPaper.xyz/releases), [issues](https://github.com/mgreminger/EngineeringPaper.xyz/issues?q=is%3Aissue+latex+OR+offline+OR+mcp+OR+cli)) |
| CLI/headless | **None.** No CLI, no API, no headless render; evaluation requires a browser running Pyodide. Issue search for cli/mcp finds nothing. |
| License / price | MIT. Free hosted app; cloud save via share links. ([GitHub](https://github.com/mgreminger/EngineeringPaper.xyz)) |
| Maintenance | Very active: ~3,000 commits, last push 2026-10-12, date-tagged releases roughly fortnightly (latest `20260926`). 245 stars. |
| Closeness | **Closest competitor on capability** (units + SymPy + PDF + PWA + free + MIT). **Misses the core premise**: not a plain-text/Markdown format, not git-diffable, no CLI, no agent-friendly authoring path. |

## 3. SMath Studio, PTC Mathcad Prime, Maple Flow

### SMath Studio
- WYSIWYG "paper" math editor, "Tiny, but powerful", "complete units of measurements support", ~40 languages, Extensions Manager with plug-ins (incl. a **Maxima** CAS plugin documented by Martin Kraska). ([smath.com summary](https://smath.com/en-US/view/SMathStudio/summary), [SMath with Maxima manual](https://smath.com:7443/ru-RU/file/h4z4vW/SMath-with-Maxima_pdf))
- Platforms: Windows MSI, Mono package, Linux AppImages, "SMath Studio in the Cloud"; latest stable 1.5.0.9678, 2026-07-01. ([download](https://smath.com/en-US/view/SMathStudio/download))
- File format: `.sm` worksheets (XML-ish; not plain text in the Markdown sense; the site does not document it).
- Pricing: Personal free (not for organisations), Advanced ~$48/yr individual, Unlimited for organisations from $9,120 / 20 licences (~$38/mo/licence); only Unlimited includes "integration and automation (command-line control)". ([pricing](https://smath.com/en-US/view/SMathStudio/pricing))
- Proprietary (free-of-charge, not open source). PDF via print. Symbolic only through its own simplifier or the Maxima plugin.
- Closeness: low. GUI canvas, proprietary format, no Markdown, CLI gated behind the org tier.

### PTC Mathcad Prime
- "Mathcad Prime supports symbolic as well as numeric calculations"; "has two engines: numeric and symbolic"; integrates with Creo, Windchill "and other programs with Mathcad's API"; "PTC Mathcad Express is a limited functionality version of PTC Mathcad" (free). ([ptc.com/products/mathcad](https://www.ptc.com/en/products/mathcad), fetched with a browser UA; PTC store/pricing pages returned 403)
- Format: proprietary `.mcdx` worksheet. Windows only. PDF via print/export.
- Pricing: PTC lists no price on its public product page; third-party listings put an individual annual subscription at ~$735–818/seat (TrustRadius $735, Capterra/GetApp ~$818), unverified against PTC. ([TrustRadius](https://trustradius.com/compare-products/ptc-mathcad), [Capterra](https://www.capterra.co.uk/software/219911/ptc-mathcad-prime))
- Closeness: low. Industry default, but binary format, Windows GUI, expensive, no text-first or agent workflow.

### Maple Flow
- "Whiteboard-style" freeform canvas; "powered by the Maple math engine" (full CAS); units tracked with variables; WYSIWYG PDF export with page size/headers/footers; code generation to C/C#/Java/Python/MATLAB; worksheets callable from Excel or the Maple OpenAPI. Latest: Maple Flow 2026. ([maplesoft.com/products/mapleflow](https://www.maplesoft.com/products/mapleflow/))
- Pricing: perpetual or annual subscription, numbers not shown publicly (store and pricing pages route to quote/sales). ([store](https://www.maplesoft.com/store), [pricing](https://www.maplesoft.com/pricing/))
- Proprietary binary format. Closeness: low; strongest symbolic engine of the GUI tools, but the opposite of plain text.

## 4. handcalcs, forallpeople, Jupyter + nbconvert, Quarto, MyST

### handcalcs (Python)
- "Python library for converting Python calculations into rendered latex." `%%render` cell magic in Jupyter, `%%tex` for raw LaTeX, `@handcalc()` decorator for non-Jupyter use. Renders symbolic formula, then numeric substitution, then result. Override tags `# short`, `# long`, `# params`, `# symbolic`, `# sympy`. Limits: single-line statements only, no loops/functions in rendered cells, lists/dicts render poorly. Apache-2.0; v1.11.0 2026-01-23; last push 2026-10-14; 5.8k stars. ([README](https://raw.githubusercontent.com/connorferster/handcalcs/master/README.md), GitHub API)
- PDF: via Jupyter export (requires LaTeX); the "no input" exporters moved to a separate `nb-hideinputs` package as of v1.9.0.

### forallpeople (units)
- "Python SI units library: your 'daily driver' for calculations." Immutable `Physical` quantities, units defined in environment JSON files, auto SI prefixing, `.latex` / `.html` output designed for handcalcs. Limits: no dimensionless `Physical` (same-dimension division returns float), no `Physical ** Physical`, `sqrt(MPa)`-style dimensional inconsistency needs manual handling. Apache-2.0; v3.0.0 2026-08-22. ([README](https://raw.githubusercontent.com/connorferster/forallpeople/master/README.md), GitHub API)

### Jupyter + nbconvert
- `jupyter nbconvert --to pdf` (LaTeX route, needs pandoc + TeX) or `--to webpdf` (HTML to headless Chromium via Playwright). `--execute` runs the notebook headlessly. BSD-3; v7.17.2 2026-10-12. ([nbconvert usage](https://nbconvert.readthedocs.io/en/latest/usage.html), GitHub API)
- Format: `.ipynb` JSON, not diff-friendly plain text; handcalcs output lives in cell outputs.
- Closeness: the handcalcs + forallpeople + nbconvert stack produces the *right-looking* PDF and is CLI-able, but the source is Python in JSON notebooks, the LaTeX toolchain is heavy, and symbolic only comes via explicit SymPy code.

### Quarto
- "Open-source scientific and technical publishing system built on Pandoc." `.qmd` = Markdown + executable cells (Jupyter/knitr/Julia/OJS); inline expressions `` `{python} radius` ``; **Typst is bundled**: `format: typst` renders PDF through the Typst CLI without a TeX install (`quarto typst compile` also exposed). Caveats: "Inline expressions are not generally supported inside YAML strings"; "Keep expressions simple". MIT (COPYING.md); v1.10.19 2026-10-06. ([inline code](https://quarto.org/docs/computations/inline-code.html), [Typst format](https://quarto.org/docs/output-formats/typst.html), [COPYING.md](https://github.com/quarto-dev/quarto-cli/blob/main/COPYING.md), GitHub API)
- Closeness: **the closest "assemble from parts" path**: plain-text Markdown, CLI, Typst PDF. But math/units still mean writing Python (handcalcs/forallpeople/pint) in code cells; no first-class "variable = formula with units" statement; editor is VS Code/Positron, no minimalist web app.

### MyST Markdown (mystmd)
- "Command line tools for working with MyST Markdown." Executes `code-cell` directives, notebooks and inline `eval` roles via a Jupyter Server + kernel (`myst build --execute`). PDF via LaTeX (needs TeX) or **Typst** (`myst build article.md --typst`; docs call Typst "faster and simpler" with "equal or better quality"). MIT; mystmd@1.11.0 2026-09-21. ([execute](https://mystmd.org/guide/execute-notebooks), [PDF](https://mystmd.org/guide/creating-pdf-documents), [guide](https://mystmd.org/guide), GitHub API)
- Closeness: same story as Quarto; needs a Jupyter kernel for any computation.

## 5. Typst as document format and PDF engine

- "A markup-based typesetting system that is powerful and easy to learn." Apache-2.0, Rust, 56.6k stars, v0.15.1 (2026-07-17), last push 2026-10-13. ([GitHub](https://github.com/typst/typst), GitHub API)
- **CLI**: `typst compile file.typ [out]`, `typst watch`; output formats `Pdf`, `Png`, `Svg`, `Html`, `Bundle` (`--format`, else inferred from extension); `--input key=value` exposed as `sys.inputs` (strings) for parametrising a document from the shell; `--root`, `--font-path`; `--pdf-standard` supports PDF 1.4–2.0, PDF/A-1…4, PDF/UA-1; `typst eval` replaces the deprecated `query` for extracting metadata. ([typst-cli args.rs](https://raw.githubusercontent.com/typst/typst/main/crates/typst-cli/src/args.rs))
- **HTML export is experimental** ("Do not use this feature for production use cases"; `--features html`). ([HTML docs](https://typst.app/docs/reference/html/))
- **Scripting**: `let` bindings (with destructuring), closures, `if/else`, `for`/`while` with `break`/`continue`, arrays, dictionaries, modules/`import`, packages `@preview/name:version`; no user-defined methods; no exception mechanism documented. ([scripting](https://typst.app/docs/reference/scripting/))
- **Numeric capability**: `calc` module: `pow, sqrt, root, log, ln, exp`, trig/hyperbolic, `floor/ceil/round`, `gcd/lcm`, `binom`, `fact`, `clamp`, `min/max`, `norm`. Types `int` (i64), `float`, `decimal`. **No units of measure beyond typographic `length`/`angle`/`ratio`, no linear algebra, no symbolic algebra.** ([calc](https://typst.app/docs/reference/foundations/calc/), [foundations](https://typst.app/docs/reference/foundations/))
- `plugin()` loads a WebAssembly module, so a units/CAS engine could be embedded as WASM; `eval` evaluates Typst code strings; data loading (`json`, `yaml`, `csv`, `toml`). ([foundations](https://typst.app/docs/reference/foundations/))
- Units *typesetting* (not arithmetic): package **unify** 0.8.1 (2026-05-15, MIT), "the Typst counterpart to siunitx"; `qty()`, `unit()`, `num()`; "The package only formats what you give it." ([unify](https://typst.app/universe/package/unify))
- **Browser/WASM**: [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) ("Run Typst in JavaScript World"), Apache-2.0, v0.7.0 (2026-06-01), last push 2026-10-08, 1.2k stars. npm `@myriaddreamin/typst.ts` (+ `typst-ts-web-compiler`, `typst-ts-renderer` WASM, React/Vue/Angular wrappers, `rehype-typst`). The `TypstSnippet` all-in-one API exposes `svg()`, **`pdf()`** ("compiles the document to PDF format"), `canvas()`, `vector()`, `query()`, `addSource()`, `mapShadow()`, `setFonts()`, `preloadFontAssets()`. Default bundle fetches fonts from GitHub (needs network unless you bundle fonts). ([snippet.mts](https://github.com/Myriad-Dreamin/typst.ts/blob/main/packages/typst.ts/src/contrib/snippet.mts), [README](https://raw.githubusercontent.com/Myriad-Dreamin/typst.ts/main/README.md))
- Web app: free tier; Pro $7.99/mo; on-prem custom. Compiler "free to download and run… you can modify its code". ([pricing](https://typst.app/pricing/))

**Assessment, Typst as the report backend:** strong yes for *rendering*, no for *computing*.
- Pros: single Rust binary, instant PDF with PDF/A, real math typesetting (better than KaTeX-in-Chromium print), scripting is enough to lay out tables/substitution lines from data, `--input`/`json()` lets the calc engine hand it pre-computed values, and typst.ts gives identical output in the PWA without a server.
- Cons: no units, no symbolic, i64/f64 only, HTML export experimental (so the on-screen editor preview cannot reuse Typst HTML yet; preview must be SVG/canvas via typst.ts, or a separate KaTeX path), fonts must be shipped, and a `.typ` file is not Markdown (authors/agents would write Markdown; Typst is a compile target, not the source format).
- Recommended shape: **Markdown+math source, evaluated by your own engine (units/symbolic), emitted as JSON or `.typ`, compiled by Typst (CLI or typst.ts) to PDF.** This is exactly what Quarto and MyST already do for generic documents, which is the sanity check that the pipeline is sound.

## 6. Commercial calc platforms and unit-aware calculator languages

### Blockpad
- "The essential software for engineering calculations… like Excel and Mathcad combined." Formulas typed in a document render as equations; built-in spreadsheets link to formulas; CAD-style sketches; "Units intelligence". Windows/Mac/web apps. Pricing: Education free; Individual $199/yr or $18/mo; Lifetime $950; Enterprise $180/person/yr, floating $440/seat/yr. Proprietary; file format and PDF export not stated on the public pages. ([blockpad.net](https://blockpad.net/), [pricing](https://blockpad.net/pricing))

### ClearCalcs (now Calcs.com)
- `clearcalcs.com/pricing` 301-redirects to `calcs.com/pricing`. Library of "228 standards-aligned structural calculators" with load linking; "CalcsBuilder" (how their calculators are built; no public authoring language documented); PDF export with branding on all plans; API (Beta) and "CalcsAI (Beta)" on Ultimate. Basic $79/mo, Pro $119/mo, Ultimate $149/mo (annual discounts). Template-driven, not free-form calculation documents. ([calcs.com/pricing](https://calcs.com/pricing), [calcs.com](https://calcs.com/))

### SkyCiv Quick Design / custom calculators
- "70+ ready-to-use and pre-validated engineering tools"; "build your own calculators with the framework" (free Udemy course; screenshots show a JSON-like config next to a web preview); "Every formula, design check and reference is shown in full" in reports; open API. Prices only on the checkout page (a reseller lists $19/mo, $159/yr for Quick Design). ([skyciv.com/structural-software/web-tool](https://skyciv.com/structural-software/web-tool/))
- Closeness: low; a calculator-app framework, not a document format.

### Tekla Tedds (Trimble)
- Library of "hundreds of structural and civil engineering calculations" (Eurocode, US, BS, AS, CSA); subscription (3 plans, prices on request); "What's new in Tekla Tedds 2026". **Tedds for Word**: "define calculations in any Microsoft Word document", variables declared with units so Tedds can "verify the dimensional accuracy of your calculations", multiple calc sections, data lists/tables/graphs. Windows + Word only; proprietary. ([tekla.com/tedds](https://www.tekla.com/products/tekla-tedds), [Writing custom calculations](https://support.tekla.com/doc/tekla-tedds/2026/calcs_introducingcalculations))
- Closeness: Tedds for Word is the *mainstream* "prose + live calc + units + nice print" product; it is the incumbent your tool replaces, but it is Word-bound, binary, and GUI-only.

### Stride (get-stride.com, Shenko AI)
- Product Hunt (2024-10-11) description: "technical documentation + calculation software for engineers… local-first, robust units system, markdown-based", files "saved in Markdown format". **Official site did not resolve** (`get-stride.com` DNS failure on 2026-10-15); pricing only on third-party listings ($9–29/user/mo). Treat as unverified and possibly dormant. ([hunted.space](https://hunted.space/product/stride-6), [LinkedIn](https://www.linkedin.com/company/shenko))
- Closeness: on paper the *same pitch* as the proposed tool; not confirmed alive.

### CalcTree
- "Engineering calculation management software": pages with parameters, Python scripts, Excel integration, GraphQL API, real-time collaboration, AI checks work against templates. Units/PDF/pricing not on the landing page. Proprietary SaaS. ([calctree.com](https://www.calctree.com/))

### Numbat (syntax inspiration; the best one)
- "A statically typed programming language for scientific computations with first class support for physical dimensions and units." Dimensions are types (`Length`, `Time`), inferred. Syntax: `30 km/h -> mph`, `5 in + 2 ft -> cm`, `unit bathtub = 150 L`, `assert_eq(12 ft, 1 in)`, `let`, `fn`. Standard library (SI, US, Imperial, nautical, astronomical, atomic) written in Numbat itself. CLI, web (numbat.dev), `numbat-wasm`. Apache-2.0; v1.24.0 2026-08-23; 2.8k stars; successor to Insect. ([README](https://raw.githubusercontent.com/sharkdp/numbat/master/README.md), GitHub API)
- No prose/report output, no symbolic. The statement grammar (`let`, `->`, `unit`, `fn`, `assert_eq`) is the strongest model for the math-statement half of the proposed format.

### Insect
- Archived; README: "Please consider using the follow-up project instead" (Numbat). PureScript; MIT; v5.9.0 2023. Syntax `kineticEnergy(mass, speed) = 0.5 * mass * speed^2 -> kJ`. ([README](https://raw.githubusercontent.com/sharkdp/insect/master/README.md), GitHub API)

### Frink
- "A practical calculating tool and programming language designed to make physical calculations simple." Java; `38 feet -> meters`, interval arithmetic `[2.1, 3]`, exact rationals, date math; web interface and Android. Licence not stated on the site ("contact Alan Eliasen" for integration); last dated release reference on the page is 2018. Not open source. ([frinklang.org](https://frinklang.org/))

### Kalker
- "Scientific calculator with math-like syntax that supports user-defined variables and functions, complex numbers, and estimation of derivatives and integrals." `f(x) = x(3x + 1)`, `f'(3)`, `Σ(n=0, 720, 1÷n!)`, `integral(a, b, x dx)` (Simpson's 3/8). **No units.** Rust, MIT, v2.2.3 2026-07-10; Linux/Win/Mac/Android + web. ([kalker.xyz](https://kalker.xyz/), GitHub API)

## 7. Markdown-adjacent inline-math plugins (brief, syntax only)

- **Obsidian Numerals** ([gtg922r/obsidian-numerals](https://github.com/gtg922r/obsidian-numerals), MIT, stable 1.10.2): ```` ```math ```` code blocks evaluated line-by-line by **math.js**; `profit = revenue - expenses =>` (the `=>` marks an emphasised result), units `1ft + 12in` giving `2 ft`, currency `$1,000 * 2`, `@prev`, `@sum`/`@total`; render modes `math-plain`, `math-tex`, `math-highlight`. Good model for "result annotation" and TeX-vs-plain rendering toggles.
- **VisiMark** ([visimark.dev](https://visimark.dev/)): "a document integrity layer for Markdown": formulas in a `vmark` block, printed values bound to rules via `<!--vmark=order.total-->` anchors, `check` command fails CI when a printed value is stale, `fmt` refreshes values, `assert` invariants. No units. The *stale-value-is-a-build-error* idea is worth stealing for CLI/CI.
- **VS Code "inline-math"** ([Froskk/inline-math](https://github.com/Froskk/inline-math), MIT): evaluates the expression under the cursor with math.js (units via math.js). Cursor-following preview, nothing document-level.
- **vscode-calculate** ([lweberk/vscode-calculate](https://github.com/lweberk/vscode-calculate)): select expression, run command, result appended. math.js.
- **Markdown Formula** ([cescript/MarkdownFormula](https://github.com/cescript/MarkdownFormula)): Excel-style formulas in Markdown tables via HyperFormula. Tables only.
- Common thread: **every** Markdown inline-calc plugin uses math.js, which has units but no symbolic algebra and no dimension *type* checking at author time.

---

## Comparison table

| Tool | Format | Engine | Units | Symbolic | PDF | CLI/headless | Open source | Closeness |
|---|---|---|---|---|---|---|---|---|
| Calcpad | plain `.cpd`/`.txt` (quoted-string prose, `#md on` Markdown) | own numeric (C#) | yes, checked | no | HTML to PDF/DOCX | yes (`Calcpad.Cli`, Python API) | MIT (GitHub gone, Codeberg) | **High concept / low UX** |
| EngineeringPaper.xyz | `.epxyz` app JSON | SymPy via Pyodide + math.js units | yes, auto | yes (SymPy) | yes (+DOCX) | **no** | MIT | **High capability / wrong format** |
| SMath Studio | `.sm` | own + Maxima plugin | yes | partial/plugin | print | org tier only | no (freeware) | low |
| Mathcad Prime | `.mcdx` | numeric + symbolic | yes | yes | print | COM/API, Windows | no (~$735–818/yr, 3rd-party) | low |
| Maple Flow | binary | Maple CAS | yes | strong | yes | Maple OpenAPI | no (quote) | low |
| handcalcs+forallpeople+nbconvert | `.ipynb` JSON w/ Python | Python/NumPy/SymPy | via forallpeople/pint | via SymPy code | LaTeX or webpdf | yes | Apache/BSD | medium (parts) |
| Quarto | `.qmd` Markdown | Jupyter/knitr | only via code | only via code | **Typst or LaTeX** | yes | MIT | medium (pipeline) |
| MyST | `.md` + Jupyter | Jupyter kernel | only via code | only via code | Typst or LaTeX | yes | MIT | medium (pipeline) |
| Typst | `.typ` | `calc` (f64/i64/decimal) | typographic only | no | **native, PDF/A** | yes + WASM (typst.ts `pdf()`) | Apache-2.0 | backend only |
| Blockpad | proprietary | own | yes | unclear | print | no | no ($199/yr) | low |
| Calcs.com (ClearCalcs) | templates | own | yes | no | yes | API beta | no ($79–149/mo) | low |
| SkyCiv Quick Design | JSON-config calculators | own | n/a | no | reports | API | no | low |
| Tedds for Word | `.docx` + Tedds fields | own | yes, checked | no | Word/print | no | no (subscription) | medium concept, wrong substrate |
| Stride | Markdown (claimed) | ? | yes (claimed) | ? | ? | ? | no | unverified, site down |
| Numbat | `.nbt` script | own, dimension-typed | **yes, static types** | no | no | yes + WASM | Apache-2.0 | syntax model |
| Frink | script | own | yes | minimal | no | yes (Java) | no | syntax model |
| Kalker | script | own numeric | no | no | no | yes + WASM | MIT | minor |
| Obsidian Numerals | ```` ```math ```` blocks in `.md` | math.js | math.js | no | Obsidian print | no | MIT | syntax model |

## Gaps: what none of these deliver

1. **Plain-text Markdown document *with* a typed, unit-checked math statement grammar.** Calcpad has the text format but its prose is quoted strings and it is numeric-only; EngineeringPaper has the engine but stores JSON; Quarto/MyST have Markdown but math is "whatever Python you write". Nobody has `Markdown prose + Numbat-grade statements` in one file.
2. **Same file renders three ways from one source**: live block editor (web/PWA), CLI batch (`tool build calc.md` producing `calc.pdf`), and agent-authored. Calcpad is the only one with both GUI and CLI, and its CLI is a .NET Windows-flavoured binary with an interactive REPL bolted on.
3. **Symbolic + units + report together, cheaply.** The CAS tools (Maple Flow, Mathcad, EngineeringPaper/SymPy) are binary-format GUIs; the text tools (Calcpad, Numbat) have no CAS.
4. **Agent-native.** Calcpad is the only one shipping LLM instruction files; its format is still idiosyncratic enough to need a one-file language reference. A Markdown-first format with a tiny statement grammar is cheaper for an agent to get right and to verify via CLI exit codes (VisiMark's "stale value fails CI" is the right instinct).
5. **Minimalist UI.** Every engineering tool here is either a dense desktop app (Calcpad WPF, SMath, Mathcad, Blockpad) or a template/library SaaS (Calcs.com, SkyCiv, Tedds). EngineeringPaper is the only clean web UI and it is cell-based WYSIWYG, not text.

### The most dangerous "why not just use X" counterarguments, bluntly

1. **"Just use EngineeringPaper.xyz."** It is free, MIT, released every two weeks, runs offline as a PWA, has SymPy symbolic, automatic units, Python cells, and PDF/DOCX export that is being polished right now. For an engineer who only needs *a nicer Calcpad* it already wins. The proposed app is only justified if the plain-text/git/CLI/agent axis is genuinely load-bearing; if it is not, stop and use EngineeringPaper. (Its weaknesses are real: `.epxyz` is app JSON, no CLI, Pyodide cold-start, single maintainer.)
2. **"Just use Calcpad + its VS Code extension + its Claude instruction files."** The author has already done "AI writes .cpd, CLI renders PDF". The gap is purely syntax ergonomics (quoted-string prose, line-oriented), no symbolic math, HTML-report styling, and project risk (GitHub repo vanished; sponsor-gated updates). Those are legitimate, but the pitch must be "Calcpad with Markdown, dimension types and a CAS", not "Calcpad doesn't exist".
3. **"Just use Quarto (or MyST) + handcalcs/forallpeople + Typst."** Zero new code, plain text, CLI, Typst PDF, agents already know Python. What it lacks is a *statement-level* language: every calc is a Python cell, units are a library API, symbolic is SymPy boilerplate, and the editing experience is VS Code, not a block editor. Any new tool should at minimum beat this stack on authoring brevity, otherwise it is a worse Quarto.

### Where the proposed tool should sit (the defensible slot)
Source = Markdown with a Numbat-style statement grammar (`let`, `->`, `unit`, dimension types, `assert`); engine = your own evaluator with units + a CAS (SymPy-via-Pyodide like EngineeringPaper, or a JS/WASM CAS) that also emits substitution lines; render = Typst (CLI) / typst.ts (`pdf()` in the browser) for PDF, KaTeX/SVG for the live preview; CLI exit codes for stale/failed checks so agents and CI can trust it. Everything else in this survey either has the engine or the format, never both.
