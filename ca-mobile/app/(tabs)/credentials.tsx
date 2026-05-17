import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Credential } from "../../lib/types";
import { getCredentials } from "../../lib/api";
import CredentialCard from "../../components/CredentialCard";

export default function CredentialsScreen() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Credential | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getCredentials();
      setCredentials(data);
    } catch {
      // offline fallback
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={styles.container} accessibilityLabel="credentials-list" accessibilityRole="list">
      <FlatList
        data={credentials}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CredentialCard credential={item} onPress={setSelected} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No credentials yet</Text>
        }
      />

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal} accessibilityLabel="credential-detail">
            {selected && (
              <>
                <Text style={styles.modalTitle}>{selected.type}</Text>
                <Text style={styles.modalText}>ID: {selected.id}</Text>
                <Text style={styles.modalText}>Issuer: {selected.issuer}</Text>
                <Text style={styles.modalText}>Holder: {selected.holder}</Text>
                <Text style={styles.modalText}>
                  Status: {selected.status}
                </Text>
                <Text style={styles.modalText}>
                  Issued: {new Date(selected.issuedDate).toLocaleString()}
                </Text>
                {selected.expirationDate && (
                  <Text style={styles.modalText}>
                    Expires: {new Date(selected.expirationDate).toLocaleString()}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelected(null)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  empty: { color: "#666", textAlign: "center", marginTop: 40, fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  modalTitle: {
    color: "#e0e0e0",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalText: { color: "#aaa", fontSize: 14, marginBottom: 8 },
  closeBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  closeBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
