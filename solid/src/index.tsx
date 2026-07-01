/* SPA entry. Resolve the theme before first paint (no flash), then mount the router. */
import { render } from 'solid-js/web';
import './app.css';
import { App } from './App';
import { theme } from './state/theme';

theme.init();

const root = document.getElementById('root');
if (root) render(() => <App />, root);
