<template>
  <q-page class="constrain q-pa-md">
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-sm-8">
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
import { defineComponent, computed } from 'vue';
import { date } from 'quasar';

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
    const posts: Array<Post> = [
      {
        id: 1,
        date: 1648386610162,
        caption: 'Our Changing Planet',
        location: 'IF, Ukraine',
        imageUrl: 'https://cdn.quasar.dev/img/parallax1.jpg',
      },
      {
        id: 2,
        date: 1648386610162,
        caption: 'Our Changing Planet',
        location: 'IF, Ukraine',
        imageUrl: 'https://cdn.quasar.dev/img/parallax1.jpg',
      },
      {
        id: 3,
        date: 1648386610162,
        caption: 'Our Changing Planet',
        location: 'IF, Ukraine',
        imageUrl: 'https://cdn.quasar.dev/img/parallax1.jpg',
      },
    ];

    const formatedPosts = computed(() => {
      return posts.map((post) => {
        return {
          ...post,
          date: date.formatDate(post.date, 'MMMM D, h:mmA'),
        } as FormatedPost;
      });
    });

    return {
      formatedPosts,
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
