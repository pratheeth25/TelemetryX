import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { useDevices } from '../hooks/useDevices'
import { useTelemetry } from '../hooks/useTelemetry'

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="text-gray-400">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(2)}{p.dataKey === 'temp' ? '°C' : '%'}
        </p>
      ))}
    </div>
  )
}

// ── Range picker ──────────────────────────────────────────────────────────────

function RangePicker({ range, setRange, ranges }) {
  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            range === r
              ? 'bg-sky-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TemperatureChart() {
  const { devices, selectedDevice, setSelectedDeviceId } = useDevices()
  const deviceId = selectedDevice?.deviceId

  const { history, range, setRange, loading, error, VALID_RANGES } = useTelemetry(deviceId, '1h')

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-white font-semibold">Temperature &amp; Battery Trend</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {loading
              ? 'Loading…'
              : `${history.length} bucket${history.length !== 1 ? 's' : ''}`}
            {selectedDevice && ` · ${selectedDevice.name || selectedDevice.deviceId}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <RangePicker range={range} setRange={setRange} ranges={VALID_RANGES} />
          <select
            value={deviceId || ''}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.name || d.deviceId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      {error ? (
        <div className="h-44 flex flex-col items-center justify-center text-red-400 gap-2 text-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          <p>{error.message}</p>
        </div>
      ) : loading && history.length === 0 ? (
        <div className="h-44 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : history.length < 2 ? (
        <div className="h-44 flex flex-col items-center justify-center text-gray-600 gap-2">
          <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm">Waiting for readings…</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#4b5563', fontSize: 9 }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            {/* Left Y axis – temperature */}
            <YAxis
              yAxisId="temp"
              tick={{ fill: '#4b5563', fontSize: 9 }}
              domain={['auto', 'auto']}
              unit="°"
              tickLine={false}
              axisLine={false}
            />
            {/* Right Y axis – battery */}
            <YAxis
              yAxisId="bat"
              orientation="right"
              tick={{ fill: '#4b5563', fontSize: 9 }}
              domain={[0, 100]}
              unit="%"
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, color: '#6b7280', paddingTop: 6 }}
              formatter={(v) => v === 'temp' ? 'Temp (°C)' : 'Battery (%)'}
            />
            {/* Threshold reference lines */}
            <ReferenceLine yAxisId="temp" y={80} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1}
              label={{ value: 'HIGH', fill: '#f59e0b', fontSize: 8, position: 'insideTopLeft' }} />
            <ReferenceLine yAxisId="temp" y={95} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1}
              label={{ value: 'CRIT', fill: '#ef4444', fontSize: 8, position: 'insideTopLeft' }} />
            <Line
              yAxisId="temp"
              type="monotoneX"
              dataKey="temp"
              name="temp"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 4, fill: '#38bdf8', stroke: '#0c4a6e', strokeWidth: 2 }}
            />
            <Line
              yAxisId="bat"
              type="monotoneX"
              dataKey="battery"
              name="battery"
              stroke="#34d399"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              strokeDasharray="4 2"
              activeDot={{ r: 3, fill: '#34d399' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
