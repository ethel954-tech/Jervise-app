import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { isOnboarded } from "../lib/storage";
import { colors as C } from "../theme";

export default function Index() {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    isOnboarded().then(setDone);
  }, []);
  if (done === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.white} />
      </View>
    );
  }
  return <Redirect href={done ? "/(tabs)" : "/onboarding"} />;
}
