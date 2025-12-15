// src/service-worker.js

// O Service Worker lida com a notificação Push em segundo plano.

// Listener para o evento 'push'
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const title = data.title || 'Novo Agendamento na Barbearia!';
  const options = {
    body: data.body || `Cliente ${data.clientName} às ${data.time} agendou um corte.`,
    icon: '/vite.svg', // Use o ícone do projeto
    badge: '/vite.svg',
    data: {
      url: '/admin', // URL para abrir ao clicar
    },
    // O tag evita notificações duplicadas
    tag: 'new-appointment-notification', 
    renotify: true, // Notifica novamente mesmo se já houver uma com a mesma tag
  };

  // Exibe a notificação
  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener para o evento 'notificationclick'
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Abre a URL do painel do barbeiro ao clicar na notificação
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});

// Força o Service Worker a assumir o controle imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Garante que o Service Worker mais recente esteja ativo
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});