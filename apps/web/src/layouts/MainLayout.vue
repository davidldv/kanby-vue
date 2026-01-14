<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <router-link to="/boards" class="text-white" style="text-decoration: none">
            Kanby
          </router-link>
        </q-toolbar-title>

        <q-input
          v-model="userId"
          dense
          standout="bg-grey-10 text-white"
          label="User"
          style="width: 220px"
          @blur="persistUser"
          @keyup.enter="persistUser"
        />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Navigation </q-item-label>

        <q-item clickable to="/boards">
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
