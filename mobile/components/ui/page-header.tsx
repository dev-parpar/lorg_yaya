import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";
import { Text } from "./text";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onAdd?: () => void;
}

export function PageHeader({ title, subtitle, showBack = false, onAdd }: PageHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between mb-6 pt-2">
      <View className="flex-row items-center gap-3 flex-1">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-muted p-2 mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text variant="h2">{title}</Text>
          {subtitle && <Text variant="caption">{subtitle}</Text>}
        </View>
      </View>
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          className="bg-primary rounded-full p-2.5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
