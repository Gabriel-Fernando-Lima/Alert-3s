export const lightTheme = {
  background: "#0a0a0a",
  card: "#1a1a1a",
  border: "#2a2a2a",
  text: "#ffffff",
  textSecondary: "#888888",
  accent: "#6C63FF",
  danger: "#ff4444",
  success: "#4CAF50",
};

export const highContrastTheme = {
  background: "#000000",
  card: "#111111",
  border: "#ffffff",
  text: "#ffffff",
  textSecondary: "#cccccc",
  accent: "#ffffff",
  danger: "#ff0000",
  success: "#00ff00",
};

export const fontSizes = {
  normal: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 28,
    huge: 48,
  },
  large: {
    xs: 14,
    sm: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 34,
    huge: 56,
  },
};

export type Theme = typeof lightTheme;
export type FontSizes = typeof fontSizes.normal;