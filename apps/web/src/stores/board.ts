import { defineStore } from 'pinia';
import type { BoardDto, ListDto, CardDto } from '@kanby/shared';
import { apiFetch } from 'src/lib/api';
import { errorMessage } from 'src/lib/errors';

export type BoardHydrated = {
  board: BoardDto;
  lists: ListDto[];
  cardsByListId: Record<string, CardDto[]>;
};

export const useBoardStore = defineStore('board', {
  state: () => ({
    boardId: null as string | null,
    board: null as BoardDto | null,
    lists: [] as ListDto[],
    cardsByListId: {} as Record<string, CardDto[]>,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    isLoaded: (s) => !!s.boardId && !!s.board,
  },
  actions: {
    clear() {
      this.boardId = null;
      this.board = null;
      this.lists = [];
      this.cardsByListId = {};
      this.loading = false;
      this.error = null;
    },

    async load(boardId: string) {
      this.loading = true;
      this.error = null;
      this.boardId = boardId;

      try {
        const board = await apiFetch<BoardDto>(`/boards/${boardId}`);
        const lists = await apiFetch<ListDto[]>(`/boards/${boardId}/lists`);

        const cardsEntries = await Promise.all(
          lists.map(async (l) => {
            const data = await apiFetch<{ boardId: string; listId: string; cards: CardDto[] }>(
              `/lists/${l.id}/cards`,
            );
            return [l.id, data.cards] as const;
          }),
        );

        this.board = board;
        this.lists = lists;
        this.cardsByListId = Object.fromEntries(cardsEntries);
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to load board');
      } finally {
        this.loading = false;
      }
    },

    async refresh() {
      if (!this.boardId) return;
      await this.load(this.boardId);
    },

    async addList(title: string) {
      if (!this.boardId) return;
      const data = await apiFetch<{ list: ListDto; activityEvent: unknown }>(
        `/boards/${this.boardId}/lists`,
        {
          method: 'POST',
          body: { title },
        },
      );
      this.lists = [...this.lists, data.list].sort((a, b) => a.position - b.position);
      this.cardsByListId[data.list.id] = [];
    },

    async updateList(listId: string, patch: Partial<Pick<ListDto, 'title' | 'position'>>) {
      if (!this.boardId) return;
      const data = await apiFetch<{ list: ListDto; activityEvent: unknown }>(
        `/boards/${this.boardId}/lists/${listId}`,
        {
          method: 'PATCH',
          body: patch,
        },
      );
      this.lists = this.lists.map((l) => (l.id === listId ? data.list : l));
      this.lists.sort((a, b) => a.position - b.position);
    },

    async deleteList(listId: string) {
      if (!this.boardId) return;
      await apiFetch<{ deletedListId: string; activityEvent: unknown }>(
        `/boards/${this.boardId}/lists/${listId}`,
        { method: 'DELETE' },
      );
      this.lists = this.lists.filter((l) => l.id !== listId);
      delete this.cardsByListId[listId];
    },

    async reorderLists(listIds: string[]) {
      if (!this.boardId) return;
      const data = await apiFetch<{ listIds: string[]; activityEvent: unknown }>(
        `/boards/${this.boardId}/reorder-lists`,
        {
          method: 'POST',
          body: { listIds },
        },
      );

      const idToList = new Map(this.lists.map((l) => [l.id, l] as const));
      this.lists = data.listIds.map((id) => idToList.get(id)).filter(Boolean) as ListDto[];
    },

    async addCard(listId: string, title: string) {
      const data = await apiFetch<{ card: CardDto; activityEvent: unknown }>(`/lists/${listId}/cards`, {
        method: 'POST',
        body: { title },
      });

      const cards = this.cardsByListId[listId] ?? [];
      this.cardsByListId[listId] = [...cards, data.card].sort((a, b) => a.position - b.position);
    },

    async patchCard(cardId: string, patch: Partial<Pick<CardDto, 'title' | 'description'>>) {
      const data = await apiFetch<{ card: CardDto; activityEvent: unknown }>(`/cards/${cardId}`, {
        method: 'PATCH',
        body: patch,
      });

      const listId = data.card.listId;
      const cards = this.cardsByListId[listId] ?? [];
      this.cardsByListId[listId] = cards.map((c) => (c.id === cardId ? data.card : c));
    },

    async deleteCard(cardId: string, listId: string) {
      await apiFetch<{ deletedCardId: string; activityEvent: unknown }>(`/cards/${cardId}`, {
        method: 'DELETE',
      });

      const cards = this.cardsByListId[listId] ?? [];
      this.cardsByListId[listId] = cards.filter((c) => c.id !== cardId);
    },

    async moveCard(cardId: string, toListId: string, toIndex: number) {
      const data = await apiFetch<{ card: CardDto; activityEvent: unknown }>(`/cards/${cardId}/move`, {
        method: 'POST',
        body: { toListId, toIndex },
      });

      // Keep it simple and correct: refresh to match server positions.
      await this.refresh();
      return data.card;
    },
  },
});
