import { TouchableOpacity, ActivityIndicator, ViewStyle } from "react-native";
import { Text } from "./text";
import { ReactNode } from "react";

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

const variantStyles = {
  primary: "bg-primary rounded-xl py-3 px-5 items-center",
  outline: "border border-border rounded-xl py-3 px-5 items-center bg-card",
  ghost: "rounded-xl py-2 px-3 items-center",
  destructive: "bg-destructive rounded-xl py-3 px-5 items-center",
};

const textStyles = {
  primary: "text-white font-semibold text-sm",
  outline: "text-foreground font-semibold text-sm",
  ghost: "text-primary font-medium text-sm",
  destructive: "text-white font-semibold text-sm",
};

export function Button({
  onPress,
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${variantStyles[variant]} ${disabled || loading ? "opacity-50" : ""} ${className}`}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? "#2563EB" : "#fff"} size="small" />
      ) : (
        <Text className={textStyles[variant]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}
