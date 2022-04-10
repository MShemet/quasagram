<template>
  <q-page class="constrain q-pa-md">
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

    const isServiceWprkerSupported = computed(() => {
      return 'serviceWorker' in navigator;
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

    onMounted(() => {
      if (isServiceWprkerSupported.value) {
        listenForOfflinePostUploadad();
      }
    });

    onActivated(() => {
      void getPosts();
    });

    return {
      formatedPosts,
      loadingPosts,
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
