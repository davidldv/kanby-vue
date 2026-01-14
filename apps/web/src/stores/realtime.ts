import { defineStore } from 'pinia';
import { io, type Socket } from 'socket.io-client';
import type { ActivityEventDto } from '@kanby/shared';
import { getUserId } from 'src/lib/user';

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  return (url && url.trim().length ? url : 'http://localhost:4000').replace(/\/$/, '');
}

export const useRealtimeStore = defineStore('realtime', {
  state: () => ({
    socket: null as Socket | null,
    connected: false,
    currentBoardId: null as string | null,
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
              // Keep it simple and correct: refresh.
              void board.refresh();
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
