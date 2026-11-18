import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Orb from "./Orb";
import { colors as C } from "../theme";

// Shared tab layout: title on the left, a small orb on the right that opens the voice screen.
export default function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "500", color: C.white }}>{title}</Text>
        <Orb state="idle" size={48} onPress={() => router.push("/talk")} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>{children}</ScrollView>
    </SafeAreaView>
  );
}
