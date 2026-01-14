<template>
  <q-page class="q-pa-md">
    <div class="kanby-container">
      <div class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="row items-center q-gutter-sm">
            <router-link to="/boards" class="kanby-muted" style="text-decoration: none">
              Boards
            </router-link>
            <span class="kanby-muted">/</span>
            <div class="text-subtitle1" style="font-weight: 700; letter-spacing: -0.2px">
              {{ boardStore.board?.title ?? 'Board' }}
            </div>
          </div>
        </div>
        <div class="col-auto">
          <div class="kanby-pill">Drag cards • Realtime • Undo</div>
        </div>
      </div>

      <q-banner v-if="boardStore.error" class="bg-red-2 text-red-10 q-mt-md" rounded>
        {{ boardStore.error }}
      </q-banner>

      <div v-if="boardStore.loading" class="row items-center q-gutter-sm q-mt-md">
        <q-spinner />
        <div class="kanby-muted">Loading…</div>
      </div>

      <div v-else class="q-mt-md">
        <div class="row items-start no-wrap" style="overflow-x: auto; gap: 14px">
          <VueDraggable
            v-model="listsModel"
            target="#lists-target"
            :animation="150"
            @end="onListsReordered"
          >
            <div id="lists-target" class="row items-start no-wrap" style="gap: 14px">
              <q-card
                v-for="list in listsModel"
                :key="list.id"
                :data-id="list.id"
                class="kanby-card"
                style="width: 320px; min-width: 320px"
              >
                <q-card-section class="q-pb-xs">
                  <div class="row items-center q-gutter-sm">
                    <div class="kanby-dot" />
                    <div class="col" style="font-weight: 650">{{ list.title }}</div>
                    <div class="col-auto kanby-pill">
                      {{ (boardStore.cardsByListId[list.id] ?? []).length }}
                    </div>
                    <q-btn class="col-auto" dense flat round icon="more_horiz">
                      <q-menu class="kanby-card">
                        <q-list style="min-width: 160px">
                          <q-item clickable v-close-popup @click="deleteList(list.id)">
                            <q-item-section class="text-negative">Delete list</q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </div>
                </q-card-section>

                <q-separator class="q-my-xs" />

                <q-card-section class="q-pt-sm">
                  <VueDraggable
                    :model-value="(boardStore.cardsByListId[list.id] ?? []) as CardDto[]"
                    @update:model-value="(v: CardDto[]) => (boardStore.cardsByListId[list.id] = v)"
                    :target="`#cards-${list.id}`"
                    group="cards"
                    :animation="150"
                    @end="(evt) => onCardsDragEnd(evt, list.id)"
                  >
                    <div
                      :id="`cards-${list.id}`"
                      class="column"
                      :data-list-id="list.id"
                      style="gap: 10px"
                    >
                      <q-card
                        v-for="card in boardStore.cardsByListId[list.id] ?? []"
                        :key="card.id"
                        :data-id="card.id"
                        :data-card-id="card.id"
                        class="kanby-card"
                        style="border-radius: 14px"
                      >
                        <q-card-section class="q-pa-sm">
                          <div class="row items-start q-col-gutter-xs">
                            <div class="col">
                              <div style="font-weight: 600">{{ card.title }}</div>
                              <div v-if="card.description" class="text-caption kanby-muted">
                                {{ card.description }}
                              </div>
                            </div>
                            <div class="col-auto">
                              <q-btn dense flat round icon="edit" @click="openEdit(card)" />
                            </div>
                          </div>
                        </q-card-section>
                      </q-card>
                    </div>
                  </VueDraggable>

                  <q-input
                    v-model="newCardTitle[list.id]"
                    dense
                    dark
                    filled
                    placeholder="Add a card"
                    class="q-mt-sm"
                    @keyup.enter="addCard(list.id)"
                  >
                    <template #append>
                      <q-btn
                        dense
                        flat
                        icon="add"
                        :disable="!(newCardTitle[list.id] || '').trim()"
                        @click="addCard(list.id)"
                      />
                    </template>
                  </q-input>
                </q-card-section>
              </q-card>
            </div>
          </VueDraggable>

          <q-card class="kanby-card" style="width: 320px; min-width: 320px" flat>
            <q-card-section>
              <div class="text-subtitle2" style="font-weight: 650">Add list</div>
              <q-input
                v-model="newListTitle"
                dense
                dark
                filled
                placeholder="List title"
                class="q-mt-sm"
                @keyup.enter="addList"
              >
                <template #append>
                  <q-btn dense flat icon="add" :disable="!newListTitle.trim()" @click="addList" />
                </template>
              </q-input>
            </q-card-section>
          </q-card>
        </div>

        <q-card class="kanby-panel q-mt-lg">
          <q-card-section>
            <div class="row items-center">
              <div class="col text-subtitle1" style="font-weight: 650">Activity</div>
              <div class="col-auto q-gutter-sm">
                <q-btn
                  outline
                  size="sm"
                  label="Refresh"
                  :loading="activityStore.loading"
                  @click="refreshActivity"
                />
                <q-btn
                  color="negative"
                  size="sm"
                  label="Clear"
                  :disable="activityStore.loading || activityStore.events.length === 0"
                  @click="clearActivity"
                />
              </div>
            </div>

            <q-banner v-if="activityStore.error" class="bg-red-2 text-red-10 q-mt-sm" rounded>
              {{ activityStore.error }}
            </q-banner>

            <q-card
              v-if="!activityStore.loading && activityStore.events.length === 0"
              flat
              class="q-mt-sm kanby-card"
            >
              <q-card-section class="row items-center q-gutter-md">
                <q-icon name="auto_awesome" size="28px" class="text-primary" />
                <div class="col">
                  <div style="font-weight: 650">No activity yet</div>
                  <div class="text-caption kanby-muted">
                    Move a card, create a list, or edit something to see it here.
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-list class="q-mt-sm" separator style="max-height: 360px; overflow: auto">
              <q-item v-for="e in activityStore.events" :key="e.id">
                <q-item-section>
                  <q-item-label>
                    <span style="font-weight: 600">{{ activityTitle(e) }}</span>
                    <span v-if="e.undoneAt" class="text-caption kanby-muted"> (undone)</span>
                  </q-item-label>
                  <q-item-label caption class="kanby-muted">
                    {{ activityWhen(e) }} • {{ e.actorUserId }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    v-if="canUndo(e)"
                    dense
                    outline
                    size="sm"
                    label="Undo"
                    @click="undo(e.id)"
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <div class="row justify-end q-mt-sm">
              <q-btn
                outline
                size="sm"
                label="Load more"
                :disable="!activityStore.nextCursor || activityStore.loading"
                @click="activityStore.loadMore"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-dialog v-model="editOpen">
        <q-card style="min-width: 420px">
          <q-card-section>
            <div class="text-h6">Edit card</div>
          </q-card-section>
          <q-card-section class="q-gutter-sm">
            <q-input v-model="editTitle" label="Title" />
            <q-input v-model="editDescription" type="textarea" label="Description" autogrow />
          </q-card-section>
          <q-card-actions align="between">
            <q-btn flat color="negative" label="Delete" @click="confirmDelete" />
            <div>
              <q-btn flat label="Cancel" v-close-popup />
              <q-btn color="primary" label="Save" :disable="!editTitle.trim()" @click="saveEdit" />
            </div>
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { VueDraggable } from 'vue-draggable-plus';
import type { CardDto, ListDto, ActivityEventDto } from '@kanby/shared';

import { useBoardStore } from 'src/stores/board';
import { useActivityStore } from 'src/stores/activity';
import { useRealtimeStore } from 'src/stores/realtime';
import { activityTitle, activityWhen } from 'src/lib/activityFormat';
import { errorMessage } from 'src/lib/errors';

const $q = useQuasar();
const route = useRoute();

const boardStore = useBoardStore();
const activityStore = useActivityStore();
const realtimeStore = useRealtimeStore();

const newListTitle = ref('');
const newCardTitle = reactive<Record<string, string>>({});

const editOpen = ref(false);
const editCardId = ref<string | null>(null);
const editListId = ref<string | null>(null);
const editTitle = ref('');
const editDescription = ref<string>('');

const boardId = computed(() => String(route.params.boardId ?? ''));

const listsModel = computed<ListDto[]>({
  get: () => boardStore.lists,
  set: (v) => {
    boardStore.lists = v;
  },
});

function canUndo(e: ActivityEventDto): boolean {
  if (e.undoneAt) return false;
  if (e.type === 'UNDO') return false;
  return true;
}

async function bootstrap(id: string) {
  await boardStore.load(id);
  await activityStore.loadRecent(id);
  realtimeStore.joinBoard(id);
}

onMounted(async () => {
  await bootstrap(boardId.value);
});

watch(
  () => boardId.value,
  async (next, prev) => {
    if (!next || next === prev) return;
    realtimeStore.leaveBoard(prev);
    boardStore.clear();
    activityStore.clearLocal();
    await bootstrap(next);
  },
);

onBeforeUnmount(() => {
  realtimeStore.leaveBoard(boardId.value);
});

async function addList() {
  const title = newListTitle.value.trim();
  if (!title) return;
  await boardStore.addList(title);
  newListTitle.value = '';
}

async function deleteList(listId: string) {
  await boardStore.deleteList(listId);
  $q.notify({ type: 'warning', message: 'List deleted' });
}

async function refreshActivity() {
  await activityStore.loadRecent(boardId.value);
}

async function clearActivity() {
  // Clear UI immediately; if server fails, restore by refetch.
  const id = boardId.value;
  const before = {
    events: [...activityStore.events],
    nextCursor: activityStore.nextCursor,
  };

  activityStore.events = [];
  activityStore.nextCursor = null;
  activityStore.error = null;

  try {
    await activityStore.clearServer(id);
    $q.notify({ type: 'warning', message: 'Activity cleared' });
  } catch {
    // Restore local state quickly and then refetch to get the authoritative server view.
    activityStore.events = before.events;
    activityStore.nextCursor = before.nextCursor;
    $q.notify({ type: 'negative', message: 'Failed to clear activity' });
    void refreshActivity();
  }
}

async function addCard(listId: string) {
  const title = (newCardTitle[listId] ?? '').trim();
  if (!title) return;
  await boardStore.addCard(listId, title);
  newCardTitle[listId] = '';
}

async function onListsReordered() {
  const ids = boardStore.lists.map((l) => l.id);
  await boardStore.reorderLists(ids);
}

async function onCardsDragEnd(evt: unknown, listId: string) {
  if (!evt || typeof evt !== 'object') return;

  const e = evt as {
    oldIndex?: number | null;
    newIndex?: number | null;
    item?: Element;
    to?: HTMLElement;
    from?: HTMLElement;
  };

  if (e.oldIndex == null || e.newIndex == null) return;

  const cardId =
    e.item?.getAttribute('data-card-id') ?? (e.item as HTMLElement | undefined)?.dataset?.cardId;
  const toListId = e.to?.dataset?.listId ?? listId;
  if (!cardId || !toListId) return;

  // When dragging across lists, Sortable can emit events that reach multiple handlers.
  // Only act when this handler corresponds to the destination list.
  if (listId !== toListId) return;

  try {
    await boardStore.moveCard(cardId, toListId, e.newIndex);
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: errorMessage(err, 'Move failed') });
    // boardStore.moveCard rolls back locally on failure.
  }
}

function openEdit(card: CardDto) {
  editCardId.value = card.id;
  editListId.value = card.listId;
  editTitle.value = card.title;
  editDescription.value = card.description ?? '';
  editOpen.value = true;
}

async function saveEdit() {
  if (!editCardId.value) return;
  await boardStore.patchCard(editCardId.value, {
    title: editTitle.value.trim(),
    description: editDescription.value.trim().length ? editDescription.value : null,
  });
  editOpen.value = false;
  $q.notify({ type: 'positive', message: 'Card updated' });
}

async function confirmDelete() {
  if (!editCardId.value || !editListId.value) return;
  await boardStore.deleteCard(editCardId.value, editListId.value);
  editOpen.value = false;
  $q.notify({ type: 'warning', message: 'Card deleted' });
}

async function undo(eventId: string) {
  try {
    await activityStore.undo(eventId);
    $q.notify({ type: 'positive', message: 'Undone' });
    await boardStore.refresh();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: errorMessage(err, 'Undo failed') });
  }
}
</script>
