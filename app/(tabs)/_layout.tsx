import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors as C } from "../../theme";

const icon = (name: any) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.white,
        tabBarInactiveTintColor: C.soft,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.track },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="notes" options={{ title: "Notes", tabBarIcon: icon("documents-outline") }} />
      <Tabs.Screen name="plan" options={{ title: "Plan", tabBarIcon: icon("calendar-outline") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: icon("bar-chart-outline") }} />
    </Tabs>
  );
}
