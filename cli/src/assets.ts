// Inlined KaTeX CSS and fonts for a self-contained report, docs/spec/cli.md (HTML).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

/** Rewrite `url(...)` references in a CSS file to data URIs; keep woff2 only. */
function inlineCss(cssPath: string): string {
  const base = dirname(cssPath);
  const css = readFileSync(cssPath, 'utf8');
  return css
    .replace(/src:\s*([^;]+);/g, (_, srcs: string) => {       // keep only the woff2 source of each @font-face
      const woff2 = srcs.split(',').map((s) => s.trim()).find((s) => s.includes('.woff2'));
      return `src: ${woff2 ?? srcs};`;
    })
    .replace(/url\((['"]?)([^'")]+\.woff2)\1\)/g, (_, _q, rel: string) => {
      const data = readFileSync(join(base, rel)).toString('base64');
      return `url(data:font/woff2;base64,${data})`;
    });
}

let cached: string | undefined;

/** `<style>` markup with KaTeX, Figtree 400/600/700 and JetBrains Mono 400/600 embedded. */
export function inlineHead(): string {
  if (cached) return cached;
  const parts = [
    inlineCss(join(pkgDir('katex'), 'dist', 'katex.min.css')),
    ...['400', '600', '700'].map((w) => inlineCss(join(pkgDir('@fontsource/figtree'), `${w}.css`))),
    ...['400', '600'].map((w) => inlineCss(join(pkgDir('@fontsource/jetbrains-mono'), `${w}.css`))),
  ];
  cached = `<style>${parts.join('\n')}</style>`;
  return cached;
}
