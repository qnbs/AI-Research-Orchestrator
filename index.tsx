import './src/spaRouteRestore';
import './src/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { Provider } from 'react-redux';
import { store } from './src/store/store';

/** Fade out and remove the static boot splash from index.html. */
function dismissBootSplash(): void {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  splash.classList.add('boot-splash--hide');
  const remove = () => splash.remove();
  splash.addEventListener('transitionend', remove, { once: true });
  // Fallback if transition is disabled (prefers-reduced-motion)
  window.setTimeout(remove, 500);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
dismissBootSplash();
