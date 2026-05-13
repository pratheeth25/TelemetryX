const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");
require("dotenv").config();

const deviceRoutes    = require("./src/routes/deviceRoutes");
const alertRoutes     = require("./src/routes/alertRoutes");
const telemetryRoutes = require("./src/routes/telemetryRoutes");
const authRoutes      = require("./src/routes/authRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const houseRoutes     = require("./src/routes/houseRoutes");
const errorHandler       = require("./src/middleware/errorHandler");
const { initSocket }     = require("./src/socket/socketHandler");
const { startSimulator } = require("./src/simulator/deviceSimulator");
const { seedHouses }     = require("./src/seeder/seedHouses");

const app    = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : [/^http:\/\/localhost:\d+$/];

const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
});
app.set("io", io);

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth",      authRoutes);
app.use("/api/devices",   deviceRoutes);
app.use("/api/alerts",    alertRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/house",     houseRoutes);

app.get("/", (_req, res) => res.json({ message: "TelemetryX API running" }));

app.use(errorHandler);

const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/telemetryx";

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await seedHouses(); // ensure H001-H100 exist
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      initSocket(io);
      startSimulator(io);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
