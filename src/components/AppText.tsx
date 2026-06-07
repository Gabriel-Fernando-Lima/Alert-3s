import { Text, TextProps } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "huge";

type Props = TextProps & {
  size?: Size;
  color?: "text" | "textSecondary" | "accent" | "danger" | "success";
  bold?: boolean;
};

export function AppText({ size = "md", color = "text", bold, style, ...props }: Props) {
  const { colors, fonts } = useTheme();

  return (
    <Text
      style={[
        {
          fontSize: fonts[size],
          color: colors[color],
          fontWeight: bold ? "bold" : "normal",
        },
        style,
      ]}
      {...props}
    />
  );
}