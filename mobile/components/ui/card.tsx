import { View, ViewStyle, TouchableOpacity } from "react-native";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, className = "", onPress, style }: CardProps) {
  const classes = `bg-card rounded-2xl p-4 shadow-sm border border-border ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} className={classes} style={style} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={classes} style={style}>
      {children}
    </View>
  );
}
