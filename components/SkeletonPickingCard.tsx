import { useThemeColors } from "@/context/theme-context";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function SkeletonPickingCard() {
  const colors = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.cardContainer, { backgroundColor: colors.surface }]}>
      {/* Hero Image Skeleton */}
      <Animated.View
        style={[
          styles.heroImageSkeleton,
          { backgroundColor: colors.border, opacity },
        ]}
      />

      {/* Info Section */}
      <View style={styles.cardInfo}>
        {/* Code Skeleton */}
        <Animated.View
          style={[
            styles.textSkeleton,
            { width: "30%", height: 14, marginBottom: 8, backgroundColor: colors.border, opacity },
          ]}
        />
        
        {/* Name Skeleton (2 lines) */}
        <Animated.View
          style={[
            styles.textSkeleton,
            { width: "80%", height: 20, marginBottom: 6, backgroundColor: colors.border, opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeleton,
            { width: "60%", height: 20, marginBottom: 20, backgroundColor: colors.border, opacity },
          ]}
        />

        {/* Stats Row Skeleton */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Animated.View
              style={[
                styles.textSkeleton,
                { width: 40, height: 10, marginBottom: 4, backgroundColor: colors.border, opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.textSkeleton,
                { width: 30, height: 24, backgroundColor: colors.border, opacity },
              ]}
            />
          </View>
          
          {/* Divider */}
          <View style={[styles.statDivider, { borderColor: colors.border }]} />

          <View style={styles.statItem}>
             <Animated.View
              style={[
                styles.textSkeleton,
                { width: 40, height: 10, marginBottom: 4, backgroundColor: colors.border, opacity },
              ]}
            />
             <Animated.View
              style={[
                styles.circleSkeleton,
                { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border, opacity },
              ]}
            />
          </View>
        </View>

        {/* Actions Row Skeleton */}
        <View style={styles.actionsRow}>
           <Animated.View
              style={[
                styles.circleSkeleton,
                { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border, opacity },
              ]}
            />
            
            {/* Confirm Button Big */}
            <Animated.View
              style={[
                styles.circleSkeleton,
                { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, opacity: opacity },
              ]}
            />

            <Animated.View
              style={[
                styles.circleSkeleton,
                { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border, opacity },
              ]}
            />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    margin: 2, // Margen para la sombra
  },
  heroImageSkeleton: {
    height: "45%",
    width: "100%",
  },
  cardInfo: {
    padding: 20,
    flex: 1,
    alignItems: "center",
  },
  textSkeleton: {
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    width: "100%",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  statDivider: {
    height: 40,
    width: 1,
    borderLeftWidth: 1,
  },
  circleSkeleton: {
    // defined inline
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: "auto",
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
});
