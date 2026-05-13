import { useEffect, useRef, useState } from "react";
import { deviceApi } from "../services/api";

const DEVICE_ICONS = {
  smart_speaker:      "🔊",
  smart_lights:       "💡",
  smart_camera:       "📷",
  smart_door_lock:    "🔒",
  smart_tv:           "📺",
  robot_vacuum:       "🤖",
  smart_doorbell:     "🔔",
  smart_refrigerator: "🧊",
  sensor_motion:      "👁️",
  sensor_smoke:       "🚨",
  sensor_water:       "💧",
  sensor_air:         "🌬️",
};

const SPACE_COLOR = {
  house:    "#22c55e",   // green
  office:   "#3b82f6",   // blue
  building: "#a855f7",   // purple
};

function edgeColor(weight) {
  if (weight >= 75) return "#22c55e";   // strong — green
  if (weight >= 50) return "#eab308";   // medium — yellow
  if (weight >= 25) return "#f97316";   // weak — orange
  return "#ef4444";                      // very weak — red
}

function circleLayout(n, cx, cy, r) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default function DeviceConnectionGraph() {
  const [graph,   setGraph]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [hovered, setHovered] = useState(null);   // deviceId
  const [tooltip, setTooltip] = useState(null);   // { x, y, edge }
  const svgRef = useRef(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await deviceApi.getGraph();
      setGraph(data);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Building connection graph…</p>
    </div>
  );
  if (error) return (
    <div className="text-red-400 text-sm text-center p-6">Error: {error}</div>
  );
  if (!graph || graph.nodes.length === 0) return (
    <div className="text-gray-500 text-sm text-center p-6">No devices to display.</div>
  );

  const W = 780;
  const H = 520;
  const CX = W / 2;
  const CY = H / 2;
  const R  = Math.min(CX, CY) - 80;

  const positions = circleLayout(graph.nodes.length, CX, CY, R);
  const posMap = {};
  graph.nodes.forEach((n, i) => { posMap[n.id] = positions[i]; });

  const MAX_EDGES = Math.min(graph.edges.length, graph.nodes.length * 3);
  const sortedEdges = [...graph.edges].sort((a, b) => b.weight - a.weight).slice(0, MAX_EDGES);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-gray-700 text-xs text-gray-400">
        <span className="font-semibold text-white text-sm">Device Connection Graph</span>
        <div className="flex gap-3 ml-auto">
          {[["≥75 Strong","#22c55e"],["≥50 Medium","#eab308"],["≥25 Weak","#f97316"],["<25 Poor","#ef4444"]].map(([l,c]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
          <span className="flex items-center gap-1 ml-3">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />House
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />Office
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500" />Building
          </span>
        </div>
        <button onClick={load} className="text-gray-500 hover:text-white ml-2" title="Refresh">⟳</button>
      </div>

      {/* SVG */}
      <div className="relative overflow-x-auto">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 520, maxHeight: 560 }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {sortedEdges.map((edge, i) => {
            const src = posMap[edge.source];
            const tgt = posMap[edge.target];
            if (!src || !tgt) return null;
            const isHighlighted = hovered === edge.source || hovered === edge.target;
            const stroke = edgeColor(edge.weight);
            const strokeWidth = isHighlighted ? 2.5 : Math.max(0.5, edge.weight / 40);
            const opacity = isHighlighted ? 1 : (hovered ? 0.15 : 0.55);

            return (
              <g key={i}
                onMouseEnter={(e) => {
                  const rect = svgRef.current.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    edge,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: "pointer" }}>
                {/* Invisible wider hit area */}
                <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke="transparent" strokeWidth={12} />
                <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  filter={isHighlighted ? "url(#glow)" : undefined}
                />
                {/* Weight label on highlighted edges */}
                {isHighlighted && (
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill={stroke}
                    fontWeight="600">
                    {edge.weight}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = posMap[node.id];
            if (!pos) return null;
            const isHov = hovered === node.id;
            const isConnected = sortedEdges.some(
              (e) => (e.source === node.id || e.target === node.id) &&
                     (hovered === e.source || hovered === e.target)
            );
            const dim = hovered && !isHov && !isConnected;
            const ringColor = SPACE_COLOR[node.locationType] || "#6b7280";

            return (
              <g key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}>
                {/* Outer ring = space type colour */}
                <circle r={isHov ? 26 : 22}
                  fill={ringColor}
                  fillOpacity={dim ? 0.08 : 0.15}
                  stroke={ringColor}
                  strokeWidth={isHov ? 2.5 : 1.5}
                  strokeOpacity={dim ? 0.2 : 0.9}
                  filter={isHov ? "url(#glow)" : undefined}
                />
                {/* Inner fill */}
                <circle r={isHov ? 20 : 17}
                  fill="#1f2937"
                  fillOpacity={dim ? 0.4 : 1}
                />
                {/* Status dot */}
                <circle cx={14} cy={-14} r={4}
                  fill={node.status === "online" ? "#22c55e" : "#6b7280"}
                  stroke="#111827" strokeWidth={1}
                  opacity={dim ? 0.3 : 1}
                />
                {/* Emoji icon */}
                <text textAnchor="middle" dominantBaseline="central"
                  fontSize={isHov ? 18 : 15}
                  opacity={dim ? 0.25 : 1}>
                  {DEVICE_ICONS[node.type] || "📡"}
                </text>
                {/* Name label */}
                <text y={isHov ? 35 : 30}
                  textAnchor="middle"
                  fontSize={isHov ? 11 : 9.5}
                  fill={dim ? "#4b5563" : "#e5e7eb"}
                  fontWeight={isHov ? "600" : "400"}>
                  {node.name.length > 16 ? node.name.slice(0, 15) + "…" : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (() => {
          const src = graph.nodes.find((n) => n.id === tooltip.edge.source);
          const tgt = graph.nodes.find((n) => n.id === tooltip.edge.target);
          return (
            <div
              className="absolute pointer-events-none bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs shadow-xl z-10"
              style={{ left: tooltip.x + 12, top: tooltip.y - 8, minWidth: 180 }}>
              <p className="text-white font-semibold mb-1">Connection Weight: {tooltip.edge.weight}%</p>
              <p className="text-gray-400">{src?.name} ↔ {tgt?.name}</p>
              <p className="text-gray-500 mt-0.5">
                {tooltip.edge.sameLocation ? "Same space type" : "Different spaces"}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${tooltip.edge.weight}%`,
                  backgroundColor: edgeColor(tooltip.edge.weight),
                }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Device summary panel */}
      <div className="px-5 py-3 border-t border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: "Total Devices", value: graph.nodes.length },
          { label: "Online", value: graph.nodes.filter((n) => n.status === "online").length },
          { label: "Connections Shown", value: sortedEdges.length },
          { label: "Avg Connectivity", value: sortedEdges.length
              ? `${Math.round(sortedEdges.reduce((s, e) => s + e.weight, 0) / sortedEdges.length)}%`
              : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-2.5 text-center">
            <p className="text-gray-400">{label}</p>
            <p className="text-white font-bold text-base mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
