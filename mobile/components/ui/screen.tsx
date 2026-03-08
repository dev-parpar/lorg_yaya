import { SafeAreaView, ScrollView, View, ViewStyle } from "react-native";
import { ReactNode } from "react";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Screen({ children, scroll = true, className = "" }: ScreenProps) {
  const content = (
    <View className={`flex-1 bg-background px-4 pt-4 ${className}`}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
