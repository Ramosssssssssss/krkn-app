import { useThemeColors } from "@/context/theme-context";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useRef } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeInUp,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming,
} from "react-native-reanimated";

SplashScreen.preventAutoHideAsync().catch(() => {});

const LETTERS = ["K", "R", "K", "N"] as const;

interface AnimatedSplashProps {
  onFinish: () => void;
}

// ── Animated letter sub-component (hooks-safe) ──────────────────
function SplashLetter({ char, index }: { char: string; index: number }) {
  return (
    <Animated.Text
      entering={FadeInUp.delay(950 + index * 85)
        .duration(300)
        .damping(14)
        .springify()}
      style={styles.letter}
    >
      {char}
    </Animated.Text>
  );
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const colors = useThemeColors();
  const exitTimer = useRef<number | null>(null);

  // ── Rings ──
  const ring1Scale = useSharedValue(0);
  const ring2Scale = useSharedValue(0);
  const ring3Scale = useSharedValue(0);

  // ── Logo ──
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);

  // ── Shine glint ──
  const shineX = useSharedValue(-60);

  // ── Subtitle + bottom ──
  const subOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);

  // ── Exit ──
  const contentScale = useSharedValue(1);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    // ── RINGS EXPAND (staggered, overshoot → settle) ──
    ring1Scale.value = withDelay(
      80,
      withSequence(
        withTiming(1.12, { duration: 600, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 250, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    ring2Scale.value = withDelay(
      160,
      withSequence(
        withTiming(1.08, { duration: 550, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 250, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    ring3Scale.value = withDelay(
      240,
      withSequence(
        withTiming(1.05, { duration: 500, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    // ── LOGO ──
    logoOpacity.value = withDelay(
      280,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    logoScale.value = withDelay(
      280,
      withSequence(
        withTiming(1.08, {
          duration: 480,
          easing: Easing.out(Easing.back(1.5)),
        }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    // ── SHINE SWEEP ──
    shineX.value = withDelay(
      720,
      withTiming(200, { duration: 420, easing: Easing.inOut(Easing.quad) }),
    );

    // ── SUBTITLE ──
    subOpacity.value = withDelay(1400, withTiming(0.45, { duration: 350 }));

    // ── BOTTOM ──
    bottomOpacity.value = withDelay(1550, withTiming(0.2, { duration: 350 }));

    // ── EXIT (iris close + recede) ──
    exitTimer.current = setTimeout(() => {
      // Inner ring closes first → outer last
      ring3Scale.value = withTiming(0, {
        duration: 350,
        easing: Easing.in(Easing.cubic),
      });
      ring2Scale.value = withDelay(
        40,
        withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) }),
      );
      ring1Scale.value = withDelay(
        80,
        withTiming(0, { duration: 350, easing: Easing.in(Easing.cubic) }),
      );

      // Content pulls back + fades
      contentScale.value = withTiming(0.88, {
        duration: 480,
        easing: Easing.in(Easing.cubic),
      });
      contentOpacity.value = withTiming(
        0,
        { duration: 480, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        },
      );
    }, 2200) as unknown as number;

    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Animated Styles ──────────────────────────────────

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Scale.value * 0.12,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Scale.value * 0.2,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Scale.value * 0.35,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }, { rotate: "20deg" }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    opacity: bottomOpacity.value,
  }));

  const accentBorder = useMemo(
    () => ({ borderColor: colors.accent }),
    [colors.accent],
  );

  return (
    <View style={styles.container}>
      {/* Ambient glow — ultra-subtle depth */}
      <View style={[styles.ambientGlow, { backgroundColor: colors.accent }]} />

      <Animated.View style={[styles.center, contentStyle]}>
        {/* Concentric rings */}
        <Animated.View
          style={[styles.ring, styles.ring1, accentBorder, ring1Style]}
        />
        <Animated.View
          style={[styles.ring, styles.ring2, accentBorder, ring2Style]}
        />
        <Animated.View
          style={[styles.ring, styles.ring3, accentBorder, ring3Style]}
        />

        {/* Logo with glow shadow + shine */}
        <Animated.View
          style={[
            styles.logoWrapper,
            { shadowColor: colors.accent },
            logoStyle,
          ]}
        >
          <View style={styles.logoClip}>
            <Image
              source={require("@/assets/images/ggplay.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {/* Shine glint */}
            <Animated.View style={[styles.shine, shineStyle]} />
          </View>
        </Animated.View>

        {/* Staggered letters */}
        <View style={styles.lettersRow}>
          {LETTERS.map((char, i) => (
            <SplashLetter key={`${char}${i}`} char={char} index={i} />
          ))}
        </View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subStyle]}>
          WAREHOUSE · MANAGEMENT
        </Animated.Text>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.View style={[styles.bottom, bottomStyle]}>
        <View style={[styles.bottomLine, { backgroundColor: colors.accent }]} />
        <Animated.Text style={styles.bottomText}>
          BLACK SHEEP LABS
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 99999,
    justifyContent: "center",
    alignItems: "center",
  },
  ambientGlow: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    opacity: 0.035,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Rings ──
  ring: {
    position: "absolute",
    borderWidth: 1,
  },
  ring1: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  ring2: {
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  ring3: {
    width: 175,
    height: 175,
    borderRadius: 87.5,
    borderWidth: 1.5,
  },
  // ── Logo ──
  logoWrapper: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  logoClip: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  shine: {
    position: "absolute",
    top: -40,
    left: 0,
    width: 22,
    height: 200,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 8,
  },
  // ── Text ──
  lettersRow: {
    flexDirection: "row",
    marginTop: 28,
    gap: 5,
  },
  letter: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  subtitle: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 4,
    marginTop: 10,
    textTransform: "uppercase",
  },
  // ── Bottom ──
  bottom: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 50 : 32,
    alignItems: "center",
    gap: 8,
  },
  bottomLine: {
    width: 20,
    height: 1,
    opacity: 0.25,
    borderRadius: 1,
  },
  bottomText: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 4,
  },
});
