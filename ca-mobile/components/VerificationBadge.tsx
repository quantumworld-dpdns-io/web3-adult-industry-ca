import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CredentialStatus } from "../lib/types";

interface Props {
  status: CredentialStatus;
}

const colors: Record<CredentialStatus, string> = {
  valid: "#22c55e",
  invalid: "#ef4444",
  pending: "#eab308",
};

const labels: Record<CredentialStatus, string> = {
  valid: "VALID",
  invalid: "INVALID",
  pending: "PENDING",
};

export default function VerificationBadge({ status }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[status] }]}>
      <Text style={styles.text}>{labels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
