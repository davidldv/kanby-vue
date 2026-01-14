import { defineStore } from 'pinia';
import type { BoardDto } from '@kanby/shared';
import { apiFetch } from 'src/lib/api';
import { errorMessage } from 'src/lib/errors';

export const useBoardsStore = defineStore('boards', {
  state: () => ({
    boards: [] as BoardDto[],
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetchBoards() {
      this.loading = true;
      this.error = null;
      try {
        const boards = await apiFetch<BoardDto[]>('/boards');
        this.boards = boards;
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to load boards');
      } finally {
        this.loading = false;
      }
    },

    async createBoard(title: string): Promise<BoardDto | null> {
      this.error = null;
      try {
        const data = await apiFetch<{ board: BoardDto; activityEvent: unknown }>(`/boards`, {
          method: 'POST',
          body: { title },
        });
        this.boards = [data.board, ...this.boards];
        return data.board;
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to create board');
        return null;
      }
    },
  },
});
