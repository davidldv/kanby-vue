<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="kanby-header">
      <q-toolbar class="kanby-container q-py-sm">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <router-link
            to="/boards"
            class="text-white"
            style="text-decoration: none; letter-spacing: -0.2px"
          >
            <span style="font-weight: 700">Kanby</span>
            <span style="font-weight: 700; color: #2dd4bf"> Studio</span>
          </router-link>
          <div class="text-caption kanby-muted" style="margin-top: 2px">
            Kanban with live updates
          </div>
        </q-toolbar-title>

        <q-input
          v-model="userId"
          dense
          dark
          filled
          label="Name"
          class="q-ml-md"
          style="width: 220px"
          @blur="persistUser"
          @keyup.enter="persistUser"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above class="kanby-drawer">
      <q-list class="q-pt-sm">
        <q-item-label header class="kanby-muted"> Navigation </q-item-label>

        <q-item clickable to="/boards" active-class="text-primary">
          <q-item-section avatar>
            <q-icon name="view_kanban" />
          </q-item-section>
          <q-item-section>Boards</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getUserId, setUserId } from 'src/lib/user';

const leftDrawerOpen = ref(false);
const userId = ref(getUserId());

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function persistUser() {
  setUserId(userId.value);
}
</script>
