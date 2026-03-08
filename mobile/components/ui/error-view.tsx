import { View } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Text } from "./text";
import { Button } from "./button";

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = "Something went wrong.", onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <AlertCircle size={40} color="#EF4444" />
      <Text variant="h3" className="mt-4 mb-2 text-center">Error</Text>
      <Text variant="muted" className="text-center mb-6">{message}</Text>
      {onRetry && <Button onPress={onRetry} variant="outline">Try Again</Button>}
    </View>
  );
}
