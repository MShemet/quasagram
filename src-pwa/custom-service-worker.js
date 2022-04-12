import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from 'workbox-strategies';
import { Queue } from 'workbox-background-sync';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.host.startsWith('fonts.g'),
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/posts'),
  new NetworkFirst()
);

registerRoute(
  ({ url }) => url.href.startsWith('http'),
  new StaleWhileRevalidate()
);

const bgSyncSupported = 'sync' in self.registration;

if (bgSyncSupported) {
  const createPostQueue = new Queue('createPostQueue', {
    onSync: async ({ queue }) => {
      let entry;

      while ((entry = await queue.shiftRequest())) {
        try {
          await fetch(entry.request);

          const channel = new BroadcastChannel('sw-messages');

          channel.postMessage({ msg: 'offline-post-uploadad' });
        } catch (error) {
          // Put the entry back in the queue and re-throw the error:
          await queue.unshiftRequest(entry);

          throw error;
        }
      }
    },
  });

  self.addEventListener('fetch', (event) => {
    if (!event.request.url.endsWith('/createPost')) {
      return;
    }

    if (self.navigator.onLine) {
      return;
    }

    const bgSyncLogic = async () => {
      try {
        const response = await fetch(event.request.clone());
        return response;
      } catch (error) {
        await createPostQueue.pushRequest({ request: event.request });
        return error;
      }
    };

    event.respondWith(bgSyncLogic());
  });
}

self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event;

  if (action === 'hello') {
    console.log('hello');
  } else if (action === 'goodby') {
    console.log('goodby');
  } else {
    event.waitUntil(
      clients.matchAll().then((clis) => {
        const clientUsingApp = clis.find((cli) => {
          return cli.visibilityState === 'visible';
        });

        if (clientUsingApp) {
          clientUsingApp.navigate(notification.data.openUrl);
          clientUsingApp.focus();
        } else {
          clients.openWindow(notification.data.openUrl);
        }
      })
    );
  }

  notification.close();
});

self.addEventListener('notificationclose', (event) => {
  console.log('notificationclose', event);
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = JSON.parse(event.data.text());

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icons/icon-128x128.png',
      badge: 'icons/icon-128x128.png',
      data: {
        openUrl: data.openUrl,
      },
    })
  );
});
