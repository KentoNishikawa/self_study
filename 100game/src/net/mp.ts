import type { GameState, PlayLog } from "../core/types";

export type MpSession = {
    roomId: string;
    seatIndex: number; // サーバ上の席(0..3)
    isHost: boolean;
    ws: WebSocket;
};

export function rotateToView(server: GameState, seatIndex: number): GameState {
    const mapIndex = (i: number) => (i - seatIndex + 4) % 4;
    const unmapIndex = (i: number) => (i + seatIndex) % 4;

    const seats = [
        server.seats[unmapIndex(0)],
        server.seats[unmapIndex(1)],
        server.seats[unmapIndex(2)],
        server.seats[unmapIndex(3)],
    ] as any;

    const history = server.history.map((h) => ({ ...h, seat: mapIndex(h.seat) })) as PlayLog[];

    const result =
        server.result.status === "LOSE"
            ? { ...server.result, loserSeat: mapIndex(server.result.loserSeat) }
            : server.result;

    return {
        ...server,
        seats,
        turn: mapIndex(server.turn),
        history,
        result,
    };
}

export function attachMpWs(
    session: MpSession,
    onGameState: (serverState: GameState) => void,
    onDisbanded: () => void,
    onClosed: () => void
) {
    session.ws.onmessage = (ev) => {
        let raw: any;
        try { raw = JSON.parse(String(ev.data)); } catch { return; }

        if (raw?.type === "ROOM_DISBANDED") {
            onDisbanded();
            return;
        }
        if (raw?.type === "GAME_STATE" && raw.state) {
            onGameState(raw.state as GameState);
            return;
        }
    };

    session.ws.onclose = () => onClosed();
}

export function sendPlayHand(session: MpSession, handIndex: number, jokerValue?: number) {
    session.ws.send(JSON.stringify({ type: "PLAY_HAND", handIndex, jokerValue }));
}

export function sendDrawPlay(session: MpSession, jokerValue?: number) {
    session.ws.send(JSON.stringify({ type: "DRAW_PLAY", jokerValue }));
}

export function sendLeaveOrDisband(session: MpSession) {
    session.ws.send(JSON.stringify({ type: session.isHost ? "HOST_DISBAND" : "LEAVE" }));
}