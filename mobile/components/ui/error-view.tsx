import { View, StyleSheet } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { Text } from "./text";
import { Button } from "./button";
import { COLORS } from "@/lib/theme/tokens";

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = "Something went wrong.", onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={40} color={COLORS.destructive} />
      <Text variant="h3" style={styles.title}>Something went wrong</Text>
      <Text variant="muted" style={styles.message}>{message}</Text>
      {onRetry && <Button onPress={onRetry} variant="outline">Try Again</Button>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
    color: COLORS.card,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
    color: COLORS.mutedSurface,
  },
});
