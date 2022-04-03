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
          >
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
import { defineComponent, computed, onMounted, ref } from 'vue';
import { date, useQuasar } from 'quasar';
import axios from 'axios';

interface Post {
  id: number;
  date: number;
  caption: string;
  location: string;
  imageUrl: string;
}

interface FormatedPost extends Omit<Post, 'date'> {
  date: string;
}

export default defineComponent({
  name: 'HomePage',

  setup() {
    const $q = useQuasar();

    let posts = ref<Array<Post>>([]);
    const loadingPosts = ref(false);

    const formatedPosts = computed(() => {
      return posts.value.map((post) => {
        return {
          ...post,
          date: date.formatDate(post.date, 'MMMM D, h:mmA'),
        } as FormatedPost;
      });
    });

    const getPosts = async () => {
      loadingPosts.value = true;

      try {
        const response = await axios.get('http://localhost:3000/posts');

        posts.value = response.data as Array<Post>;
      } catch (_error) {
        $q.dialog({
          title: 'Error',
          message: 'Could not find any posts',
        });
      }

      loadingPosts.value = false;
    };

    onMounted(() => {
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
}
</style>
