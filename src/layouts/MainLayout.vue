<template>
  <q-layout view="lHh Lpr lFf">
    <q-header
      class="bg-white text-grey-10"
      bordered
    >
      <q-toolbar class="constrain">
        <q-btn
          class="large-screen-only q-mr-sm"
          to="/camera"
          flat
          round
          icon="eva-camera-outline"
          size="18px"
          dense
        />

        <q-separator
          class="large-screen-only"
          vertical
        />

        <q-toolbar-title class="text-grand-hotel text-bold">
          Quasagram
        </q-toolbar-title>

        <q-btn
          class="large-screen-only"
          to="/"
          flat
          round
          icon="eva-home-outline"
          size="18px"
          dense
        />
      </q-toolbar>
    </q-header>

    <q-page-container class="bg-grey-1">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['HomePage']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </q-page-container>

    <q-footer
      class="bg-white"
      bordered
    >
      <transition
        appear
        enter-active-class="animated fadeIn"
        leave-active-class="animated fadeOut"
      >
        <div
          v-if="showAppInstallBanner"
          class="bg-primary"
        >
          <q-banner
            inline-actions
            dense
            class="bg-primary text-white constrain"
          >
            <template #avatar>
              <q-avatar
                color="white"
                text-color="grey-10"
                icon="eva-camera-outline"
                font-size="22px"
              />
            </template>

            <b>Install Quasagram?</b>

            <template #action>
              <q-btn
                flat
                label="Yes"
                dense
                class="q-px-sm"
                @click="installApp"
              />

              <q-btn
                flat
                label="Later"
                dense
                class="q-px-sm"
                @click="showLaterAppInstall"
              />

              <q-btn
                flat
                label="Never"
                dense
                class="q-px-sm"
                @click="neverShowAppInstallBanner"
              />
            </template>
          </q-banner>
        </div>
      </transition>

      <q-tabs
        class="text-grey-10 small-screen-only"
        active-color="primary"
        indicator-color="transparent"
      >
        <q-route-tab
          to="/"
          name="home"
          icon="eva-home-outline"
        />
        <q-route-tab
          to="/camera"
          name="camera"
          icon="eva-camera-outline"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { BeforeInstallPromptEvent } from '../types';

export default defineComponent({
  name: 'MainLayout',

  setup() {
    const $q = useQuasar();
    const showAppInstallBanner = ref(false);

    let deferredPrompt: BeforeInstallPromptEvent;

    const showLaterAppInstall = () => {
      showAppInstallBanner.value = false;
    };

    const neverShowAppInstallBanner = () => {
      showAppInstallBanner.value = false;

      $q.localStorage.set('neverShowAppInstallBanner', true);
    };

    const installApp = async () => {
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        neverShowAppInstallBanner();
      } else {
        showAppInstallBanner.value = false;
      }
    };

    onMounted(() => {
      const isNeverShow = $q.localStorage.getItem('neverShowAppInstallBanner');

      if (!isNeverShow) {
        window.addEventListener(
          'beforeinstallprompt',
          (e: BeforeInstallPromptEvent) => {
            e.preventDefault();

            deferredPrompt = e;

            setTimeout(() => {
              showAppInstallBanner.value = true;
            }, 3000);
          }
        );
      }
    });

    return {
      showAppInstallBanner,
      installApp,
      neverShowAppInstallBanner,
      showLaterAppInstall,
    };
  },
});
</script>

<style lang="scss">
.q-toolbar__title {
  font-size: 30px;

  @media (max-width: $breakpoint-xs-max) {
    text-align: center;
  }
}

.q-footer {
  .q-tab__icon {
    font-size: 30px;
  }
}
</style>
