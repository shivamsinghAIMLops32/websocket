import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (socket:WebSocket) => {
  console.log(`new user has joined`);

  socket.on("message", (message) => {
    console.log(`message received from client is ${message.toString()}`);

    // setTimeout(() => {
    //   socket.send(`server received your message: ${message.toString()}`);
    // }, 2000);

    wss.clients.forEach((client) => {
      if (client !== socket && client.readyState === WebSocket.OPEN) {
        client.send(`broadcast message: ${message.toString()}`);
      }
    });
  });
});
