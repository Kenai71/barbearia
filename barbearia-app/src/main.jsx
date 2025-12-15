import { StrictMode } from 'react' //
import { createRoot } from 'react-dom/client' //
import './index.css' //
import App from './App.jsx' //

// Lógica de Registro do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/src/service-worker.js', { scope: '/' })
    .then((registration) => {
      console.log('Service Worker registrado com sucesso:', registration);
    })
    .catch((error) => {
      console.error('Falha no registro do Service Worker:', error);
    });
}

createRoot(document.getElementById('root')).render( //
  // REMOVIDO <StrictMode> para evitar duplicação do SW em dev
  <App />
  ,
)