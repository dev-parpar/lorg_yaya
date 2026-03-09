import { View } from "react-native";
import { router } from "expo-router";
import { Mail } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

export default function VerifyEmailScreen() {
  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center items-center px-4">
        <View className="rounded-full bg-primary/10 p-6 mb-6">
          <Mail size={48} color="#2563EB" />
        </View>

        <Text variant="h2" className="text-center mb-3">
          Check your email
        </Text>

        <Text variant="muted" className="text-center mb-2 leading-6">
          We sent a confirmation link to your email address.
        </Text>

        <Text variant="muted" className="text-center mb-10 leading-6">
          Click the link in the email to activate your account, then come back here to sign in.
        </Text>

        <Button
          onPress={() => router.replace("/(auth)/login")}
          className="w-full"
        >
          Go to sign in
        </Button>
      </View>
    </Screen>
  );
}
