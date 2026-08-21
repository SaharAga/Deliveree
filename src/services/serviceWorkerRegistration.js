/**
 * Service Worker Registration and Lifecycle Manager
 * Enforces automatic background update checks on launch, tab focus, and visibility changes.
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Immediately check for updates upon registration
          registration.update().catch(() => {});

          // Listen for background updates
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.info('[SW] New version available, emitting update event.');
                  window.dispatchEvent(
                    new CustomEvent('sw-update-ready', {
                      detail: { registration }
                    })
                  );
                }
              });
            }
          });

          // Check for updates on window focus (switching tabs/apps)
          window.addEventListener('focus', () => {
            registration.update().catch(() => {});
          });

          // Check for updates on visibility change (unlocking phone / returning to app)
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });

          // Periodic check every 10 minutes
          setInterval(() => {
            registration.update().catch(() => {});
          }, 10 * 60 * 1000);
        })
        .catch((error) => {
          console.warn('[SW] Registration failed:', error);
        });

      // Reload page when the active service worker changes to ensure fresh bundle execution
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
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
