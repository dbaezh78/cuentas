import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        console.log('SW registrado con éxito:', reg.scope);
      })
      .catch((err) => {
        console.warn('Error al registrar SW:', err);
      });
  });
} else if ('serviceWorker' in navigator) {
  // Also register in dev / preview so testing works
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.log('SW dev registration:', err));
  });
}

