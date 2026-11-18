import React, { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { colors as C } from "../theme";
import { ui } from "../lib/ui";
import { AVAILABLE_VOICES, VoiceOption, getVoiceOption } from "../lib/speech";

const VOICE_KEY = "jarvis.voice";
const CAPTIONS_KEY = "jarvis.captions";
const CLOUD_VOICE_KEY = "jarvis.cloudVoiceKey";
const DIAGRAMS_KEY = "jarvis.diagrams";
const VIDEO_EXPLAINERS_KEY = "jarvis.videoExplainers";

export default function Settings() {
  const router = useRouter();
  const [selectedVoice, setSelection] = useState<VoiceOption | null>(null);
  const [captions, setCaptions] = useState(false);
  const [cloudKeySet, setCloudKeySet] = useState(false);
  const [diagramsEnabled, setDiagramsEnabled] = useState(true);
  const [videoExplainersEnabled, setVideoExplainersEnabled] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(VOICE_KEY).then((v) => v ? getVoiceOption(v) : null),
      AsyncStorage.getItem(CAPTIONS_KEY).then((v) => v === "1"),
      AsyncStorage.getItem(CLOUD_VOICE_KEY).then((v) => !!v),
      AsyncStorage.getItem(DIAGRAMS_KEY).then((v) => v !== "0"),
      AsyncStorage.getItem(VIDEO_EXPLAINERS_KEY).then((v) => v === "1"),
    ]).then(([voice, caps, cloud, diag, video]) => {
      setSelection(voice || AVAILABLE_VOICES[0]);
      setCaptions(caps);
      setCloudKeySet(cloud);
      setDiagramsEnabled(diag);
      setVideoExplainersEnabled(video);
    });
  }, []);

  async function setVoice(voice: VoiceOption) {
    setSelection(voice);
    await AsyncStorage.setItem(VOICE_KEY, voice.id);
  }

  async function setCaptionsEnabled(enabled: boolean) {
    setCaptions(enabled);
    await AsyncStorage.setItem(CAPTIONS_KEY, enabled ? "1" : "0");
  }

  async function setCloudKey(key: string) {
    if (key) {
      await AsyncStorage.setItem(CLOUD_VOICE_KEY, key);
      setCloudKeySet(true);
    } else {
      await AsyncStorage.removeItem(CLOUD_VOICE_KEY);
      setCloudKeySet(false);
    }
  }

  async function setDiagramsEnabledValue(enabled: boolean) {
    setDiagramsEnabled(enabled);
    await AsyncStorage.setItem(DIAGRAMS_KEY, enabled ? "1" : "0");
  }

  async function setVideoExplainersValue(enabled: boolean) {
    setVideoExplainersEnabled(enabled);
    await AsyncStorage.setItem(VIDEO_EXPLAINERS_KEY, enabled ? "1" : "0");
  }

  return (
    <Screen title="Settings">
      <View style={{ gap: 16 }}>
        {/* Voice selection */}
        <View style={ui.card}>
          <Text style={[ui.label, { marginBottom: 10 }]}>SPEECH VOICE</Text>
          {AVAILABLE_VOICES.map((voice) => (
            <Pressable
              key={voice.id}
              onPress={() => setVoice(voice)}
              style={[
                { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.track },
                selectedVoice?.id === voice.id && { backgroundColor: C.track },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons
                  name={selectedVoice?.id === voice.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedVoice?.id === voice.id ? C.white : C.soft}
                />
                <Text style={{ fontSize: 15, color: C.white }}>{voice.name}</Text>
                {voice.isCloud && (
                  <View style={{ backgroundColor: C.accent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: C.white, fontWeight: "500" }}>cloud</Text>
                  </View>
                )}
              </View>
              {voice.isCloud && voice.requiresKey && (
                <Text style={{ fontSize: 12, color: cloudKeySet ? C.soft : C.error }}>
                  {cloudKeySet ? "Configured" : "Key needed"}
                </Text>
              )}
            </Pressable>
          ))}
          {selectedVoice?.isCloud && selectedVoice.requiresKey && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.track }}>
              <Text style={[ui.label, { marginBottom: 8 }]}>CLOUD VOICE API KEY</Text>
              <Pressable
                style={[ui.btn, { height: 40, paddingHorizontal: 14, gap: 8 }]}
                onPress={() => {
                  // In production, open a secure key entry flow
                  router.push({ pathname: "/talk", params: { prompt: "Set up cloud voice" } });
                }}
              >
                <Ionicons name="key-outline" size={18} color={C.bg} />
                <Text style={{ fontSize: 14, color: C.bg }}>
                  {cloudKeySet ? "Change key" : "Add API key"}
                </Text>
              </Pressable>
              <Text style={[ui.sub, { marginTop: 6 }]}>
                Cloud voices sound more natural but require an API key. The default voice is free.
              </Text>
            </View>
          )}
        </View>

        {/* Captions toggle */}
        <View style={ui.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="chatbubble-outline" size={20} color={C.soft} />
              <Text style={{ fontSize: 15, color: C.white }}>Show captions</Text>
            </View>
            <Pressable
              onPress={() => setCaptionsEnabled(!captions)}
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: captions ? C.accent : C.track,
                justifyContent: "center",
                paddingLeft: captions ? 20 : 5,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: C.white,
                  transform: [{ translateX: captions ? 15 : 0 }],
                }}
              />
            </Pressable>
          </View>
          <Text style={[ui.sub, { marginTop: 4 }]}>
            Show spoken answers as text. Off by default for voice-first experience.
          </Text>
        </View>

        {/* Diagrams toggle */}
        <View style={ui.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="grid-outline" size={20} color={C.soft} />
              <Text style={{ fontSize: 15, color: C.white }}>Diagrams</Text>
            </View>
            <Pressable
              onPress={() => setDiagramsEnabledValue(!diagramsEnabled)}
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: diagramsEnabled ? C.accent : C.track,
                justifyContent: "center",
                paddingLeft: diagramsEnabled ? 20 : 5,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: C.white,
                  transform: [{ translateX: diagramsEnabled ? 15 : 0 }],
                }}
              />
            </Pressable>
          </View>
          <Text style={[ui.sub, { marginTop: 4 }]}>
            Show diagrams when Jarvis says "show me". Helps visualize concepts.
          </Text>
        </View>

        {/* Video explainers toggle (opt-in) */}
        <View style={ui.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="videocam-outline" size={20} color={C.soft} />
              <Text style={{ fontSize: 15, color: C.white }}>Video explainers</Text>
            </View>
            <Pressable
              onPress={() => setVideoExplainersValue(!videoExplainersEnabled)}
              style={{
                width: 50,
                height: 30,
                borderRadius: 15,
                backgroundColor: videoExplainersEnabled ? C.accent : C.track,
                justifyContent: "center",
                paddingLeft: videoExplainersEnabled ? 20 : 5,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: C.white,
                  transform: [{ translateX: videoExplainersEnabled ? 15 : 0 }],
                }}
              />
            </Pressable>
          </View>
          <Text style={[ui.sub, { marginTop: 4 }]}>
            Opt-in: Generate video explainers from your notes. Requires background processing.
          </Text>
        </View>

        {/* Data management */}
        <View style={ui.card}>
          <Text style={[ui.label, { marginBottom: 10 }]}>DATA</Text>
          <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="download-outline" size={20} color={C.soft} />
              <Text style={{ fontSize: 15, color: C.white }}>Sync now</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={C.soft} />
          </Pressable>
          <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.track }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="trash-outline" size={20} color={C.error} />
              <Text style={{ fontSize: 15, color: C.error }}>Clear local cache</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={C.soft} />
          </Pressable>
        </View>

        {/* About */}
        <View style={ui.card}>
          <Text style={[ui.label, { marginBottom: 10 }]}>ABOUT</Text>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, color: C.white }}>Jarvis</Text>
            <Text style={[ui.sub, { marginTop: 2 }]}>Your voice study partner</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.track }}>
            <Text style={{ fontSize: 14, color: C.white }}>Version</Text>
            <Text style={[ui.sub, { textAlign: "right" }]}>1.0.0</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
