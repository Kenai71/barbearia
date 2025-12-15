import { StrictMode } from 'react' 
import { createRoot } from 'react-dom/client' 
import './index.css' 
import App from './App.jsx' 

// Lógica de Registro do Service Worker
if ('serviceWorker' in navigator) {
  // CORREÇÃO: Registrando o Service Worker a partir da raiz da URL
  navigator.serviceWorker.register('/service-worker.js', { scope: '/' }) 
    .then((registration) => {
      console.log('Service Worker registrado com sucesso:', registration);
    })
    .catch((error) => {
      // Este erro será a chave para futuros problemas de push
      console.error('Falha no registro do Service Worker:', error);
    });
}

createRoot(document.getElementById('root')).render( 
  // REMOVIDO <StrictMode> para evitar duplicação do SW em dev
  <App />
  ,
)