
import { create } from "zustand";
const useBuildingStore = create(() => ({
  selectedBuilding: null,
  myBuildings: [],
  setSelectedBuilding: () => {},
  setMyBuildings: () => {},
  clearBuilding: () => {},
}));
export default useBuildingStore;
