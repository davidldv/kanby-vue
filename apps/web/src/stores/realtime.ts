import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import type { ActivityEventDto } from '@kanby/shared';
import { getUserId } from 'src/lib/user';

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  const cleaned = (url && url.trim().length ? url.trim() : undefined)?.replace(/\/$/, '');
  if (cleaned) return cleaned;

  // In production deployments, use same-origin and rely on Vercel rewrites for /socket.io.
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:4000';
}

export const useRealtimeStore = defineStore('realtime', {
  state: () => ({
    socket: null as Socket | null,
    connected: false,
    currentBoardId: null as string | null,
    refreshTimer: null as number | null,
  }),
  actions: {
    connect() {
      if (this.socket) return;

      const socket = io(apiBaseUrl(), {
        transports: ['websocket', 'polling'],
        auth: { userId: getUserId() },
      });

      socket.on('connect', () => {
        this.connected = true;
        if (this.currentBoardId) socket.emit('board:join', { boardId: this.currentBoardId });
      });

      socket.on('disconnect', () => {
        this.connected = false;
      });

      socket.on(
        'board:activity_event_created',
        (msg: { activityEvent: ActivityEventDto; payload: unknown }) => {
          // Lazy-import stores to avoid circular deps.
          void Promise.all([import('./activity'), import('./board')]).then(([a, b]) => {
            const activity = a.useActivityStore();
            const board = b.useBoardStore();

            if (activity.boardId === msg.activityEvent.boardId) {
              activity.prepend(msg.activityEvent);
            }
            if (board.boardId === msg.activityEvent.boardId) {
              // Avoid a "reload" feel during drag/drop:
              // - skip refresh for your own events (local UI already updated)
              // - debounce refresh to coalesce bursts of activity
              if (msg.activityEvent.actorUserId === getUserId()) return;
              if (this.refreshTimer != null) return;
              this.refreshTimer = window.setTimeout(() => {
                this.refreshTimer = null;
                void board.refresh();
              }, 250);
            }
          });
        },
      );

      socket.on('board:activity_cleared', (msg: { boardId: string }) => {
        void import('./activity').then((a) => {
          const activity = a.useActivityStore();
          if (activity.boardId === msg.boardId) {
            activity.events = [];
            activity.nextCursor = null;
          }
        });
      });

      this.socket = socket;
    },

    disconnect() {
      if (!this.socket) return;
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentBoardId = null;
      if (this.refreshTimer != null) {
        window.clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    },

    joinBoard(boardId: string) {
      this.connect();
      this.currentBoardId = boardId;
      this.socket?.emit('board:join', { boardId });
    },

    leaveBoard(boardId: string) {
      if (this.currentBoardId === boardId) {
        this.socket?.emit('board:leave', { boardId });
        this.currentBoardId = null;
      }
    },
  },
});
