// Walking skeleton: textarea in, report preview out. CodeMirror and the modes of docs/spec/editor.md come next.
import { useMemo, useState } from 'react';
import { parse, evaluate } from '@matheos/core';
import { toHtml } from '@matheos/core/html';
import sample from '../../examples/steel-beam.mth?raw';

export function App() {
  const [text, setText] = useState(sample);
  const html = useMemo(() => {
    try { return toHtml(evaluate(parse(text))); } catch (e) { return `<pre>${String(e)}</pre>`; }
  }, [text]);
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
        style={{ flex: 1, border: 'none', borderRight: '1px solid #ddd', padding: 16, font: '14px/1.5 "JetBrains Mono", monospace', resize: 'none', outline: 'none' }} />
      <iframe title="preview" srcDoc={html} style={{ flex: 1, border: 'none' }} />
    </div>
  );
}
