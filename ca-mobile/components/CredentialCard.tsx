import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Credential } from "../lib/types";
import VerificationBadge from "./VerificationBadge";

interface Props {
  credential: Credential;
  onPress: (credential: Credential) => void;
}

export default function CredentialCard({ credential, onPress }: Props) {
  const issued = new Date(credential.issuedDate).toLocaleDateString();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(credential)}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <Text style={styles.type}>{credential.type}</Text>
        <VerificationBadge status={credential.status} />
      </View>
      <Text style={styles.issuer}>Issued by: {credential.issuer}</Text>
      <Text style={styles.date}>Issued: {issued}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  type: {
    color: "#e0e0e0",
    fontSize: 16,
    fontWeight: "600",
  },
  issuer: {
    color: "#888",
    fontSize: 13,
    marginBottom: 4,
  },
  date: {
    color: "#666",
    fontSize: 12,
  },
});
