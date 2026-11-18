import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import { colors as C } from "../../theme";
import { ui } from "../../lib/ui";
import { Doc, ingestText, listDocs } from "../../lib/api";

const input = { backgroundColor: C.card, color: C.white, borderRadius: 12, padding: 12, fontSize: 15 } as const;

export default function Notes() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    listDocs()
      .then((d) => {
        setDocs(d);
        setError("");
      })
      .catch(() => setError("Can't load your notes. Check your Supabase setup in the README."));
  }, []);
  useFocusEffect(refresh);

  async function save(t: string, text: string) {
    if (!t.trim() || !text.trim()) return Alert.alert("Add a title and some text first");
    setBusy(true);
    try {
      await ingestText(t.trim(), text);
      setTitle("");
      setBody("");
      setAdding(false);
      refresh();
    } catch (e) {
      Alert.alert("Couldn't add this note", "Check your connection and that the ingest function is deployed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/plain", "text/markdown"], copyToCacheDirectory: true });
    if (res.canceled) return;
    const file = res.assets[0];
    const text = await FileSystem.readAsStringAsync(file.uri);
    await save(file.name.replace(/\.[^.]+$/, ""), text);
  }

  return (
    <Screen title="Your notes">
      {error ? <Text style={{ color: C.error, fontSize: 14 }}>{error}</Text> : null}

      {adding ? (
        <View style={[ui.card, { gap: 10 }]}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title (for example: Databases, chapter 3)" placeholderTextColor={C.soft} style={input} />
          <TextInput value={body} onChangeText={setBody} placeholder="Paste your notes here" placeholderTextColor={C.soft} multiline style={[input, { minHeight: 160, textAlignVertical: "top" }]} />
          <Pressable style={ui.btn} onPress={() => save(title, body)} disabled={busy}>
            {busy ? <ActivityIndicator color={C.bg} /> : <Text style={ui.btnText}>Add note</Text>}
          </Pressable>
          <Pressable style={ui.ghost} onPress={pickFile}>
            <Text style={ui.ghostText}>Or pick a .txt or .md file</Text>
          </Pressable>
          <Pressable style={ui.ghost} onPress={() => setAdding(false)}>
            <Text style={ui.ghostText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={ui.btn} onPress={() => setAdding(true)}>
          <Text style={ui.btnText}>Add notes</Text>
        </Pressable>
      )}

      {docs === null && !error && <ActivityIndicator color={C.white} />}
      {docs?.length === 0 && (
        <View style={ui.card}>
          <Text style={ui.title}>No notes yet</Text>
          <Text style={ui.sub}>Paste your first note above. Jarvis answers from what you add here.</Text>
        </View>
      )}
      {docs?.map((d) => (
        <View key={d.id} style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="document-text-outline" size={20} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ui.title}>{d.title}</Text>
            <Text style={ui.sub}>{d.status === "ready" ? `Ready · ${d.chunk_count} sections` : "Reading your notes…"}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}
