import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Profile } from "../../lib/types";
import { getProfile } from "../../lib/api";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {});
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="profile-view"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {profile?.did?.slice(0, 2).toUpperCase() ?? "CA"}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>DID</Text>
        <Text style={styles.value} selectable>
          {profile?.did ?? "—"}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Public Key</Text>
        <Text style={styles.valueSmall} selectable numberOfLines={2}>
          {profile?.publicKey ?? "—"}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Reputation Score</Text>
        <Text style={styles.score}>{profile?.reputationScore ?? 0}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Joined</Text>
        <Text style={styles.value}>
          {profile?.createdAt
            ? new Date(profile.createdAt).toLocaleDateString()
            : "—"}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { padding: 24, alignItems: "center" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  field: { width: "100%", marginBottom: 20 },
  label: { color: "#666", fontSize: 12, fontWeight: "600", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  value: { color: "#e0e0e0", fontSize: 14 },
  valueSmall: { color: "#e0e0e0", fontSize: 12, fontFamily: "monospace" },
  score: { color: "#7c3aed", fontSize: 24, fontWeight: "700" },
});
