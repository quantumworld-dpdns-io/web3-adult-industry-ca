"use client";

import { useState } from "react";
import { createDID } from "@/lib/api";
import { X } from "lucide-react";

interface DIDFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DIDForm({ open, onClose, onSuccess }: DIDFormProps) {
  const [method, setMethod] = useState("key");
  const [publicKey, setPublicKey] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createDID(method, publicKey, domain || undefined);
      onSuccess();
      onClose();
      setMethod("key");
      setPublicKey("");
      setDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create DID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create DID</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="key">key</option>
              <option value="web">web</option>
              <option value="ethr">ethr</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Public Key</label>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Domain (optional, for did:web)</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create DID"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
