import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// Map of roomId -> set of sockets in that room
const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (socket: WebSocket) => {
  console.log("New client connected");

  // Track the room this socket joined (if any)
  let joinedRoom: string | null = null;

  socket.on("message", (message: WebSocket.Data) => {
    const raw = message.toString();
    console.log("raw message received:\n", raw);

    try {
      const data = JSON.parse(raw) as {
        type?: string;
        payload?: any;
      };

      // Handle join: { type: 'join', payload: { roomId: 'room1' } }
      if (data?.type === "join") {
        const roomId = data.payload && String(data.payload.roomId);
        if (!roomId) {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({
                type: "error",
                payload: { message: "missing roomId in join payload" },
              })
            );
          return;
        }
        if (!rooms.has(roomId)) rooms.set(roomId, new Set<WebSocket>());
        rooms.get(roomId)!.add(socket);
        joinedRoom = roomId;
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: "joined", payload: { roomId } }));
        return;
      }

      // Handle chat: { type: 'chat', payload: { message: 'hi', roomId?: 'room1' } }
      if (data?.type === "chat") {
        const payload = data.payload || {};
        const text = payload.message;
        const roomId = payload.roomId ? String(payload.roomId) : joinedRoom;

        if (!text) {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({
                type: "error",
                payload: { message: "missing message in chat payload" },
              })
            );
          return;
        }
        if (!roomId) {
          if (socket.readyState === WebSocket.OPEN)
            socket.send(
              JSON.stringify({
                type: "error",
                payload: { message: "no room specified or joined" },
              })
            );
          return;
        }

        const set = rooms.get(roomId);
        if (!set) return; // no recipients

        // Broadcast to other clients in the room
        set.forEach((s) => {
          if (s !== socket && s.readyState === WebSocket.OPEN) {
            s.send(
              JSON.stringify({
                type: "chat",
                payload: { message: text, fromRoom: roomId },
              })
            );
          }
        });
        return;
      }
    } catch (err) {
      console.warn("Failed to parse message:", err);
      if (socket.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({
            type: "error",
            payload: { message: "invalid JSON" },
          })
        );
    }
  });

  socket.on("close", () => {
    // If socket joined a room, remove from it
    if (joinedRoom) {
      const set = rooms.get(joinedRoom);
      if (set) {
        set.delete(socket);
        if (set.size === 0) rooms.delete(joinedRoom);
      }
      joinedRoom = null;
      return;
    }

    // Fallback: remove from any room where it's present
    for (const [roomId, set] of rooms) {
      if (set.has(socket)) {
        set.delete(socket);
        if (set.size === 0) rooms.delete(roomId);
      }
    }
  });
});
