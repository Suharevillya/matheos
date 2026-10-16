// Editor shell: toolbar, preview toggle, editor style (source / rendered), files, theme and background. docs/spec/editor.md, pwa.md.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, evaluate, type Rendered } from '@matheos/core';
import { toHtml } from '@matheos/core/html';
import type { EditorView } from 'codemirror';
import { createEditor, setEvaluation, setLive, setTheme, replaceText } from './editor.js';
import { previewHead } from './preview.js';
import { draft, openFile, saveFile, onLaunchedFile, type Opened } from './files.js';
import sample from '../../examples/steel-beam.mth?raw';

type Style = 'source' | 'rendered';
type Theme = 'system' | 'light' | 'dark';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* private window */ } },
};
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const param = (k: string) => new URLSearchParams(location.search).get(k) ?? undefined;   // ?preview=on&style=rendered for screenshots

const Icon = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICON = {
  new: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M14 3v6h6 M12 12v6 M9 15h6',
  open: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8',
  preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
};

export function App() {
  const [preview, setPreview] = useState<boolean>(() => { const p = param('preview') ?? store.get('preview'); return p ? p === 'on' : innerWidth >= 700; });
  const [style, setStyle] = useState<Style>(() => { const s = (param('style') ?? store.get('style')) as Style | undefined; return s === 'rendered' ? 'rendered' : 'source'; });
  const [theme, setThemeState] = useState<Theme>(() => (store.get('theme') as Theme) ?? 'system');
  const [bg, setBg] = useState<string | undefined>(() => store.get('bg'));
  const [text, setText] = useState(sample);
  const [file, setFile] = useState<{ name: string; handle?: FileSystemFileHandle; saved: string }>({ name: 'steel-beam.mth', saved: sample });
  const [recover, setRecover] = useState<{ name: string; text: string } | undefined>(() => { const d = draft.read(); return d && d.text !== sample ? d : undefined; });
  const [ev, setEv] = useState<{ rendered: Rendered } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const view = useRef<EditorView | null>(null);
  const previewScroll = useRef(0);          // the preview document is recreated on every evaluation; keep its scroll
  const dark = theme === 'dark' || (theme === 'system' && systemDark());
  const dirty = text !== file.saved;

  const load = useCallback((o: Opened) => {
    setFile({ name: o.name, handle: o.handle, saved: o.text });
    setText(o.text);
    if (view.current) replaceText(view.current, o.text);
    setRecover(undefined);
  }, []);
  const doOpen = useCallback(async () => { const o = await openFile(); if (o) load(o); }, [load]);
  const doSave = useCallback(async () => {
    const h = await saveFile(text, file.name, file.handle);
    const name = h ? (await h.getFile()).name : file.name;
    setFile({ name, handle: h ?? file.handle, saved: text });
    draft.clear();
  }, [text, file]);
  const doNew = useCallback(() => { load({ name: 'untitled.mth', text: '---\ntitle: Untitled\n---\n\n# Untitled\n\n```math\nL = 6.0 m\n```\n' }); }, [load]);
  const saveRef = useRef(doSave); saveRef.current = doSave;
  const previewRef = useRef(preview); previewRef.current = preview;

  // the editor, once
  useEffect(() => {
    if (!host.current || view.current) return;
    view.current = createEditor(host.current, sample, setText, dark, {
      save: () => { void saveRef.current(); return true; },
      preview: () => { setPreview(!previewRef.current); return true; },
    });
    view.current.dispatch({ effects: setLive.of(style === 'rendered') });
    onLaunchedFile(load);
    return () => { view.current?.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live evaluation, debounced
  useEffect(() => {
    const t = setTimeout(() => {
      const doc = parse(text);
      const rendered = evaluate(doc);
      setEv({ rendered });
      view.current?.dispatch({ effects: setEvaluation.of({ doc, rendered }) });
      if (text !== file.saved) draft.write(file.name, text);
    }, 100);
    return () => clearTimeout(t);
  }, [text, file]);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    if (view.current) setTheme(view.current, dark);
    store.set('theme', theme);
  }, [theme, dark]);
  useEffect(() => { store.set('preview', preview ? 'on' : 'off'); }, [preview]);
  useEffect(() => { store.set('style', style); view.current?.dispatch({ effects: setLive.of(style === 'rendered') }); }, [style]);
  useEffect(() => {
    if (bg) { document.documentElement.style.setProperty('--bg', bg); store.set('bg', bg); }
    else { document.documentElement.style.removeProperty('--bg'); store.del('bg'); }
  }, [bg]);
  useEffect(() => { document.title = `${dirty ? '● ' : ''}${file.name} · Matheos`; }, [dirty, file.name]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h);
  }, [dirty]);

  // preview document reloaded: put its scroll back, then remember every later scroll
  const onPreviewLoad = useCallback(() => {
    const doc = frame.current?.contentDocument; if (!doc) return;
    doc.documentElement.scrollTop = previewScroll.current;
    doc.addEventListener('scroll', () => { previewScroll.current = doc.documentElement.scrollTop; });
  }, []);
  // editor scroll drives the preview; the block under the cursor is outlined
  useEffect(() => {
    const v = view.current; if (!v || !preview) return;
    const sync = () => {
      const doc = frame.current?.contentDocument; if (!doc) return;
      const top = v.lineBlockAtHeight(v.scrollDOM.scrollTop + 8);
      const n = v.state.doc.lineAt(top.from).number;
      const els = [...doc.querySelectorAll<HTMLElement>('[data-line]')];
      const target = els.filter((e) => Number(e.dataset.line) <= n).pop() ?? els[0];
      if (target) { doc.documentElement.scrollTop = target.offsetTop - 24; previewScroll.current = doc.documentElement.scrollTop; }
    };
    v.scrollDOM.addEventListener('scroll', sync);
    return () => v.scrollDOM.removeEventListener('scroll', sync);
  }, [preview, ev]);
  useEffect(() => {
    const v = view.current, doc = frame.current?.contentDocument; if (!v || !doc || !preview) return;
    const n = v.state.doc.lineAt(v.state.selection.main.head).number;
    const els = [...doc.querySelectorAll<HTMLElement>('[data-line]')];
    const target = els.filter((e) => Number(e.dataset.line) <= n).pop();
    els.forEach((e) => e.classList.toggle('cur', e === target));
  });

  const srcdoc = useMemo(() => (ev ? toHtml(ev.rendered, { head: previewHead() }) : ''), [ev]);
  const errors = ev?.rendered.errors.length ?? 0;
  const checks = ev ? ev.rendered.blocks.flatMap((b) => (b.kind === 'calc' ? b.items.filter((i) => i.kind === 'check') : [])) : [];
  const failed = checks.filter((c) => !c.verdict).length;

  return (
    <div className="app" data-preview={preview ? 'on' : 'off'} data-style={style}>
      <div className="bar">
        <span className="name">Matheos</span>
        <div className="seg" role="group" aria-label="File">
          <button id="file-new" onClick={doNew}><Icon d={ICON.new} />new</button>
          <button id="file-open" onClick={() => void doOpen()}><Icon d={ICON.open} />open</button>
          <button id="file-save" onClick={() => void doSave()} title="Ctrl+S"><Icon d={ICON.save} />save</button>
        </div>
        <span className="filename" title={file.handle ? 'on disk' : 'not saved to disk yet'}>{dirty ? '● ' : ''}{file.name}</span>
        <div className="seg" role="group" aria-label="Editor style">
          <button id="style-source" aria-pressed={style === 'source'} onClick={() => setStyle('source')} title="Plain text with results beside it">source</button>
          <button id="style-rendered" aria-pressed={style === 'rendered'} onClick={() => setStyle('rendered')} title="Math blocks render until you click into them">rendered</button>
        </div>
        <button className="plain toggle" id="preview" aria-pressed={preview} onClick={() => setPreview(!preview)} title="Ctrl+P"><Icon d={ICON.preview} />preview</button>
        <span className="sp" />
        <span className="status" id="status">
          {checks.length} checks{failed ? <span className="bad">, {failed} failed</span> : ''}{errors ? <span className="bad">, {errors} error{errors === 1 ? '' : 's'}</span> : ''}
        </span>
        <label className="bgpick" title="Editor background">
          <span>bg</span>
          <input type="color" id="bg" value={bg ?? (dark ? '#1c1e22' : '#fbfbfa')} onChange={(e) => setBg(e.target.value)} />
          {bg && <button className="plain" id="bg-reset" onClick={() => setBg(undefined)} title="Back to the theme background">×</button>}
        </label>
        <button className="plain" id="theme" onClick={() => setThemeState(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system')}>
          theme: {theme}
        </button>
      </div>
      {recover && (
        <div className="notice" role="status">
          Unsaved draft of <b>{recover.name}</b> from an earlier session.
          <button className="plain" id="draft-restore" onClick={() => load({ name: recover.name, text: recover.text })}>restore</button>
          <button className="plain" id="draft-discard" onClick={() => { draft.clear(); setRecover(undefined); }}>discard</button>
        </div>
      )}
      <div className="panes">
        <div className="pane editor" ref={host} />
        <div className="pane preview" aria-hidden={!preview}><iframe ref={frame} title="Report preview" srcDoc={srcdoc} onLoad={onPreviewLoad} /></div>
      </div>
    </div>
  );
}
