<template>
  <q-page class="q-pa-md">
    <div class="kanby-container">
      <q-card class="kanby-panel q-pa-md">
        <div class="text-h4" style="font-weight: 750; letter-spacing: -0.4px">
          Kanby <span class="text-primary">Studio</span>
        </div>
        <div class="kanby-muted q-mt-xs">
          Kanban with live updates, an activity timeline, and undo per card.
        </div>

        <div class="row items-center q-col-gutter-md q-mt-md">
          <div class="col-12 col-sm">
            <q-input
              v-model="newTitle"
              dark
              filled
              placeholder="e.g. Project Sprint"
              label="New board"
              @keyup.enter="submit"
            />
            <div class="text-caption kanby-muted q-mt-xs">
              Tip: open two tabs to see realtime updates.
            </div>
          </div>
          <div class="col-12 col-sm-auto">
            <q-btn
              color="primary"
              label="Create board"
              :disable="!newTitle.trim()"
              @click="submit"
            />
          </div>
        </div>
      </q-card>

      <div class="row items-end q-mt-lg q-mb-sm">
        <div class="col">
          <div class="text-subtitle1" style="font-weight: 650">Boards</div>
        </div>
        <div class="col-auto kanby-muted text-caption">{{ boardsStore.boards.length }} total</div>
      </div>

      <q-banner v-if="boardsStore.error" class="bg-red-2 text-red-10 q-mb-md" rounded>
        {{ boardsStore.error }}
      </q-banner>

      <div v-if="boardsStore.loading" class="row items-center q-gutter-sm">
        <q-spinner />
        <div class="kanby-muted">Loading…</div>
      </div>

      <div v-else class="row q-col-gutter-md">
        <div v-for="b in boardsStore.boards" :key="b.id" class="col-12 col-sm-6 col-md-4">
          <q-card class="kanby-card" @click="goBoard(b.id)">
            <q-card-section>
              <div class="row items-start">
                <div class="col">
                  <div class="text-subtitle1" style="font-weight: 650">
                    {{ b.title }}
                  </div>
                  <div class="text-caption kanby-muted">
                    Created {{ new Date(b.createdAt).toLocaleString() }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-btn dense flat round icon="arrow_forward" @click.stop="goBoard(b.id)" />
                </div>
              </div>

              <q-separator class="q-my-sm" />

              <div class="row items-center">
                <div class="col text-caption kanby-muted">
                  Drag cards • See activity • Undo changes
                </div>
                <div class="col-auto">
                  <q-btn outline size="sm" label="Open" @click.stop="goBoard(b.id)" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div v-if="boardsStore.boards.length === 0" class="col-12">
          <q-card class="kanby-panel" flat>
            <q-card-section>
              <div class="text-subtitle2" style="font-weight: 650">No boards yet</div>
              <div class="text-caption kanby-muted">Create one to get started.</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
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
    newTitle.value = '';
    $q.notify({ type: 'positive', message: 'Board created' });
    goBoard(board.id);
  }
}
</script>
