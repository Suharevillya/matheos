// `<head>` markup for the preview iframe: KaTeX CSS and the bundled fonts, resolved against the app's own URL.
import katexCss from 'katex/dist/katex.min.css?inline';
import figtree400 from '@fontsource/figtree/latin-400.css?inline';
import figtree600 from '@fontsource/figtree/latin-600.css?inline';
import figtree700 from '@fontsource/figtree/latin-700.css?inline';
import mono400 from '@fontsource/jetbrains-mono/latin-400.css?inline';
import mono600 from '@fontsource/jetbrains-mono/latin-600.css?inline';

let cached: string | undefined;

export function previewHead(): string {
  if (cached) return cached;
  const base = new URL('.', document.baseURI).href;
  cached = `<base href="${base}"><style>${[katexCss, figtree400, figtree600, figtree700, mono400, mono600].join('\n')}</style>`;
  return cached;
}
