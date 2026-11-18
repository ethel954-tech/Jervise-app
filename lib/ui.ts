import { StyleSheet } from "react-native";
import { colors as C } from "../theme";

export const ui = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, letterSpacing: 1, color: C.soft },
  title: { fontSize: 15, fontWeight: "500", color: C.white },
  sub: { fontSize: 13, color: C.soft },
  h: { fontSize: 24, fontWeight: "500", color: C.white },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 0.5, borderColor: C.border },
  pillOn: { backgroundColor: C.white, borderColor: C.white },
  pillText: { fontSize: 14, color: C.light },
  pillTextOn: { color: C.bg },
  btn: { backgroundColor: C.white, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "500", color: C.bg },
  ghost: { height: 36, alignItems: "center", justifyContent: "center" },
  ghostText: { fontSize: 14, color: C.soft },
});
