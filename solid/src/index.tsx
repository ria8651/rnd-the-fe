/* @refresh reload */
import { render } from 'solid-js/web';
import './app.css';
import './ui/ui.css';
import './chrome/chrome.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

render(() => <App />, root);
