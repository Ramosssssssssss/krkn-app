import { AnimatedSplash } from "@/components/AnimatedSplash";
import { useAuth } from "@/context/auth-context";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const { isAuthenticated, companyCode, isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const hasNavigated = useRef(false);

  const navigate = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (isAuthenticated) {
      router.replace("/(main)");
    } else if (companyCode) {
      router.replace("/(auth)/login");
    } else {
      router.replace("/(auth)/company-code");
    }
  }, [isAuthenticated, companyCode]);

  // When both splash is done and auth is loaded, navigate
  useEffect(() => {
    if (splashDone && !isLoading) {
      navigate();
    }
  }, [splashDone, isLoading, navigate]);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <AnimatedSplash onFinish={handleSplashFinish} />
    </View>
  );
}
