export { RoomDO } from "./room";

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function randId(len = 12) {
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

const DEV_ALLOWED_ORIGINS = new Set([
	"http://localhost:5173",
	"http://127.0.0.1:5173",
]);

function withCors(request: Request, res: Response) {
	const origin = request.headers.get("Origin") ?? "";
	const allowOrigin = DEV_ALLOWED_ORIGINS.has(origin) ? origin : "*";

	const headers = new Headers(res.headers);
	headers.set("Access-Control-Allow-Origin", allowOrigin);
	headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Content-Type");
	headers.set("Access-Control-Max-Age", "86400");

	return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "OPTIONS") {
			return withCors(request, new Response(null, { status: 204 }));
		}

		// ✅ ルーム作成（招待URL生成の材料）
		if (url.pathname === "/api/rooms" && request.method === "POST") {
			const roomId = randId(12);
			const hostToken = randId(24);
			const expiresAt = Date.now() + 12 * 60 * 60 * 1000;

			const id = env.ROOMS.idFromName(roomId);
			const stub = env.ROOMS.get(id);

			await stub.fetch("https://do/init", {
				method: "POST",
				body: JSON.stringify({ roomId, hostToken, expiresAt }),
			});

			return withCors(request, json({ roomId, hostToken, expiresAt }));
		}

		// ✅ WebSocket: /api/rooms/{roomId}/ws を RoomDO に転送
		const m = url.pathname.match(/^\/api\/rooms\/([a-z0-9]+)\/ws$/);
		if (m) {
			const roomId = m[1];
			const id = env.ROOMS.idFromName(roomId);
			const stub = env.ROOMS.get(id);
			return stub.fetch(request);
		}

		// 動作確認用
		if (url.pathname === "/") {
			return new Response("Hello, world!");
		}

		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;