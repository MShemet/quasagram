<template>
  <q-page class="constrain-more q-pa-md">
    <div class="camera-frame q-pa-md">
      <video
        v-show="!imageCaptured"
        ref="video"
        class="full-width"
        autoplay
      />

      <canvas
        v-show="imageCaptured"
        ref="canvas"
        class="full-width"
        height="240"
      />
    </div>

    <div class="text-center q-pa-md">
      <q-btn
        v-if="hasCameraSuport"
        round
        color="grey-10"
        icon="eva-camera"
        size="lg"
        :disable="imageCaptured"
        @click="captureImage"
      />
      <q-file
        v-else
        v-model="imageUpload"
        accept="image/*"
        outlined
        label="Choose an image"
        @input="captureImageFallback"
      >
        <template #prepend>
          <q-icon name="eva-attach-outline" />
        </template>
      </q-file>
    </div>

    <div class="row justify-center q-ma-md">
      <q-input
        v-model="post.caption"
        label="Caption *"
        class="col col-sm-6"
        dense
      />
    </div>

    <div class="row justify-center q-ma-md">
      <q-input
        v-model="post.location"
        :loading="locationLoading"
        label="Location"
        class="col col-sm-6"
        dense
      >
        <template
          v-if="!locationLoading && locationSupported"
          #append
        >
          <q-btn
            round
            dense
            flat
            icon="eva-navigation-2-outline"
            @click="getLocation"
          />
        </template>
      </q-input>
    </div>

    <div class="row justify-center q-mt-lg">
      <q-btn
        unelevated
        rounded
        color="primary"
        label="Post image"
        :disable="!imageCaptured || !post.caption"
        @click="addPost"
      />
    </div>
  </q-page>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  onMounted,
  ref,
  onBeforeUnmount,
  computed,
} from 'vue';

import { useRouter } from 'vue-router';
import { uid, useQuasar } from 'quasar';
import axios from 'axios';

interface Post {
  id: string;
  caption: string;
  location: string;
  photo: Blob | File | null;
  date: number;
}

interface Location {
  city: string;
  country?: string;
}

function dataURItoBlob(dataURI: string): Blob {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  const ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  const ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  const blob = new Blob([ab], { type: mimeString });

  return blob;
}

export default defineComponent({
  name: 'CameraPage',

  setup() {
    const $q = useQuasar();
    const router = useRouter();

    const post = reactive<Post>({
      id: uid(),
      caption: '',
      location: '',
      photo: null,
      date: Date.now(),
    });

    const video = ref<HTMLVideoElement | null>(null);
    const canvas = ref<HTMLCanvasElement | null>(null);
    const imageUpload = ref<File | null>(null);

    const imageCaptured = ref(false);
    const hasCameraSuport = ref(true);
    const locationLoading = ref(false);

    const locationSupported = computed(() => {
      return 'geolocation' in navigator;
    });

    const initCamera = () => {
      navigator.mediaDevices
        .getUserMedia({
          video: true,
        })
        .then((stream) => {
          video.value.srcObject = stream;
        })
        .catch(() => {
          hasCameraSuport.value = false;
        });
    };

    const disableCamera = () => {
      const stream = video.value.srcObject as MediaStream;
      const tracks = stream.getTracks();

      tracks.forEach((track) => track.stop());
    };

    const captureImage = () => {
      const { width, height } = video.value.getBoundingClientRect();

      canvas.value.width = width;
      canvas.value.height = height;

      const context = canvas.value.getContext('2d');

      context.drawImage(video.value, 0, 0, width, height);

      post.photo = dataURItoBlob(canvas.value.toDataURL());

      imageCaptured.value = true;

      disableCamera();
    };

    const captureImageFallback = (event: Event) => {
      const file = (event.currentTarget as HTMLInputElement).files[0];

      post.photo = file;

      const reader = new FileReader();
      const context = canvas.value.getContext('2d');

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          canvas.value.width = img.width;
          canvas.value.height = img.height;

          context.drawImage(img, 0, 0);

          imageCaptured.value = true;
        };

        img.src = e.target.result as string;
      };

      reader.readAsDataURL(file);
    };

    const processError = () => {
      $q.dialog({
        title: 'Error',
        message: 'Could not find your location',
      });
    };

    const setUserLocation = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const apiUrl = `https://geocode.xyz/${latitude},${longitude}?json=1`;

      locationLoading.value = true;

      axios
        .get(apiUrl)
        .then((result) => {
          const { city, country } = result.data as Location;
          post.location = country ? `${city}, ${country}` : city;
        })
        .catch(processError)
        .finally(() => {
          locationLoading.value = false;
        });
    };

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition(setUserLocation, processError, {
        timeout: 7000,
      });
    };

    const addPost = async () => {
      $q.loading.show();

      const formData = new FormData();

      formData.append('id', post.id);
      formData.append('location', post.location);
      formData.append('caption', post.caption);
      formData.append('date', String(post.date));
      formData.append('file', post.photo, post.id + '.png');

      try {
        await axios.post(`${process.env.API}/createPost`, formData);

        await router.push('/');

        $q.notify({
          message: 'Post created',
          color: 'primary',
          avatar: 'https://cdn.quasar.dev/img/boy-avatar.png',
          actions: [{ label: 'Dismiss', color: 'white' }],
        });
      } catch (error) {
        $q.dialog({
          title: 'Error',
          message: 'Sorry, could not create post!',
        });
      }

      $q.loading.hide();
    };

    onMounted(() => {
      initCamera();
    });

    onBeforeUnmount(() => {
      if (hasCameraSuport.value) {
        disableCamera();
      }
    });

    return {
      post,
      video,
      canvas,
      captureImage,
      imageCaptured,
      hasCameraSuport,
      imageUpload,
      captureImageFallback,
      getLocation,
      locationLoading,
      locationSupported,
      addPost,
    };
  },
});
</script>

<style lang="scss">
.camera-frame {
  border: 2px solid $grey-10;
  border-radius: 10px;
}
</style>
