import { useState, useCallback } from "react";
import { Alert, ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/auth/supabase";
import { API_BASE_URL } from "@/lib/constants";
import type { DetectedItem, ItemType } from "@/types";
import { ALL_ITEM_TYPES } from "@/types";

interface RawIdentifiedItem {
  name: string;
  type: string;
  confidence: number;
  isDuplicate: boolean;
  existingItemId: string | null;
  existingQty: number | null;
}

let _keyCounter = 0;
function nextKey(): string {
  return `di-${++_keyCounter}`;
}

/**
 * Handles the full "add via photo" flow:
 *   source picker → image picker → backend vision call → DetectedItem[]
 *
 * The caller is responsible for rendering the review screen with the
 * returned items.
 */
export function useItemIdentifier() {
  const [isIdentifying, setIsIdentifying] = useState(false);

  /**
   * Pick an image from camera or library, send it to the backend for
   * identification, and call onResult with the list of detected items.
   * Shows its own source-picker action sheet first.
   */
  const showSourcePicker = useCallback(
    (cabinetId: string, onResult: (items: DetectedItem[]) => void) => {
      async function pickAndIdentify(source: "camera" | "library") {
        let pickerResult: ImagePicker.ImagePickerResult | null = null;

        if (source === "camera") {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission needed",
              "Please allow camera access in your device Settings.",
            );
            return;
          }
          try {
            pickerResult = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              quality: 0.75,
              allowsEditing: false,
              base64: true,
            });
          } catch {
            Alert.alert(
              "Camera unavailable",
              "The camera is not available on this device. Please choose a photo from your library instead.",
            );
            return;
          }
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission needed",
              "Please allow photo library access in your device Settings.",
            );
            return;
          }
          pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.75,
            allowsEditing: false,
            base64: true,
          });
        }

        if (!pickerResult || pickerResult.canceled || !pickerResult.assets[0]) return;

        const asset = pickerResult.assets[0];
        if (!asset.base64) {
          Alert.alert("Error", "Could not read image data. Please try again.");
          return;
        }

        setIsIdentifying(true);
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;

          const response = await fetch(`${API_BASE_URL}/api/ai/identify-items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              imageBase64: asset.base64,
              mediaType: "image/jpeg",
              cabinetId,
            }),
          });

          if (!response.ok) {
            const err = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(
              err?.error ?? `Identification failed (status ${response.status})`,
            );
          }

          const json = (await response.json()) as { data: RawIdentifiedItem[] };

          if (json.data.length === 0) {
            Alert.alert(
              "No items detected",
              "Lorgy couldn't identify any items in that photo. Try a clearer shot or type items manually.",
            );
            return;
          }

          const items: DetectedItem[] = json.data.map((d) => ({
            _key: nextKey(),
            name: d.name,
            type: (ALL_ITEM_TYPES.includes(d.type as ItemType)
              ? d.type
              : "OTHER") as ItemType,
            confidence: d.confidence,
            quantity: 1,
            isDuplicate: d.isDuplicate,
            existingItemId: d.existingItemId,
            existingQty: d.existingQty,
            skipped: false,
            incrementInstead: d.isDuplicate,
          }));

          onResult(items);
        } catch (e) {
          Alert.alert(
            "Scan failed",
            (e as Error).message ?? "Unable to identify items. Please try again.",
          );
        } finally {
          setIsIdentifying(false);
        }
      }

      const options = ["Scan with camera", "Choose from library", "Cancel"];

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 2 },
          (index) => {
            if (index === 0) void pickAndIdentify("camera");
            else if (index === 1) void pickAndIdentify("library");
          },
        );
      } else {
        Alert.alert("Add via photo", undefined, [
          { text: "Scan with camera", onPress: () => void pickAndIdentify("camera") },
          { text: "Choose from library", onPress: () => void pickAndIdentify("library") },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    },
    [],
  );

  return { isIdentifying, showSourcePicker };
}
