import { Server } from "socket.io";
import jwt from "jsonwebtoken";


export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

io.on("connection", (socket) => {
  const { roomId, role } = socket.user;
  socket.join(roomId);

  socket.to(roomId).emit("user-joined", { role, socketId: socket.id });

  const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  if (clients.length > 1) {
    socket.emit("user-joined", { role: "Peer", socketId: clients.find(id => id !== socket.id) });
  }

  socket.on("signal", ({ data, to }) => {
  if (to) {
    // send directly to the target socket
    io.to(to).emit("signal", { from: socket.user.role, data });
  } else {
    // broadcast to everyone else in room
    socket.to(roomId).emit("signal", { from: socket.user.role, data });
  }
});

});



  console.log("✅ Socket server ready");
  return io;
};
