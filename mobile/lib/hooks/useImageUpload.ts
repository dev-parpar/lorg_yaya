import { useState } from "react";
import { Alert, ActionSheetIOS, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { supabase } from "@/lib/auth/supabase";
import { useAuthStore } from "@/lib/store/auth-store";

export type StorageBucket = "avatars" | "locations" | "cabinets" | "shelves" | "items";

interface UseImageUploadOptions {
  /** Storage bucket name */
  bucket: StorageBucket;
  /** Storage path relative to the bucket root, e.g. "locations/{userId}/{locationId}" */
  buildPath: () => string;
  /** Called with the storage path and signed URL after a successful upload */
  onUpload: (imagePath: string, signedUrl: string) => Promise<void>;
  /** Called when user chooses to remove the current photo */
  onRemove?: () => Promise<void>;
}

/**
 * Shared hook for picking, uploading, and removing photos across all entity screens.
 *
 * Upload flow:
 *   1. Show action sheet — "Take Photo" / "Choose from Library" / "Remove Photo"
 *   2. Request permission (camera or media library)
 *   3. Launch ImagePicker, compress to JPEG @ 80% quality, max 1200px
 *   4. Upload blob directly to Supabase Storage using the user's auth session
 *   5. Call onUpload(path) — the caller's API PATCH stores the path and
 *      generates a stable 10-year signed URL server-side
 *
 * Callers never handle signing or caching — that's entirely server-side.
 */
export function useImageUpload({
  bucket,
  buildPath,
  onUpload,
  onRemove,
}: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuthStore();

  async function requestAndPick(source: "camera" | "library"): Promise<ImagePicker.ImagePickerResult | null> {
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow camera access in your device settings.");
        return null;
      }
      try {
        return await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.8,
          allowsEditing: true,
          aspect: [1, 1],
        });
      } catch {
        // iOS/Android simulators have no physical camera — launchCameraAsync throws
        Alert.alert(
          "Camera unavailable",
          "The camera is not available on this device. Please choose a photo from your library instead.",
        );
        return null;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access in your device settings.");
        return null;
      }
      return ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
    }
  }

  async function uploadImage(uri: string) {
    if (!user) return;
    setIsUploading(true);

    try {
      // expo-file-system/next File.bytes() reads the local file:// URI natively
      // and returns a Uint8Array. Supabase Storage accepts ArrayBufferView
      // (which Uint8Array implements), so no base64 encoding step is needed.
      const file = new ExpoFile(uri);
      const arrayBuffer = await file.arrayBuffer();

      // Timestamp suffix ensures a new path on each update, which naturally
      // busts expo-image's disk cache (different URL = cache miss).
      const path = `${buildPath()}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Generate a 10-year signed URL so the caller can store it alongside
      // the path (local-first ops need both values client-side).
      const TEN_YEARS_SECS = 60 * 60 * 24 * 365 * 10;
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, TEN_YEARS_SECS);
      if (signError || !signedData?.signedUrl) {
        throw new Error(signError?.message ?? "Failed to generate signed URL");
      }

      await onUpload(path, signedData.signedUrl);
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message ?? "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  function showActionSheet() {
    const options = ["Take Photo", "Choose from Library", ...(onRemove ? ["Remove Photo"] : []), "Cancel"];
    const cancelIndex = options.length - 1;
    const destructiveIndex = onRemove ? options.length - 2 : undefined;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        async (index) => {
          if (index === 0) {
            const result = await requestAndPick("camera");
            if (result && !result.canceled) await uploadImage(result.assets[0].uri);
          } else if (index === 1) {
            const result = await requestAndPick("library");
            if (result && !result.canceled) await uploadImage(result.assets[0].uri);
          } else if (onRemove && index === 2) {
            await onRemove();
          }
        },
      );
    } else {
      // Android: use Alert as fallback (no native action sheet in React Native core)
      Alert.alert("Change Photo", "", [
        {
          text: "Take Photo",
          onPress: async () => {
            const result = await requestAndPick("camera");
            if (result && !result.canceled) await uploadImage(result.assets[0].uri);
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            const result = await requestAndPick("library");
            if (result && !result.canceled) await uploadImage(result.assets[0].uri);
          },
        },
        ...(onRemove
          ? [{ text: "Remove Photo", style: "destructive" as const, onPress: onRemove }]
          : []),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  }

  return { showActionSheet, isUploading };
}
