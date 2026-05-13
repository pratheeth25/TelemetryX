import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import useStore from "../store/useStore";
import useAuthStore from "../store/useAuthStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function useSocket() {
  const socketRef  = useRef(null);
  const { updateDevice, appendHistory, addAlerts, setDeviceEnabled, addDevice, removeDevice } = useStore();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("joinHouse", accessToken);
    });

    socket.on("joinedHouse", ({ houseId }) => {
      console.log("Joined house room:", houseId);
    });

    socket.on("telemetry", (data) => {
      updateDevice(data);
      appendHistory(data.deviceId, {
        temperature:    data.temperature,
        battery:        data.battery,
        signalStrength: data.signalStrength,
        latency:        data.latency,
        packetLoss:     data.packetLoss,
        timestamp:      data.timestamp,
      });
    });

    socket.on("newAlert", (alerts) => {
      addAlerts(alerts);
    });

    socket.on("deviceToggled", ({ deviceId, enabled, status, lastHeartbeat }) => {
      setDeviceEnabled(deviceId, enabled, status);
    });

    socket.on("deviceAdded", (device) => {
      addDevice(device);
    });

    socket.on("deviceRemoved", ({ deviceId }) => {
      removeDevice(deviceId);
    });

    socket.on("disconnect", () => console.log("Socket disconnected"));

    return () => socket.disconnect();
  }, [accessToken]);
}

