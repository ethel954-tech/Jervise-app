import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors as C } from "../theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="talk" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}
