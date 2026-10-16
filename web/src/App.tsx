// Editor shell: toolbar, modes (editor / live / split / preview), files, theme and background, mobile tabs. docs/spec/editor.md, pwa.md.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, evaluate, type Rendered } from '@matheos/core';
import { toHtml } from '@matheos/core/html';
import type { EditorView } from 'codemirror';
import { createEditor, setEvaluation, setLive, setTheme, replaceText } from './editor.js';
import { previewHead } from './preview.js';
import { draft, openFile, saveFile, onLaunchedFile, type Opened } from './files.js';
import sample from '../../examples/steel-beam.mth?raw';

type Mode = 'editor' | 'live' | 'split' | 'preview';
type Theme = 'system' | 'light' | 'dark';
const MODES: Mode[] = ['editor', 'live', 'split', 'preview'];

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* private window */ } },
};
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function App() {
  const [mode, setMode] = useState<Mode>(() => {
    const m = (new URLSearchParams(location.search).get('mode') ?? store.get('mode')) as Mode | undefined;   // ?mode= for screenshots
    return m && MODES.includes(m) ? m : innerWidth < 700 ? 'editor' : 'split';
  });
  const [tab, setTab] = useState<'edit' | 'view'>('edit');
  const [theme, setThemeState] = useState<Theme>(() => (store.get('theme') as Theme) ?? 'system');
  const [bg, setBg] = useState<string | undefined>(() => store.get('bg'));
  const [text, setText] = useState(sample);
  const [file, setFile] = useState<{ name: string; handle?: FileSystemFileHandle; saved: string }>({ name: 'steel-beam.mth', saved: sample });
  const [recover, setRecover] = useState<{ name: string; text: string } | undefined>(() => { const d = draft.read(); return d && d.text !== sample ? d : undefined; });
  const [ev, setEv] = useState<{ rendered: Rendered } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const view = useRef<EditorView | null>(null);
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

  // the editor, once
  useEffect(() => {
    if (!host.current || view.current) return;
    view.current = createEditor(host.current, sample, setText, dark, { save: () => { void doSave(); return true; }, preview: () => { setMode('preview'); return true; } });
    view.current.dispatch({ effects: setLive.of(mode === 'live') });
    onLaunchedFile(load);
    return () => { view.current?.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // keep the keymap's save bound to the current text and file
  const saveRef = useRef(doSave); saveRef.current = doSave;
  useEffect(() => { (window as unknown as { __matheosSave?: () => void }).__matheosSave = () => void saveRef.current(); }, [doSave]);

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
  useEffect(() => {
    store.set('mode', mode);
    view.current?.dispatch({ effects: setLive.of(mode === 'live') });
  }, [mode]);
  useEffect(() => {
    if (bg) { document.documentElement.style.setProperty('--bg', bg); store.set('bg', bg); }
    else { document.documentElement.style.removeProperty('--bg'); store.del('bg'); }
  }, [bg]);
  useEffect(() => { document.title = `${dirty ? '● ' : ''}${file.name} · Matheos`; }, [dirty, file.name]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    addEventListener('beforeunload', h); return () => removeEventListener('beforeunload', h);
  }, [dirty]);

  // split pane: scroll the preview to the editor's top line, highlight the block under the cursor
  useEffect(() => {
    const v = view.current; if (!v || mode !== 'split') return;
    const sync = () => {
      const doc = frame.current?.contentDocument; if (!doc) return;
      const top = v.lineBlockAtHeight(v.scrollDOM.scrollTop + 8);
      const n = v.state.doc.lineAt(top.from).number;
      const els = [...doc.querySelectorAll<HTMLElement>('[data-line]')];
      const target = els.filter((e) => Number(e.dataset.line) <= n).pop() ?? els[0];
      if (target) doc.documentElement.scrollTo({ top: target.offsetTop - 24 });
    };
    v.scrollDOM.addEventListener('scroll', sync);
    return () => v.scrollDOM.removeEventListener('scroll', sync);
  }, [mode, ev]);
  useEffect(() => {
    const v = view.current, doc = frame.current?.contentDocument; if (!v || !doc || mode !== 'split') return;
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
    <div className="app" data-mode={mode} data-tab={tab}>
      <div className="bar">
        <span className="name">Matheos</span>
        <div className="seg" role="group" aria-label="File">
          <button id="file-new" onClick={doNew}>new</button>
          <button id="file-open" onClick={() => void doOpen()}>open</button>
          <button id="file-save" onClick={() => void doSave()} title="Ctrl+S">save</button>
        </div>
        <span className="filename" title={file.handle ? 'on disk' : 'not saved to disk yet'}>{dirty ? '● ' : ''}{file.name}</span>
        <div className="seg" role="group" aria-label="View">
          {MODES.map((m) => (
            <button key={m} id={`mode-${m}`} aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <div className="seg tabs" role="group" aria-label="Pane">
          <button id="tab-edit" aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>edit</button>
          <button id="tab-view" aria-pressed={tab === 'view'} onClick={() => setTab('view')}>view</button>
        </div>
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
        <div className="pane preview"><iframe ref={frame} title="Report preview" srcDoc={srcdoc} /></div>
      </div>
    </div>
  );
}
