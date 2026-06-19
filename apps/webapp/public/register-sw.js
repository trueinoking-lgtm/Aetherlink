if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=5').then((registration) => {
      console.log('ServiceWorker registered:', registration.scope);
      if (registration.waiting) {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('ServiceWorker registration failed:', err);
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New ServiceWorker took control');
      // Optionally reload the page
      // window.location.reload();
    });
  });
}