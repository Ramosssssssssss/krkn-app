/**
 * Layout para las pantallas de XML
 */

import { Stack } from 'expo-router'

export default function XMLLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="selector" />
      <Stack.Screen name="procesar" />
    </Stack>
  )
}
