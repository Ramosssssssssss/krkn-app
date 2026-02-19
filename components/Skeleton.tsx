/**
 * ━━━ Premium Skeleton Loader System ━━━
 *
 * Apple-style shimmer skeletons with Reanimated.
 * Primitives: Bone, Circle, Pill
 * Presets:  CardList, DetailForm, FormWithSearch
 */

import { useTheme, useThemeColors } from "@/context/theme-context";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
    Dimensions,
    Platform,
    StyleSheet,
    View,
    type ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { width: SW } = Dimensions.get("window");

// ━━━ Shimmer Wrapper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useShimmer() {
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return shimmer;
}

// ━━━ Base Bone ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BoneProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

export function Bone({ width, height, radius = 6, style }: BoneProps) {
  const { isDark } = useTheme();
  const shimmer = useShimmer();

  const baseColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const highlightColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.5, 1, 0.5]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        animStyle,
        style,
      ]}
    >
      <ShimmerOverlay highlightColor={highlightColor} shimmer={shimmer} />
    </Animated.View>
  );
}

// ━━━ Circle ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function Circle({ size, style }: { size: number; style?: ViewStyle }) {
  return <Bone width={size} height={size} radius={size / 2} style={style} />;
}

// ━━━ Shimmer overlay (sweeping highlight) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ShimmerOverlay({
  highlightColor,
  shimmer,
}: {
  highlightColor: string;
  shimmer: { value: number };
}) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-SW, SW]) }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      <LinearGradient
        colors={["transparent", highlightColor, "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ━━━ PRESET: Card Skeleton ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mimics a typical list card: small badge + title + description + pill row

function SkeletonCard() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        presets.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Badge row */}
      <View style={presets.row}>
        <Bone width={72} height={20} radius={10} />
        <View style={{ flex: 1 }} />
        <Bone width={50} height={16} radius={8} />
      </View>
      {/* Title */}
      <Bone width="70%" height={16} radius={4} style={{ marginTop: 14 }} />
      {/* Description */}
      <Bone width="45%" height={12} radius={4} style={{ marginTop: 10 }} />
      {/* Pills row */}
      <View style={[presets.row, { marginTop: 16 }]}>
        <Bone width={80} height={24} radius={12} />
        <Bone width={68} height={24} radius={12} />
        <Bone width={56} height={24} radius={12} />
      </View>
    </View>
  );
}

export function SkeletonCardList({ count = 4 }: { count?: number }) {
  const colors = useThemeColors();
  return (
    <View
      style={[presets.listContainer, { backgroundColor: colors.background }]}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// ━━━ PRESET: Detail Screen with list ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Header (badge + title), scan bar placeholder, article card list

function SkeletonArticleRow() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        presets.articleRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={presets.row}>
        <Circle size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Bone width="65%" height={14} radius={4} />
          <Bone width="40%" height={11} radius={4} style={{ marginTop: 8 }} />
        </View>
        <Bone width={36} height={32} radius={8} />
      </View>
    </View>
  );
}

export function SkeletonDetailWithList() {
  const colors = useThemeColors();
  return (
    <View style={[presets.fullscreen, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[presets.headerBar, { borderBottomColor: colors.border }]}>
        <Bone width={32} height={32} radius={10} />
        <View style={{ alignItems: "center", flex: 1 }}>
          <Bone width={60} height={18} radius={9} />
          <Bone width={100} height={14} radius={4} style={{ marginTop: 6 }} />
        </View>
        <Bone width={32} height={32} radius={10} />
      </View>

      {/* Scan feedback bar */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <Bone width="100%" height={48} radius={12} />
      </View>

      {/* Article rows */}
      <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonArticleRow key={i} />
        ))}
      </View>
    </View>
  );
}

// ━━━ PRESET: Form with search ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Search bar + location chip + article cards + bottom button

