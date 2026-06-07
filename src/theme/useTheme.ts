import { useSettingsStore } from "@/src/store/settingsStore";
import { lightTheme, highContrastTheme, fontSizes } from "./index";

export function useTheme() {
  const { highContrast, largeFonts } = useSettingsStore();

  return {
    colors: highContrast ? highContrastTheme : lightTheme,
    fonts: largeFonts ? fontSizes.large : fontSizes.normal,
    highContrast,
    largeFonts,
  };
}