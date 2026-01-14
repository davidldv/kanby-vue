<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col">
        <div class="text-h5">Boards</div>
      </div>
      <div class="col-auto">
        <q-btn color="primary" label="New board" @click="openCreate = true" />
      </div>
    </div>

    <q-separator class="q-my-md" />

    <q-banner v-if="boardsStore.error" class="bg-red-1 text-red-10 q-mb-md" rounded>
      {{ boardsStore.error }}
    </q-banner>

    <div v-if="boardsStore.loading" class="row items-center q-gutter-sm">
      <q-spinner />
      <div>Loading…</div>
    </div>

    <div v-else class="row q-col-gutter-md">
      <div v-for="b in boardsStore.boards" :key="b.id" class="col-12 col-sm-6 col-md-4">
        <q-card class="cursor-pointer" @click="goBoard(b.id)">
          <q-card-section>
            <div class="text-subtitle1">{{ b.title }}</div>
            <div class="text-caption text-grey-7">
              Created {{ new Date(b.createdAt).toLocaleString() }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="boardsStore.boards.length === 0" class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2">No boards yet</div>
            <div class="text-caption text-grey-7">Create one to get started.</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="openCreate">
      <q-card style="min-width: 380px">
        <q-card-section>
          <div class="text-h6">Create board</div>
        </q-card-section>

        <q-card-section>
          <q-input v-model="newTitle" label="Title" autofocus @keyup.enter="submit" />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Create" :disable="!newTitle.trim()" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useBoardsStore } from 'src/stores/boards';

const $q = useQuasar();
const router = useRouter();
const boardsStore = useBoardsStore();

const openCreate = ref(false);
const newTitle = ref('');

onMounted(async () => {
  await boardsStore.fetchBoards();
});

function goBoard(boardId: string) {
  void router.push({ name: 'board', params: { boardId } });
}

async function submit() {
  const title = newTitle.value.trim();
  if (!title) return;

  const board = await boardsStore.createBoard(title);
  if (board) {
    openCreate.value = false;
    newTitle.value = '';
    $q.notify({ type: 'positive', message: 'Board created' });
    goBoard(board.id);
  }
}
</script>
