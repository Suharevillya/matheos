// Editor shell: toolbar, modes (editor / split / preview), theme, mobile tabs. docs/spec/editor.md.
import { useEffect, useMemo, useRef, useState } from 'react';
import { parse, evaluate, type Rendered } from '@matheos/core';
import { toHtml } from '@matheos/core/html';
import type { EditorView } from 'codemirror';
import { createEditor, setEvaluation, setTheme } from './editor.js';
import { previewHead } from './preview.js';
import sample from '../../examples/steel-beam.mth?raw';

type Mode = 'editor' | 'split' | 'preview';
type Theme = 'system' | 'light' | 'dark';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private window */ } },
};
const systemDark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function App() {
  const [mode, setMode] = useState<Mode>(() => (store.get('mode') as Mode) ?? (innerWidth < 700 ? 'editor' : 'split'));
  const [tab, setTab] = useState<'edit' | 'view'>('edit');
  const [theme, setThemeState] = useState<Theme>(() => (store.get('theme') as Theme) ?? 'system');
  const [text, setText] = useState(sample);
  const [ev, setEv] = useState<{ rendered: Rendered } | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const dark = theme === 'dark' || (theme === 'system' && systemDark());

  // the editor, once
  useEffect(() => {
    if (!host.current || view.current) return;
    view.current = createEditor(host.current, sample, setText, dark);
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
    }, 100);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'system' ? '' : theme;
    if (theme === 'system') delete document.documentElement.dataset.theme;
    if (view.current) setTheme(view.current, dark);
    store.set('theme', theme);
  }, [theme, dark]);
  useEffect(() => { store.set('mode', mode); }, [mode]);

  const srcdoc = useMemo(() => (ev ? toHtml(ev.rendered, { head: previewHead() }) : ''), [ev]);
  const errors = ev?.rendered.errors.length ?? 0;
  const checks = ev ? ev.rendered.blocks.flatMap((b) => (b.kind === 'calc' ? b.items.filter((i) => i.kind === 'check') : [])) : [];
  const failed = checks.filter((c) => !c.verdict).length;

  return (
    <div className="app" data-mode={mode} data-tab={tab}>
      <div className="bar">
        <span className="name">Matheos</span>
        <div className="seg" role="group" aria-label="View">
          {(['editor', 'split', 'preview'] as Mode[]).map((m) => (
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
        <button className="plain" id="theme" onClick={() => setThemeState(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system')}>
          theme: {theme}
        </button>
      </div>
      <div className="panes">
        <div className="pane editor" ref={host} />
        <div className="pane preview"><iframe title="Report preview" srcDoc={srcdoc} /></div>
      </div>
    </div>
  );
}
