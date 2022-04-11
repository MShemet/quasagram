<template>
  <q-page class="constrain q-pa-md">
    <transition
      appear
      enter-active-class="animated fadeIn"
      leave-active-class="animated fadeOut"
    >
      <div
        v-if="showNotificationsBanner && isPushNotificationsSupported"
        class="bg-primary"
      >
        <q-banner class="bg-grey-4 constrain q-mb-md">
          <template #avatar>
            <q-icon
              color="primary"
              name="eva-bell-outline"
            />
          </template>

          <b>Would you like to enable notifications?</b>

          <template #action>
            <q-btn
              flat
              label="Yes"
              dense
              color="primary"
              class="q-px-sm"
              @click="enableNotifications"
            />

            <q-btn
              flat
              label="Later"
              dense
              color="primary"
              class="q-px-sm"
              @click="showLaterNotificationsBanner"
            />

            <q-btn
              flat
              label="Never"
              dense
              color="primary"
              class="q-px-sm"
              @click="neverShowNotificationsBanner"
            />
          </template>
        </q-banner>
      </div>
    </transition>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-sm-8">
        <q-card
          v-if="loadingPosts"
          flat
          bordered
        >
          <q-item>
            <q-item-section avatar>
              <q-skeleton
                size="40px"
                type="QAvatar"
                animation="fade"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label>
                <q-skeleton
                  type="text"
                  animation="fade"
                />
              </q-item-label>
              <q-item-label caption>
                <q-skeleton
                  type="text"
                  animation="fade"
                />
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-skeleton
            height="200px"
            square
            animation="fade"
          />

          <q-card-section>
            <q-skeleton
              type="text"
              class="text-subtitle2"
              animation="fade"
            />
            <q-skeleton
              type="text"
              width="50%"
              class="text-subtitle2"
              animation="fade"
            />
          </q-card-section>
        </q-card>

        <template v-else-if="formatedPosts.length === 0">
          <h5 class="text-center text-grey">No posts yet</h5>
        </template>

        <template v-else>
          <q-card
            v-for="post in formatedPosts"
            :key="post.id"
            class="card-post q-mb-md"
            flat
            bordered
            :class="{ 'bg-red-1': post.offline }"
          >
            <q-badge
              v-if="post.offline"
              color="red"
              class="absolute-top-right badge-offline"
            >
              Stored offline
            </q-badge>

            <q-item>
              <q-item-section avatar>
                <q-avatar>
                  <img src="https://cdn.quasar.dev/img/boy-avatar.png" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-bold">@user_name</q-item-label>
                <q-item-label caption>{{ post.location }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />

            <q-img :src="post.imageUrl" />

            <q-card-section>
              <div>{{ post.caption }}</div>
              <div class="text-caption text-grey">{{ post.date }}</div>
            </q-card-section>
          </q-card>
        </template>
      </div>

      <div class="col-4 large-screen-only">
        <q-item class="fixed">
          <q-item-section avatar>
            <q-avatar size="48px">
              <img src="https://cdn.quasar.dev/img/boy-avatar.png" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-bold">@user_name</q-item-label>
            <q-item-label caption>User Name</q-item-label>
          </q-item-section>
        </q-item>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref, onActivated } from 'vue';
import { date, useQuasar } from 'quasar';
import axios from 'axios';
import { openDB } from 'idb';

interface Post {
  id: string;
  date: number;
  caption: string;
  location: string;
  imageUrl: string;
  offline?: boolean;
}

interface FormatedPost extends Omit<Post, 'date'> {
  date: string;
}

interface DbData {
  queueName: string;
  requestData: {
    url: string;
  };
}

interface Msg {
  msg: string;
}

