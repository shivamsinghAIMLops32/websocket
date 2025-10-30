import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket: WebSocket) => {
  console.log(`new user has joined`);
  console.log(`active users count now is :${wss.clients.size}`);

  socket.on("message", (message) => {
    console.log(`message received from client is ${message.toString()}`);

    // setTimeout(() => {
    //   socket.send(`server received your message: ${message.toString()}`);
    // }, 2000);
    // broadcast to all other clients and it self
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`broadcast message: ${message.toString()}`);
      }
    });
  });

  socket.on("close", () => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`a user has left. active users count: ${wss.clients.size}`);
      }
    });
  });
});
