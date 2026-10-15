// CodeMirror 6 editor with inline results from the core's Rendered model, docs/spec/editor.md.
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Decoration, WidgetType, keymap, type DecorationSet } from '@codemirror/view';
import { Compartment, EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import katex from 'katex';
import type { Document, Rendered, RenderedStatement } from '@matheos/core';

export interface Evaluation { doc: Document; rendered: Rendered }
export const setEvaluation = StateEffect.define<Evaluation>();

const tex = (latex: string, display: boolean) => {
  const el = document.createElement('span');
  katex.render(latex, el, { throwOnError: false, displayMode: display });
  return el;
};
const badge = (ok: boolean) => { const b = document.createElement('span'); b.className = `badge ${ok ? 'ok' : 'fail'}`; b.textContent = ok ? '✓ OK' : '✗ FAIL'; return b; };

/** Full three-line render of a derived statement, on its own line below the source. */
class BelowWidget extends WidgetType {
  constructor(readonly latex: string) { super(); }
  override eq(o: BelowWidget) { return o.latex === this.latex; }
  toDOM() { const d = document.createElement('div'); d.className = 'below'; d.appendChild(tex(this.latex, true)); return d; }
  override ignoreEvent() { return false; }
}
/** Badge and η (checks), badge and comparison (condition lines), message (errors), `…` (dependants). */
class EndWidget extends WidgetType {
  constructor(readonly it: RenderedStatement) { super(); }
  override eq(o: EndWidget) { return o.it.latex === this.it.latex && o.it.error === this.it.error && o.it.verdict === this.it.verdict && o.it.eta === this.it.eta; }
  toDOM() {
    const s = document.createElement('span'); s.className = 'res';
    const it = this.it;
    if (it.error) {
      const dep = it.error.startsWith('depends on');
      s.classList.add(dep ? 'dep' : 'e'); s.textContent = dep ? '…' : `✗ ${it.error}`; s.title = it.error; return s;
    }
    if (it.kind === 'check') { s.appendChild(badge(it.verdict ?? false)); s.appendChild(document.createTextNode(`η = ${it.eta}`)); }
    else if (it.kind === 'cond') { s.appendChild(badge(it.verdict ?? false)); s.appendChild(tex(it.latex, false)); }
    return s;
  }
}
class ChipWidget extends WidgetType {
  constructor(readonly latex: string, readonly error?: string) { super(); }
  override eq(o: ChipWidget) { return o.latex === this.latex && o.error === this.error; }
  toDOM() {
    const s = document.createElement('span'); s.className = 'chip' + (this.error ? ' e' : '');
    if (this.error) { s.textContent = '?'; s.title = this.error; } else s.appendChild(tex(this.latex, false));
    return s;
  }
}

const calcLine = Decoration.line({ class: 'calc' }), fenceLine = Decoration.line({ class: 'fence' }), errLine = Decoration.line({ class: 'err calc' });

function build(state: EditorState, ev: Evaluation): DecorationSet {
  const doc = state.doc, sel = state.selection.main;
  const items: { from: number; to: number; deco: Decoration }[] = [];
  const lineAt = (n: number) => (n >= 1 && n <= doc.lines ? doc.line(n) : undefined);

  ev.doc.blocks.forEach((block, bi) => {
    if (block.kind !== 'calc') return;
    const open = lineAt(block.pos.start.line), close = lineAt(block.pos.end.line);
    if (!open || !close) return;
    items.push({ from: open.from, to: open.from, deco: fenceLine });
    if (close.number !== open.number) items.push({ from: close.from, to: close.from, deco: fenceLine });
    for (let n = open.number + 1; n < close.number; n++) { const l = doc.line(n); items.push({ from: l.from, to: l.from, deco: calcLine }); }
    const rb = ev.rendered.blocks[bi];
    if (!rb || rb.kind !== 'calc') return;
    for (const it of rb.items) {
      const line = lineAt(it.pos.start.line);
      if (!line || line.number <= open.number || line.number >= close.number) continue;
      if (it.error && !it.error.startsWith('depends on')) items.push({ from: line.from, to: line.from, deco: errLine });
      if (it.error || it.kind === 'check' || it.kind === 'cond') items.push({ from: line.to, to: line.to, deco: Decoration.widget({ widget: new EndWidget(it), side: 1 }) });
      else if (it.kind === 'derived' || it.kind === 'bare') items.push({ from: line.to, to: line.to, deco: Decoration.widget({ widget: new BelowWidget(it.latex), block: true, side: 1 }) });
    }
  });
  for (const rb of ev.rendered.blocks) {
    if (rb.kind !== 'prose') continue;
    for (const inl of rb.inlines) {
      const from = inl.pos.start.offset, to = inl.pos.end.offset;
      if (to > doc.length || from >= to) continue;
      if (doc.sliceString(from, to) !== inl.raw) continue;         // text moved since evaluation; wait for the next one
      if (sel.from <= to && sel.to >= from) continue;              // cursor inside: show the source
      items.push({ from, to, deco: Decoration.replace({ widget: new ChipWidget(inl.latex, inl.error) }) });
    }
  }
  items.sort((a, b) => a.from - b.from || a.deco.startSide - b.deco.startSide);
  const b = new RangeSetBuilder<Decoration>();
  for (const it of items) b.add(it.from, it.to, it.deco);
  return b.finish();
}

const results = StateField.define<{ ev?: Evaluation; decos: DecorationSet }>({
  create: () => ({ decos: Decoration.none }),
  update(value, tr) {
    let ev = value.ev, decos = value.decos;
    for (const e of tr.effects) if (e.is(setEvaluation)) ev = e.value;
    const fresh = tr.effects.some((e) => e.is(setEvaluation));
    if (fresh && ev) decos = build(tr.state, ev);
    else if (tr.docChanged) decos = decos.map(tr.changes);
    else if (tr.selection && ev) decos = build(tr.state, ev);
    return { ev, decos };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
});

const themeCompartment = new Compartment();
const cmTheme = (dark: boolean): Extension => EditorView.theme({
  '&': { backgroundColor: 'var(--bg)', color: 'var(--fg)' },
  '.cm-content': { caretColor: 'var(--fg)' },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' },
  '.cm-gutters': { backgroundColor: 'var(--bg)', color: 'var(--mute)', borderRight: '1px solid var(--line)' },
}, { dark });

export function createEditor(parent: HTMLElement, doc: string, onChange: (text: string) => void, dark: boolean): EditorView {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup, markdown(), results, EditorView.lineWrapping,
        keymap.of([indentWithTab]),
        themeCompartment.of(cmTheme(dark)),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      ],
    }),
  });
}

export function setTheme(view: EditorView, dark: boolean) {
  view.dispatch({ effects: themeCompartment.reconfigure(cmTheme(dark)) });
}
