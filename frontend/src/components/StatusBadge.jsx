
export default function StatusBadge({ status }) {
  const online = status === "online";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
        online ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${online ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
