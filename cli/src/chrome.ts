// Chromium lookup and download, docs/spec/cli.md (Chromium).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Browser, computeExecutablePath, detectBrowserPlatform, install, resolveBuildId } from '@puppeteer/browsers';

export const CACHE_DIR = join(homedir(), '.cache', 'matheos');
const STAMP = join(CACHE_DIR, 'chrome-headless-shell.json');

const SYSTEM: string[] = process.platform === 'win32'
  ? [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  : process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];

export interface Chrome { path: string; shell: boolean; source: 'flag' | 'env' | 'cache' | 'system' }

/** Order: --chrome flag, MATHEOS_CHROME, the matheos cache, a system Chrome or Edge. */
export function findChrome(flag?: string): Chrome | undefined {
  if (flag) return { path: flag, shell: /headless-shell/i.test(flag), source: 'flag' };
  const env = process.env.MATHEOS_CHROME;
  if (env) return { path: env, shell: /headless-shell/i.test(env), source: 'env' };
  if (existsSync(STAMP)) {
    const { buildId } = JSON.parse(readFileSync(STAMP, 'utf8')) as { buildId: string };
    const path = computeExecutablePath({ browser: Browser.CHROMEHEADLESSSHELL, buildId, cacheDir: CACHE_DIR });
    if (existsSync(path)) return { path, shell: true, source: 'cache' };
  }
  const sys = SYSTEM.find((p) => p && existsSync(p));
  return sys ? { path: sys, shell: false, source: 'system' } : undefined;
}

/** Download chrome-headless-shell (stable) into the cache; returns its path. */
export async function installChrome(log: (s: string) => void = () => {}): Promise<Chrome> {
  const platform = detectBrowserPlatform();
  if (!platform) throw new Error('unsupported platform for chrome-headless-shell');
  const buildId = await resolveBuildId(Browser.CHROMEHEADLESSSHELL, platform, 'stable');
  log(`downloading chrome-headless-shell ${buildId} to ${CACHE_DIR} (about 100 MB, once)`);
  mkdirSync(CACHE_DIR, { recursive: true });
  const installed = await install({ browser: Browser.CHROMEHEADLESSSHELL, buildId, cacheDir: CACHE_DIR });
  writeFileSync(STAMP, JSON.stringify({ buildId }));
  return { path: installed.executablePath, shell: true, source: 'cache' };
}
