const { verifyAccessToken } = require("../services/authService");

function initSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("joinHouse", (token) => {
      try {
        const payload = verifyAccessToken(token);
        const houseId = payload.houseId;
        socket.join(houseId);
        socket.data.houseId = houseId;
        socket.data.role    = payload.role;
        socket.emit("joinedHouse", { houseId });
        console.log(`Socket ${socket.id} joined house ${houseId}`);
      } catch {
        socket.emit("authError", { error: "Invalid token" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };

