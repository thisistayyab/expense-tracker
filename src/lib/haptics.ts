import * as Haptics from "expo-haptics";

/**
 * Every haptic in the app goes through this wrapper (04 haptics map), so a future
 * "disable haptics" setting only has to change one file. Haptics are a nicety:
 * a device without a taptic engine must never surface an error.
 */
export const haptics = {
  selection: () => {
    void Haptics.selectionAsync().catch(() => {});
  },
};
