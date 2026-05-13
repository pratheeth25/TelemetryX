import DeviceCard from "./DeviceCard";
import useStore from "../store/useStore";

export default function DeviceGrid({ onSelect }) {
  const devices = useStore((s) => s.devices);
  const list = Object.values(devices);

  if (list.length === 0) {
    return <p className="text-gray-500 text-center mt-10">Waiting for devices...</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {list.map((device) => (
        <DeviceCard key={device.deviceId} device={device} onSelect={onSelect} />
      ))}
    </div>
  );
}