export function SkeletonFormWithSearch() {
  const colors = useThemeColors();
  return (
    <View style={[presets.fullscreen, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <Bone width="100%" height={44} radius={12} />
      </View>

      {/* Location chip group */}
      <View style={[presets.row, { padding: 16 }]}>
        <Bone width={100} height={32} radius={16} />
        <Bone width={90} height={32} radius={16} />
        <Bone width={80} height={32} radius={16} />
      </View>

      {/* Article rows */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonArticleRow key={i} />
        ))}
      </View>

      {/* Bottom button */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Bone width="100%" height={50} radius={14} />
      </View>
    </View>
  );
}

// ━━━ PRESET: Detail Form (modal) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hero section + grouped field rows

function SkeletonFieldRow() {
  return (
    <View style={presets.fieldRow}>
      <Bone width={90} height={11} radius={4} />
      <Bone width="60%" height={14} radius={4} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonDetailForm() {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Hero */}
      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <Circle size={56} />
        <Bone width={180} height={18} radius={4} style={{ marginTop: 14 }} />
        <Bone width={100} height={14} radius={8} style={{ marginTop: 10 }} />
        <View style={[presets.row, { marginTop: 12 }]}>
          <Bone width={60} height={22} radius={11} />
          <Bone width={72} height={22} radius={11} />
        </View>
      </View>

      {/* Section 1 */}
      <View
        style={[
          presets.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Bone width={120} height={12} radius={4} style={{ marginBottom: 12 }} />
        <SkeletonFieldRow />
        <SkeletonFieldRow />
        <SkeletonFieldRow />
      </View>

      {/* Section 2 */}
      <View
        style={[
          presets.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Bone width={100} height={12} radius={4} style={{ marginBottom: 12 }} />
        <SkeletonFieldRow />
        <SkeletonFieldRow />
      </View>
    </View>
  );
}

// ━━━ PRESET: Inventory Card List ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Specific to inventarios/asignados — shorter cards with status + progress

function SkeletonInventoryCard() {
  const colors = useThemeColors();
  return (
    <View
      style={[
        presets.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Status row */}
      <View style={presets.row}>
        <Bone width={80} height={22} radius={11} />
        <View style={{ flex: 1 }} />
        <Bone width={60} height={22} radius={11} />
      </View>
      {/* Title */}
      <Bone width="60%" height={16} radius={4} style={{ marginTop: 12 }} />
      {/* Progress bar */}
      <Bone width="100%" height={6} radius={3} style={{ marginTop: 14 }} />
      {/* Bottom row */}
      <View style={[presets.row, { marginTop: 12 }]}>
        <Bone width={100} height={12} radius={4} />
        <View style={{ flex: 1 }} />
        <Bone width={80} height={28} radius={8} />
      </View>
    </View>
  );
}

export function SkeletonInventoryList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonInventoryCard key={i} />
      ))}
    </View>
  );
}

// ━━━ PRESET: Article Catalog Card List ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Compact row: image 48×48 + name/sku + action icon

function SkeletonArticleCatalogCard() {
  const colors = useThemeColors();
  return (
    <View style={[presets.catalogCard, { backgroundColor: colors.surface }]}>
      {/* Image */}
      <Bone width={48} height={48} radius={10} />
      {/* Name + SKU */}
      <View style={{ flex: 1, gap: 6 }}>
        <Bone width="72%" height={14} radius={4} />
        <Bone width="38%" height={11} radius={4} />
      </View>
      {/* Print icon area */}
      <Bone width={30} height={30} radius={8} />
    </View>
  );
}

export function SkeletonArticleCatalogList({ count = 8 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonArticleCatalogCard key={i} />
      ))}
    </View>
  );
}

// ━━━ PRESET: OCT Card List (Dashboard) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Two-column layout: Info (folio, name, meta) + QR side

function SkeletonOCTCard() {
  const colors = useThemeColors();
  return (
    <View style={[presets.octCard, { backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: 'row', gap: 20 }}>
        {/* Info Side */}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Bone width={90} height={24} radius={8} />
          <Bone width="90%" height={22} radius={4} style={{ marginTop: 16 }} />
          <View style={{ marginTop: 18, gap: 10 }}>
            <Bone width={120} height={14} radius={4} />
            <Bone width={100} height={14} radius={4} />
          </View>
        </View>
        {/* QR Side */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Bone width={100} height={100} radius={18} />
          <Bone width={60} height={10} radius={4} style={{ marginTop: 10 }} />
        </View>
      </View>
      {/* Footer footer */}
      <View style={{ marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
        <Bone width={150} height={12} radius={4} />
      </View>
    </View>
  );
}

export function SkeletonOCTList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOCTCard key={i} />
      ))}
    </View>
  );
}

// ━━━ PRESET: OCT Detail List ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// List rows with clave, qty and multiline description

function SkeletonOCTDetailCard() {
  const colors = useThemeColors();
  return (
    <View style={[presets.octDetailCard, { backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Bone width={100} height={16} radius={4} />
        <Bone width={60} height={20} radius={4} />
      </View>
      <Bone width="100%" height={14} radius={4} />
      <Bone width="70%" height={14} radius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonOCTDetailList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonOCTDetailCard key={i} />
      ))}
    </View>
  );
}

// ━━━ Styles ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const presets = StyleSheet.create({
  fullscreen: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 4,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  articleRow: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    borderBottomWidth: 1,
  },
  fieldRow: {
    paddingVertical: 10,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  catalogCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  octCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  octDetailCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
});
