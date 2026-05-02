import { KeyboardAvoidingView, Platform, ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ReactNode } from "react";
import { COLORS } from "@/lib/theme/tokens";

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
   * Defaults to top + left + right; bottom is excluded so the tab bar
   * (which already respects safe area internally) is not double-padded.
   * Pass all four edges for full-screen modal flows without a tab bar.
   */
  edges?: Edge[];
}

export function Screen({
  children,
  scroll = true,
  style,
  edges = ["top", "left", "right"],
}: ScreenProps) {
  const content = (
    <View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }, style]}>
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
        style={{ flex: 1 }}
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.cork }}
      edges={edges}
    >
      <View style={{ flex: 1, backgroundColor: COLORS.cork }}>
        {body}
      </View>
    </SafeAreaView>
  );
}
