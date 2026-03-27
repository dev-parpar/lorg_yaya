import { KeyboardAvoidingView, Platform, ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ReactNode } from "react";

interface ScreenProps {
  children: ReactNode;
  /**
   * When true (default) the content is wrapped in a ScrollView that
   * automatically adjusts for the keyboard via KeyboardAvoidingView.
   */
  scroll?: boolean;
  className?: string;
  style?: ViewStyle;
  /**
   * Which edges should be padded for safe area.
   * Defaults to top + left + right; bottom is intentionally excluded so
   * the tab bar (which already respects safe area internally) is not
   * double-padded. Pass `["top","left","right","bottom"]` for full-screen
   * modal flows that have no tab bar.
   */
  edges?: Edge[];
}

export function Screen({
  children,
  scroll = true,
  className = "",
  style,
  edges = ["top", "left", "right"],
}: ScreenProps) {
  const content = (
    <View className={`flex-1 bg-background px-4 pt-4 ${className}`} style={style}>
      {children}
    </View>
  );

  const body = scroll ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      {body}
    </SafeAreaView>
  );
}
