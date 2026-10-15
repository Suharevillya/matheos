// HTML -> PDF through headless Chromium, docs/spec/cli.md and docs/adr/0002.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import type { Chrome } from './chrome.js';

export async function renderPdf(html: string, out: string, chrome: Chrome): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'matheos-'));
  const page = join(dir, 'report.html');
  writeFileSync(page, html);
  const browser = await puppeteer.launch({ executablePath: chrome.path, headless: chrome.shell ? 'shell' : true, args: ['--no-sandbox'] });
  try {
    const tab = await browser.newPage();
    await tab.goto(pathToFileURL(page).href, { waitUntil: 'load' });
    await tab.evaluate('document.fonts.ready');
    await tab.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}
