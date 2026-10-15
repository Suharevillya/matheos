import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './app.css';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
