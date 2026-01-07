import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FAFAFA' },
      }}
    >
      <Stack.Screen name="company-code" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
