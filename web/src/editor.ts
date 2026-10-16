// CodeMirror 6 editor with inline results from the core's Rendered model, docs/spec/editor.md.
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Decoration, WidgetType, keymap, type DecorationSet } from '@codemirror/view';
import { Compartment, EditorState, RangeSetBuilder, StateEffect, StateField, type Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { indentWithTab } from '@codemirror/commands';
import katex from 'katex';
import type { Document, Rendered, RenderedStatement } from '@matheos/core';

export interface Evaluation { doc: Document; rendered: Rendered }
export const setEvaluation = StateEffect.define<Evaluation>();
/** Live mode: a math block renders as the report block while the cursor is outside it. */
export const setLive = StateEffect.define<boolean>();

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
/** Live mode: the whole math block as the report shows it; click to edit. */
class BlockWidget extends WidgetType {
  readonly key: string;
  constructor(readonly items: RenderedStatement[], readonly at: number) { super(); this.key = items.map((i) => `${i.kind}|${i.latex}|${i.error ?? ''}|${i.verdict ?? ''}|${i.eta ?? ''}|${i.caption ?? ''}|${i.indent ? 1 : 0}`).join('\n'); }
  override eq(o: BlockWidget) { return o.key === this.key; }
  toDOM(view: EditorView) {
    const el = document.createElement('div'); el.className = 'liveblock';
    let branch: HTMLElement | undefined;
    for (const it of this.items) {
      const row = document.createElement('div'); row.className = `lst ${it.kind}`;
      const left = document.createElement('span');
      if (it.error) { left.className = 'e'; left.textContent = `✗ ${it.error}`; }
      else left.appendChild(tex(it.latex, it.kind !== 'input'));
      const right = document.createElement('span'); right.className = 'lright';
      if (!it.error && (it.kind === 'check' || it.kind === 'cond')) right.appendChild(badge(it.verdict ?? false));
      if (!it.error && it.kind === 'check') { const e = document.createElement('span'); e.className = 'leta'; e.textContent = `η = ${it.eta}`; right.appendChild(e); }
      if (it.caption) { const c = document.createElement('span'); c.className = 'lcap'; c.textContent = it.caption; right.appendChild(c); }
      row.append(left, right);
      if (it.indent) { if (!branch) { branch = document.createElement('div'); branch.className = 'lbranch'; el.appendChild(branch); } branch.appendChild(row); }
      else { branch = undefined; el.appendChild(row); }
    }
    if (!this.items.length) { el.textContent = 'empty math block'; el.classList.add('empty'); }
    el.onmousedown = (e) => { e.preventDefault(); view.dispatch({ selection: { anchor: this.at }, scrollIntoView: true }); view.focus(); };
    return el;
  }
  override ignoreEvent() { return false; }
}

const calcLine = Decoration.line({ class: 'calc' }), fenceLine = Decoration.line({ class: 'fence' }), errLine = Decoration.line({ class: 'err calc' });

function build(state: EditorState, ev: Evaluation, live: boolean): DecorationSet {
  const doc = state.doc, sel = state.selection.main;
  const items: { from: number; to: number; deco: Decoration }[] = [];
  const lineAt = (n: number) => (n >= 1 && n <= doc.lines ? doc.line(n) : undefined);

  ev.doc.blocks.forEach((block, bi) => {
    if (block.kind !== 'calc') return;
    const open = lineAt(block.pos.start.line), close = lineAt(block.pos.end.line);
    if (!open || !close || close.number <= open.number) return;
    const rb = ev.rendered.blocks[bi];
    const rendered = rb && rb.kind === 'calc' ? rb.items : [];
    const inside = sel.from >= open.from && sel.to <= close.to;
    if (live && !inside) {
      const first = doc.line(open.number + 1);
      items.push({ from: open.from, to: close.to, deco: Decoration.replace({ widget: new BlockWidget(rendered, first.from), block: true }) });
      return;
    }
    items.push({ from: open.from, to: open.from, deco: fenceLine });
    items.push({ from: close.from, to: close.from, deco: fenceLine });
    for (let n = open.number + 1; n < close.number; n++) { const l = doc.line(n); items.push({ from: l.from, to: l.from, deco: calcLine }); }
    for (const it of rendered) {
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

const results = StateField.define<{ ev?: Evaluation; live: boolean; decos: DecorationSet }>({
  create: () => ({ live: false, decos: Decoration.none }),
  update(value, tr) {
    let { ev, live, decos } = value;
    let rebuild = false;
    for (const e of tr.effects) {
      if (e.is(setEvaluation)) { ev = e.value; rebuild = true; }
      if (e.is(setLive)) { live = e.value; rebuild = true; }
    }
    if (rebuild && ev) decos = build(tr.state, ev, live);
    else if (tr.docChanged) decos = decos.map(tr.changes);
    else if (tr.selection && ev) decos = build(tr.state, ev, live);
    return { ev, live, decos };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
});

/** Markdown token colours from the theme tokens, so both themes read. */
const highlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: '700' },
  { tag: [t.processingInstruction, t.labelName, t.meta], color: 'var(--fence)' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '700' },
  { tag: [t.link, t.url], color: 'var(--accent)' },
  { tag: t.monospace, color: 'var(--mute)' },
]);

const themeCompartment = new Compartment();
const cmTheme = (dark: boolean): Extension => EditorView.theme({
  '&': { backgroundColor: 'var(--bg)', color: 'var(--fg)' },
  '.cm-content': { caretColor: 'var(--fg)' },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)' },
  '.cm-gutters': { backgroundColor: 'var(--bg)', color: 'var(--mute)', borderRight: '1px solid var(--line)' },
}, { dark });

export function createEditor(parent: HTMLElement, doc: string, onChange: (text: string) => void, dark: boolean): EditorView {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup, markdown(), syntaxHighlighting(highlight), results, EditorView.lineWrapping,
        keymap.of([indentWithTab]),
        themeCompartment.of(cmTheme(dark)),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
      ],
    }),
  });
  // line heights change when the web fonts and the KaTeX fonts arrive; re-measure so clicks land on the right line
  const fonts = (document as unknown as { fonts?: { ready: Promise<unknown>; addEventListener: (t: string, f: () => void) => void } }).fonts;
  fonts?.ready.then(() => view.requestMeasure());
  fonts?.addEventListener('loadingdone', () => view.requestMeasure());
  return view;
}

export function setTheme(view: EditorView, dark: boolean) {
  view.dispatch({ effects: themeCompartment.reconfigure(cmTheme(dark)) });
}
