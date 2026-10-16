// Open and save documents, docs/spec/pwa.md: File System Access API on Chromium, input/download elsewhere.
export interface Opened { name: string; text: string; handle?: FileSystemFileHandle }

type Picker = { showOpenFilePicker?: (o: unknown) => Promise<FileSystemFileHandle[]>; showSaveFilePicker?: (o: unknown) => Promise<FileSystemFileHandle> };
const w = window as unknown as Picker;
const TYPES = [{ description: 'Matheos document', accept: { 'text/plain': ['.mth'] } }];

export const canUseHandles = () => typeof w.showOpenFilePicker === 'function';

export async function openFile(): Promise<Opened | undefined> {
  if (w.showOpenFilePicker) {
    try {
      const [handle] = await w.showOpenFilePicker({ types: TYPES, multiple: false });
      if (!handle) return undefined;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (e) { if ((e as Error).name === 'AbortError') return undefined; throw e; }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.mth,text/plain';
    input.onchange = async () => { const f = input.files?.[0]; resolve(f ? { name: f.name, text: await f.text() } : undefined); };
    input.click();
  });
}

/** Writes to the handle when there is one, otherwise picks a destination or downloads. Returns the handle to keep. */
export async function saveFile(text: string, name: string, handle?: FileSystemFileHandle): Promise<FileSystemFileHandle | undefined> {
  let h = handle;
  if (!h && w.showSaveFilePicker) {
    try { h = await w.showSaveFilePicker({ suggestedName: name, types: TYPES }); }
    catch (e) { if ((e as Error).name === 'AbortError') return undefined; throw e; }
  }
  if (h) {
    const writable = await (h as unknown as { createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }> }).createWritable();
    await writable.write(text); await writable.close();
    return h;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return undefined;
}

export async function openedFromHandle(handle: FileSystemFileHandle): Promise<Opened> {
  const file = await handle.getFile();
  return { name: file.name, text: await file.text(), handle };
}

/** Files launched from the OS on an installed PWA (manifest file_handlers). */
export function onLaunchedFile(cb: (o: Opened) => void) {
  const lq = (window as unknown as { launchQueue?: { setConsumer(f: (p: { files: FileSystemFileHandle[] }) => void): void } }).launchQueue;
  lq?.setConsumer(async (params) => { const h = params.files[0]; if (h) cb(await openedFromHandle(h)); });
}

/** Crash-recovery draft in localStorage: the text and the file name, written on every change. */
export const draft = {
  read(): { name: string; text: string } | undefined {
    try { const s = localStorage.getItem('draft'); return s ? JSON.parse(s) as { name: string; text: string } : undefined; } catch { return undefined; }
  },
  write(name: string, text: string) { try { localStorage.setItem('draft', JSON.stringify({ name, text })); } catch { /* private window */ } },
  clear() { try { localStorage.removeItem('draft'); } catch { /* private window */ } },
};
