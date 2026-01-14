export function boardRoom(boardId) {
    return `board:${boardId}`;
}
export function emitActivity(io, event, payload) {
    io.to(boardRoom(event.boardId)).emit('board:activity_event_created', {
        activityEvent: event,
        payload: payload ?? null,
    });
}
