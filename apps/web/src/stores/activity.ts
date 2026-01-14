import { defineStore } from 'pinia';
import type { ActivityEventDto } from '@kanby/shared';
import { apiFetch } from 'src/lib/api';
import { errorMessage } from 'src/lib/errors';

export const useActivityStore = defineStore('activity', {
  state: () => ({
    boardId: null as string | null,
    events: [] as ActivityEventDto[],
    nextCursor: null as string | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    clearLocal() {
      this.boardId = null;
      this.events = [];
      this.nextCursor = null;
      this.loading = false;
      this.error = null;
    },

    prepend(event: ActivityEventDto) {
      if (this.events.find((e) => e.id === event.id)) return;
      this.events = [event, ...this.events];
    },

    async loadRecent(boardId: string) {
      this.loading = true;
      this.error = null;
      this.boardId = boardId;

      try {
        const data = await apiFetch<{ events: ActivityEventDto[]; nextCursor: string | null }>(
          `/boards/${boardId}/activity?limit=50`,
        );
        this.events = data.events;
        this.nextCursor = data.nextCursor;
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to load activity');
      } finally {
        this.loading = false;
      }
    },

    async loadMore() {
      if (!this.boardId || !this.nextCursor) return;
      this.loading = true;
      this.error = null;

      try {
        const data = await apiFetch<{ events: ActivityEventDto[]; nextCursor: string | null }>(
          `/boards/${this.boardId}/activity?limit=50&cursor=${encodeURIComponent(this.nextCursor)}`,
        );
        const existingIds = new Set(this.events.map((e) => e.id));
        this.events = [...this.events, ...data.events.filter((e) => !existingIds.has(e.id))];
        this.nextCursor = data.nextCursor;
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to load more activity');
      } finally {
        this.loading = false;
      }
    },

    async undo(eventId: string) {
      const data = await apiFetch<{ activityEvent: ActivityEventDto }>(
        `/activity/${eventId}/undo`,
        {
          method: 'POST',
        },
      );
      this.prepend(data.activityEvent);
      const idx = this.events.findIndex((e) => e.id === eventId);
      if (idx >= 0) {
        const prev = this.events[idx];
        if (prev) this.events[idx] = { ...prev, undoneAt: new Date().toISOString() };
      }
      return data.activityEvent;
    },

    async clearServer(boardId: string) {
      // Optimistically clear local state so the UI responds immediately.
      if (this.boardId === boardId) {
        this.events = [];
        this.nextCursor = null;
        this.error = null;
      }

      this.loading = true;
      try {
        await apiFetch<{ cleared: true }>(`/boards/${boardId}/activity/clear`, { method: 'POST' });
      } catch (e: unknown) {
        this.error = errorMessage(e, 'Failed to clear activity');
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
