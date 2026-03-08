import { TextInput, TextInputProps, View } from "react-native";
import { Text } from "./text";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <View className="gap-1">
      {label && <Text variant="caption" className="font-medium text-foreground mb-1">{label}</Text>}
      <TextInput
        className={`border border-border rounded-xl px-4 py-3 text-sm text-foreground bg-card ${error ? "border-destructive" : ""} ${className}`}
        placeholderTextColor="#94A3B8"
        {...props}
      />
      {error && <Text variant="caption" className="text-destructive mt-1">{error}</Text>}
    </View>
  );
}
