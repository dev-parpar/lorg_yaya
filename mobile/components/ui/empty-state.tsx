import { View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { Text } from "./text";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-6">
      <View className="rounded-full bg-muted p-5 mb-4">
        <Icon size={32} color="#64748B" />
      </View>
      <Text variant="h3" className="text-center mb-2">{title}</Text>
      <Text variant="muted" className="text-center mb-6 max-w-xs">{description}</Text>
      {action}
    </View>
  );
}
