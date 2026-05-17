"use client";

import { useState } from "react";
import { issueCredential } from "@/lib/api";
import { X } from "lucide-react";

interface CredentialFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CredentialForm({ open, onClose, onSuccess }: CredentialFormProps) {
  const [issuerDid, setIssuerDid] = useState("");
  const [subjectDid, setSubjectDid] = useState("");
  const [credentialType, setCredentialType] = useState("identity");
  const [claims, setClaims] = useState("{}");
  const [expirationDays, setExpirationDays] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let parsedClaims: Record<string, unknown>;
      try {
        parsedClaims = JSON.parse(claims);
      } catch {
        throw new Error("Invalid JSON in claims field");
      }
      await issueCredential(
        issuerDid,
        subjectDid,
        credentialType,
        parsedClaims,
        expirationDays ? parseInt(expirationDays) : undefined
      );
      onSuccess();
      onClose();
      setIssuerDid("");
      setSubjectDid("");
      setCredentialType("identity");
      setClaims("{}");
      setExpirationDays("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue credential");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Issue Credential</h2>
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
            <label className="block text-sm font-medium mb-1">Issuer DID</label>
            <input
              value={issuerDid}
              onChange={(e) => setIssuerDid(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject DID</label>
            <input
              value={subjectDid}
              onChange={(e) => setSubjectDid(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Credential Type</label>
            <select
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="identity">Identity</option>
              <option value="age_verification">Age Verification</option>
              <option value="content_license">Content License</option>
              <option value="platform_membership">Platform Membership</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Claims (JSON)</label>
            <textarea
              value={claims}
              onChange={(e) => setClaims(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expiration Days (optional)</label>
            <input
              type="number"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
              className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
              min="1"
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
              {loading ? "Issuing..." : "Issue Credential"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
