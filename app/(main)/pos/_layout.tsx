import { Stack } from "expo-router";

export default function POSLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="nueva-venta"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="mis-clientes"
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="cobrar"
        options={{
          animation: "slide_from_bottom",
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
    </Stack>
  );
}
