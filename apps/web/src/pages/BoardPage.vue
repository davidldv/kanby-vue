<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-col-gutter-md">
      <div class="col">
        <div class="text-h6">{{ boardStore.board?.title ?? 'Board' }}</div>
      </div>
      <div class="col-auto">
        <q-btn outline icon="history" label="Activity" @click="activityOpen = true" />
      </div>
    </div>

    <q-banner v-if="boardStore.error" class="bg-red-1 text-red-10 q-mt-md" rounded>
      {{ boardStore.error }}
    </q-banner>

    <div v-if="boardStore.loading" class="row items-center q-gutter-sm q-mt-md">
      <q-spinner />
      <div>Loading…</div>
    </div>

    <div v-else class="q-mt-md">
      <div class="row items-start no-wrap" style="overflow-x: auto; gap: 12px">
        <VueDraggable
          v-model="listsModel"
          target="#lists-target"
          :animation="150"
          @end="onListsReordered"
        >
          <div id="lists-target" class="row items-start no-wrap" style="gap: 12px">
            <q-card
              v-for="list in listsModel"
              :key="list.id"
              :data-id="list.id"
              style="width: 320px; min-width: 320px"
              bordered
            >
              <q-card-section class="q-pb-xs">
                <div class="row items-center q-gutter-sm">
                  <div class="col text-subtitle2">{{ list.title }}</div>
                  <q-btn class="col-auto" dense flat round icon="more_vert">
                    <q-menu>
                      <q-list style="min-width: 160px">
                        <q-item clickable v-close-popup @click="deleteList(list.id)">
                          <q-item-section class="text-negative">Delete list</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </div>
              </q-card-section>

              <q-separator />

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
                    style="gap: 8px"
                  >
                    <q-card
                      v-for="card in boardStore.cardsByListId[list.id] ?? []"
                      :key="card.id"
                      :data-id="card.id"
                      :data-card-id="card.id"
                      flat
                      bordered
                    >
                      <q-card-section class="q-pa-sm">
                        <div class="row items-start q-col-gutter-xs">
                          <div class="col">
                            <div class="text-body2">{{ card.title }}</div>
                            <div v-if="card.description" class="text-caption text-grey-7">
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
                  placeholder="Add a card…"
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

        <q-card style="width: 320px; min-width: 320px" bordered flat>
          <q-card-section>
            <q-input v-model="newListTitle" dense placeholder="Add a list…" @keyup.enter="addList">
              <template #append>
                <q-btn dense flat icon="add" :disable="!newListTitle.trim()" @click="addList" />
              </template>
            </q-input>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="activityOpen" position="right">
      <q-card style="width: 420px; max-width: 90vw; height: 100vh">
        <div class="q-pa-md">
          <div class="row items-center">
            <div class="col text-subtitle1">Activity</div>
            <div class="col-auto">
              <q-btn dense flat round icon="close" v-close-popup />
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <q-banner v-if="activityStore.error" class="bg-red-1 text-red-10 q-mb-sm" rounded>
            {{ activityStore.error }}
          </q-banner>

          <div class="column">
            <q-list bordered separator>
              <q-item v-for="e in activityStore.events" :key="e.id">
                <q-item-section>
                  <q-item-label>
                    <span>{{ activityTitle(e) }}</span>
                    <span v-if="e.undoneAt" class="text-caption text-grey-7"> (undone)</span>
                  </q-item-label>
                  <q-item-label caption> {{ activityWhen(e) }} • {{ e.actorUserId }} </q-item-label>
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

            <q-btn
              class="q-mt-sm"
              outline
              label="Load more"
              :disable="!activityStore.nextCursor || activityStore.loading"
              @click="activityStore.loadMore"
            />
          </div>
        </div>
      </q-card>
    </q-dialog>

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

const activityOpen = ref(false);
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

<style scoped>
/* Intentionally empty */
</style>
