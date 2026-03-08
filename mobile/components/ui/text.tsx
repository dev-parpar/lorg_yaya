import { Text as RNText, TextProps } from "react-native";

interface StyledTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body" | "caption" | "muted";
}

const variantClasses: Record<NonNullable<StyledTextProps["variant"]>, string> = {
  h1: "text-2xl font-bold text-foreground",
  h2: "text-xl font-semibold text-foreground",
  h3: "text-base font-semibold text-foreground",
  body: "text-sm text-foreground",
  caption: "text-xs text-muted-foreground",
  muted: "text-sm text-muted-foreground",
};

export function Text({ variant = "body", className = "", ...props }: StyledTextProps) {
  return (
    <RNText
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
