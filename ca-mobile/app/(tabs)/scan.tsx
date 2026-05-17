import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { verifyCredential } from "../../lib/api";
import { VerificationResult } from "../../lib/types";
import VerificationBadge from "../../components/VerificationBadge";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<VerificationResult | null>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>
          Camera permission is required to scan QR codes.
        </Text>
        <Text style={styles.link} onPress={requestPermission}>
          Grant Permission
        </Text>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      const credentialId = data;
      const res = await verifyCredential(credentialId);
      setResult(res);
    } catch {
      setResult({ credentialId: data, valid: false, message: "Verification failed" });
    }
  };

  return (
    <View style={styles.container} accessibilityLabel="scanner-view">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={result ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
      </View>
      {result && (
        <View style={styles.result}>
          <VerificationBadge status={result.valid ? "valid" : "invalid"} />
          <Text style={styles.resultText}>{result.message}</Text>
          <Text
            style={styles.link}
            onPress={() => setResult(null)}
          >
            Scan Again
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  hint: { color: "#e0e0e0", textAlign: "center", marginTop: 40, fontSize: 16, paddingHorizontal: 24 },
  link: { color: "#7c3aed", textAlign: "center", marginTop: 12, fontSize: 16, fontWeight: "600" },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#7c3aed",
    borderRadius: 16,
  },
  result: {
    backgroundColor: "#1a1a2e",
    padding: 24,
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  resultText: { color: "#e0e0e0", fontSize: 16, marginTop: 12 },
});