export default defineComponent({
  name: 'HomePage',

  setup() {
    const $q = useQuasar();

    const posts = ref<Array<Post>>([]);
    const loadingPosts = ref(false);
    const showNotificationsBanner = ref(false);

    const isServiceWorkerSupported = computed(() => {
      return 'serviceWorker' in navigator;
    });

    const isPushNotificationsSupported = computed(() => {
      return 'PushManager' in window;
    });

    const formatedPosts = computed(() => {
      return posts.value.map((post) => {
        return {
          ...post,
          date: date.formatDate(post.date, 'MMMM D, h:mmA'),
        } as FormatedPost;
      });
    });

    const getOfflinePosts = async (): Promise<void> => {
      try {
        const db = await openDB('workbox-background-sync');
        const failedRequests = (await db.getAll('requests')) as DbData[];

        for await (const failedRequest of failedRequests) {
          console.log('createPostQueue', failedRequest.queueName);
          if (failedRequest.queueName === 'createPostQueue') {
            const request = new Request(
              failedRequest.requestData.url,
              failedRequest.requestData as RequestInit
            );

            const formData = await request.formData();

            const offlinePost: Post = {
              id: formData.get('id') as string,
              caption: formData.get('caption') as string,
              location: formData.get('location') as string,
              date: parseInt(formData.get('date') as string),
              offline: true,
              imageUrl: null,
            };

            const getImage = (fileUrl: Blob): Promise<string> => {
              return new Promise((resolve) => {
                const reader = new FileReader();

                reader.readAsDataURL(fileUrl);
                reader.onloadend = () => resolve(reader.result as string);
              });
            };

            offlinePost.imageUrl = await getImage(formData.get('file') as Blob);

            posts.value = [offlinePost, ...posts.value];
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    const getPosts = async (): Promise<void> => {
      loadingPosts.value = true;

      try {
        const response = await axios.get(`${process.env.API}/posts`);

        posts.value = response.data as Array<Post>;
      } catch (_error) {
        $q.dialog({
          title: 'Error',
          message: 'Could not find any posts',
        });
      }

      if (!navigator.onLine) {
        await getOfflinePosts();
      }

      loadingPosts.value = false;
    };

    const listenForOfflinePostUploadad = () => {
      if (!isServiceWorkerSupported.value) {
        return;
      }

      const channel = new BroadcastChannel('sw-messages');

      channel.addEventListener('message', (event: MessageEvent<Msg>) => {
        if (event.data.msg === 'offline-post-uploadad') {
          posts.value = posts.value.map((post) => ({
            ...post,
            offline: false,
          }));
        }
      });
    };

    const showLaterNotificationsBanner = () => {
      showNotificationsBanner.value = false;
    };

    const neverShowNotificationsBanner = () => {
      showNotificationsBanner.value = false;

      $q.localStorage.set('neverShowNotificationsBanner', true);
    };

    const displayGrantedNotification = () => {
      // new Notification('New notification!', {
      //   body: 'Thanks for subscribing',
      //   icon: 'icons/icon-128x128.png',
      //   image: 'icons/icon-128x128.png',
      //   badge: 'icons/icon-128x128.png',
      //   dir: 'ltr',
      //   lang: 'en-US',
      //   vibrate: [100, 50, 200],
      //   tag: 'confirm-notifications',
      //   renotify: true,
      // });

      if (
        isServiceWorkerSupported.value &&
        isPushNotificationsSupported.value
      ) {
        navigator.serviceWorker.ready
          .then((swreg) => {
            return swreg.showNotification('New notification!', {
              body: 'Thanks for subscribing',
              icon: 'icons/icon-128x128.png',
              image: 'icons/icon-128x128.png',
              badge: 'icons/icon-128x128.png',
              dir: 'ltr',
              lang: 'en-US',
              vibrate: [100, 50, 200],
              tag: 'confirm-notifications',
              renotify: true,
              actions: [
                {
                  action: 'hello',
                  title: 'Hello',
                  icon: 'icons/icon-128x128.png',
                },
                {
                  action: 'goodby',
                  title: 'GoodBy',
                  icon: 'icons/icon-128x128.png',
                },
              ],
            });
          })
          .catch((error) => {
            console.log(error);
          });
      }
    };

    const createPushSubscription = async (reg: ServiceWorkerRegistration) => {
      const vapidPublicKey =
        'BDuMZjCz2NQ-69_pKLWoGOyh2PELB7pxKTpcM-pMSQB8KSeJJ7BJbOU58X8MImt9g5p-hnuHuMPSSqpgncX9Rrw';

      try {
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

        const newSubData = newSub.toJSON();

        await axios.post(`${process.env.API}/createSubscription`, newSubData);

        displayGrantedNotification();
      } catch (error) {
        console.log(error);
      }
    };

    const checkForExistingPushSubscription = () => {
      // new Notification('New notification!', {
      //   body: 'Thanks for subscribing',
      //   icon: 'icons/icon-128x128.png',
      //   image: 'icons/icon-128x128.png',
      //   badge: 'icons/icon-128x128.png',
      //   dir: 'ltr',
      //   lang: 'en-US',
      //   vibrate: [100, 50, 200],
      //   tag: 'confirm-notifications',
      //   renotify: true,
      // });

      if (
        isServiceWorkerSupported.value &&
        isPushNotificationsSupported.value
      ) {
        let reg: ServiceWorkerRegistration;

        navigator.serviceWorker.ready
          .then((swreg) => {
            reg = swreg;

            return swreg.pushManager.getSubscription();
          })
          .then((sub) => {
            if (!sub) {
              void createPushSubscription(reg);
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    };

    const enableNotifications = async (): Promise<void> => {
      if (!isPushNotificationsSupported.value) {
        return;
      }

      try {
        const permission = await Notification.requestPermission();

        neverShowNotificationsBanner();

        if (permission === 'granted') {
          // displayGrantedNotification();
          checkForExistingPushSubscription();
        }
      } catch (error) {
        console.log('enableNotifications error', error);
      }
    };

    const initNotificationBanner = () => {
      const isNeverShow = $q.localStorage.getItem(
        'neverShowNotificationsBanner'
      );

      if (!isNeverShow) {
        showNotificationsBanner.value = true;
      }
    };

    onMounted(() => {
      listenForOfflinePostUploadad();
      initNotificationBanner();
    });

    onActivated(() => {
      void getPosts();
    });

    return {
      formatedPosts,
      loadingPosts,
      showNotificationsBanner,
      enableNotifications,
      showLaterNotificationsBanner,
      neverShowNotificationsBanner,
      isPushNotificationsSupported,
    };
  },
});
</script>

<style lang="scss">
.card-post {
  .q-image {
    min-height: 300px;
  }

  .badge-offline {
    border-top-left-radius: 0 !important;
  }
}
</style>
