import { useState, useCallback } from "react";
import { Alert, ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/auth/supabase";
import { API_BASE_URL } from "@/lib/constants";
import type { DetectedItem, ItemType } from "@/types";
import { ALL_ITEM_TYPES } from "@/types";

/**
 * Max dimension (width or height) we send to the vision API.
 * Claude reads 1024px images accurately; beyond that we're just burning tokens.
 * At 0.65 JPEG quality this keeps payloads under ~150 KB for typical photos.
 */
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_QUALITY = 0.65;

/**
 * Resize + re-compress an image URI to stay within MAX_IMAGE_DIMENSION on its
 * longest side at IMAGE_QUALITY. Always outputs JPEG for consistency.
 * Returns { base64, mediaType }.
 */
async function prepareImage(
  uri: string,
  width: number,
  height: number,
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const longest = Math.max(width, height);
  const actions: ImageManipulator.Action[] = [];

  if (longest > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / longest;
    actions.push({
      resize: {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      },
    });
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: IMAGE_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) throw new Error("Failed to process image.");
  return { base64: result.base64, mediaType: "image/jpeg" };
}

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
              quality: 1,       // full quality — manipulator handles compression
              allowsEditing: false,
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
            quality: 1,         // full quality — manipulator handles compression
            allowsEditing: false,
          });
        }

        if (!pickerResult || pickerResult.canceled || !pickerResult.assets[0]) return;

        const asset = pickerResult.assets[0];

        setIsIdentifying(true);
        try {
          // Resize + recompress to JPEG before encoding — keeps payload small
          // regardless of what the user picked (4K photo, PNG screenshot, etc.).
          const { base64: imageBase64, mediaType } = await prepareImage(
            asset.uri,
            asset.width ?? MAX_IMAGE_DIMENSION,
            asset.height ?? MAX_IMAGE_DIMENSION,
          );

          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;

          const response = await fetch(`${API_BASE_URL}/api/ai/identify-items`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              imageBase64,
              mediaType,
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
