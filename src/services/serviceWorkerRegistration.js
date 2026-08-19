/**
 * Service Worker Registration and Lifecycle Manager
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Listen for background updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, emit custom update event
                  console.info('[SW] New version available, cached and ready.');
                  window.dispatchEvent(
                    new CustomEvent('sw-update-ready', {
                      detail: { registration }
                    })
                  );
                }
              });
            }
          });

          // Check for updates periodically and on tab focus
          window.addEventListener('focus', () => {
            registration.update().catch(() => {});
          });
        })
        .catch((error) => {
          console.warn('[SW] Registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
