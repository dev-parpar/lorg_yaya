import React from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Camera, type LucideIcon } from "lucide-react-native";

type Shape = "circle" | "rounded";
type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, number> = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
};

interface EntityPhotoProps {
  /** Signed URL returned by the API; null means no photo set */
  signedUrl: string | null | undefined;
  /** Called when the user taps to change the photo */
  onPress: () => void;
  /** Shows spinner overlay during upload */
  isUploading?: boolean;
  size?: Size;
  shape?: Shape;
  /** Lucide icon component rendered as placeholder */
  FallbackIcon: LucideIcon;
  /** Whether the tap target is enabled (pass false for read-only members) */
  editable?: boolean;
}

/**
 * Reusable tappable photo component used across profile, location, cabinet,
 * shelf, and item screens.
 *
 * Uses expo-image with disk caching. The stable 10-year signed URL means
 * the cached image is valid across app restarts without re-fetching.
 */
export function EntityPhoto({
  signedUrl,
  onPress,
  isUploading = false,
  size = "md",
  shape = "rounded",
  FallbackIcon,
  editable = true,
}: EntityPhotoProps) {
  const dim = SIZES[size];
  const borderRadius = shape === "circle" ? dim / 2 : 12;

  const container = {
    width: dim,
    height: dim,
    borderRadius,
    overflow: "hidden" as const,
  };

  return (
    <TouchableOpacity
      onPress={editable ? onPress : undefined}
      activeOpacity={editable ? 0.75 : 1}
      style={[styles.wrapper, { width: dim, height: dim }]}
    >
      <View style={[styles.inner, container, styles.background]}>
        {signedUrl ? (
          <Image
            source={{ uri: signedUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            // Disk cache is keyed on the URL — stable 10-yr signed URLs
            // survive app restarts and never re-download until the photo changes.
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.fallback}>
            <FallbackIcon size={dim * 0.38} color="#94a3b8" />
          </View>
        )}

        {isUploading && (
          <View style={[StyleSheet.absoluteFillObject, styles.overlay]}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>

      {editable && !isUploading && (
        <View style={[styles.cameraBadge, { borderRadius: 99 }]}>
          <Camera size={10} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
  background: {
    backgroundColor: "#f1f5f9",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0F172A",
    padding: 4,
  },
});
