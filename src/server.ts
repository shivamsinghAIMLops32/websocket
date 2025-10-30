import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// Map of roomId -> set of sockets in that room
const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (socket: WebSocket) => {
  console.log("New client connected");

  // Track the room this socket joined (if any)
  let joinedRoom: string | null = null;

  socket.on("message", (message: WebSocket.Data) => {
    try {
      const data = JSON.parse(message.toString());

      // Join a room
      if (data?.type === "join" && data?.payload?.roomId) {
        const roomId = String(data.payload.roomId);
        if (!rooms.has(roomId)) rooms.set(roomId, new Set<WebSocket>());
        rooms.get(roomId)!.add(socket);
        joinedRoom = roomId;
        // Acknowledge join
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "joined", payload: { roomId } }));
        }
        return;
      }

      // Broadcast a message to the room (only when joined)
      if (data?.type === "message" && joinedRoom) { 
        const payload = data.payload;
        const set = rooms.get(joinedRoom);
        if (set) {
          set.forEach((s) => {
            if (s !== socket && s.readyState === WebSocket.OPEN) {
              s.send(JSON.stringify({ type: "message", payload }));
            }
          });
        }
        return;
      }
    } catch (err) {
      // Ignore malformed messages but log for debugging
      console.warn("Failed to parse message:", err);
    }
  });

  socket.on("close", () => {
    if (joinedRoom) {
      const set = rooms.get(joinedRoom);
      if (set) {
        set.delete(socket);
        if (set.size === 0) rooms.delete(joinedRoom);
      }
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
